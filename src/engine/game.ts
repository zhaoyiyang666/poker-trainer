// 德州扑克对局状态机（核心）
// 完整流程：发牌 → 大小盲 → 翻前 → 翻牌 → 转牌 → 河牌 → 摊牌 → 结算。
// 纯函数式：applyAction(state, action) => newState，便于测试与 UI 状态驱动。

import type { Card } from './cards';
import { createFullDeck, shuffle } from './cards';
import {
  evaluateHand,
  compareHands,
  type HandResult,
} from './handEvaluator';
import { decideAiAction, type AiDifficulty, type Street, type ActionType } from './ai';

export type { Street, ActionType } from './ai';

export interface Player {
  id: number;
  name: string;
  isHero: boolean;
  difficulty?: AiDifficulty; // 仅 AI
  stack: number; // 剩余筹码
  hole: Card[]; // 手牌
  committedThisStreet: number; // 本轮已投入
  committedTotal: number; // 本手总投入（算边池用）
  folded: boolean;
  allIn: boolean;
  hasActedThisStreet: boolean;
  lastAction?: ActionType;
  lastAmount?: number;
}

export type GamePhase = 'betting' | 'showdown' | 'handComplete';

export interface HandLogEntry {
  street: Street;
  playerId: number;
  playerName: string;
  action: ActionType;
  amount: number;
  potAfter: number;
}

export interface PotShare {
  playerId: number;
  amount: number;
}

export interface ShowdownEntry {
  playerId: number;
  name: string;
  hole: Card[];
  hand?: HandResult; // 弃牌者无
  won: number;
}

export interface GameState {
  players: Player[];
  buttonIndex: number; // 庄家按钮
  smallBlind: number;
  bigBlind: number;
  deck: Card[];
  board: Card[];
  street: Street;
  pot: number;
  currentBet: number; // 本轮最高投入额
  minRaise: number; // 最小加注增量
  toActIndex: number; // 当前行动者下标，-1 表示本轮无人可行动
  phase: GamePhase;
  lastAggressorIndex: number; // 最后加注者，用于判定回合结束
  log: HandLogEntry[];
  showdown?: ShowdownEntry[];
  potShares?: PotShare[];
  handNumber: number;
}

export interface NewHandConfig {
  seats: number; // 6 或 9
  heroSeat?: number; // 默认 0
  aiDifficulties: AiDifficulty[]; // 各 AI 难度（循环使用）
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  buttonIndex?: number;
  handNumber?: number;
  /** 复用上一手的筹码，实现连续牌局；不传则全部重置为 startingStack */
  carryStacks?: number[];
  rand?: () => number;
}

const HERO_NAME = '你';

/** 开新的一手牌。 */
export function startHand(cfg: NewHandConfig): GameState {
  const rand = cfg.rand ?? Math.random;
  const heroSeat = cfg.heroSeat ?? 0;
  const players: Player[] = [];

  let aiIdx = 0;
  for (let i = 0; i < cfg.seats; i++) {
    const isHero = i === heroSeat;
    const carry = cfg.carryStacks?.[i];
    let stack = carry ?? cfg.startingStack;
    // 筹码耗尽自动重置（练习道具，无购买渠道）
    if (stack <= 0) stack = cfg.startingStack;
    players.push({
      id: i,
      name: isHero ? HERO_NAME : `AI ${i}`,
      isHero,
      difficulty: isHero
        ? undefined
        : cfg.aiDifficulties[aiIdx++ % cfg.aiDifficulties.length],
      stack,
      hole: [],
      committedThisStreet: 0,
      committedTotal: 0,
      folded: false,
      allIn: false,
      hasActedThisStreet: false,
    });
  }

  const deck = shuffle(createFullDeck(), rand);

  // 发两张底牌（一次一张，轮流；此处结果等价，直接连发）
  for (const pl of players) {
    pl.hole = [deck.pop()!, deck.pop()!];
  }

  const button = cfg.buttonIndex ?? 0;

  const state: GameState = {
    players,
    buttonIndex: button,
    smallBlind: cfg.smallBlind,
    bigBlind: cfg.bigBlind,
    deck,
    board: [],
    street: 'preflop',
    pot: 0,
    currentBet: 0,
    minRaise: cfg.bigBlind,
    toActIndex: -1,
    phase: 'betting',
    lastAggressorIndex: -1,
    log: [],
    handNumber: cfg.handNumber ?? 1,
  };

  postBlinds(state);
  return state;
}

function activeIndices(state: GameState): number[] {
  return state.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !p.folded)
    .map(({ i }) => i);
}

function postBlinds(state: GameState): void {
  const n = state.players.length;
  const isHeadsUp = activeIndices(state).length === 2;
  // 标准：SB 在按钮左手，BB 再左手；单挑时按钮为 SB
  const sbIndex = isHeadsUp
    ? state.buttonIndex
    : (state.buttonIndex + 1) % n;
  const bbIndex = isHeadsUp
    ? (state.buttonIndex + 1) % n
    : (state.buttonIndex + 2) % n;

  placeBlind(state, sbIndex, state.smallBlind);
  placeBlind(state, bbIndex, state.bigBlind);

  state.currentBet = state.bigBlind;
  state.minRaise = state.bigBlind;
  state.lastAggressorIndex = bbIndex;

  // 翻前首个行动者：BB 左手（UTG）；单挑时为按钮/SB
  state.toActIndex = isHeadsUp ? sbIndex : (bbIndex + 1) % n;
  // 若首位不可行动（已 all-in），顺延
  state.toActIndex = findNextToAct(state, state.toActIndex, true);
}

function placeBlind(state: GameState, idx: number, amount: number): void {
  const pl = state.players[idx];
  const pay = Math.min(amount, pl.stack);
  pl.stack -= pay;
  pl.committedThisStreet += pay;
  pl.committedTotal += pay;
  state.pot += pay;
  if (pl.stack === 0) pl.allIn = true;
}

/**
 * 从 startIdx（含或不含）开始寻找下一个需要行动的玩家。
 * 需要行动 = 未弃牌、未 all-in。
 */
function findNextToAct(
  state: GameState,
  startIdx: number,
  inclusive: boolean
): number {
  const n = state.players.length;
  for (let k = inclusive ? 0 : 1; k < n + (inclusive ? 0 : 1); k++) {
    const idx = (startIdx + k) % n;
    const pl = state.players[idx];
    if (!pl.folded && !pl.allIn) return idx;
  }
  return -1;
}

export interface PlayerAction {
  type: ActionType;
  /** raise：加注到的总额（该玩家本轮 committedThisStreet 目标值）。call/check/fold 忽略 */
  amount?: number;
}

/** 当前行动者可用的动作与加注范围。 */
export function availableActions(state: GameState): {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
} {
  const idx = state.toActIndex;
  if (idx < 0 || state.phase !== 'betting') {
    return {
      canFold: false,
      canCheck: false,
      canCall: false,
      callAmount: 0,
      canRaise: false,
      minRaiseTo: 0,
      maxRaiseTo: 0,
    };
  }
  const pl = state.players[idx];
  const toCall = state.currentBet - pl.committedThisStreet;
  const canCheck = toCall <= 0;
  const canCall = toCall > 0 && pl.stack > 0;
  const callAmount = Math.min(toCall, pl.stack);
  const maxRaiseTo = pl.committedThisStreet + pl.stack; // all-in 上限
  const minRaiseTo = Math.min(state.currentBet + state.minRaise, maxRaiseTo);
  const canRaise = pl.stack > toCall; // 有余量加注
  return {
    canFold: true,
    canCheck,
    canCall,
    callAmount,
    canRaise,
    minRaiseTo,
    maxRaiseTo,
  };
}

/** 应用一个玩家动作，返回推进后的新状态（不可变风格：深拷贝）。 */
export function applyAction(prev: GameState, action: PlayerAction): GameState {
  const state = cloneState(prev);
  if (state.phase !== 'betting') return state;
  const idx = state.toActIndex;
  if (idx < 0) return state;

  const pl = state.players[idx];
  const toCall = state.currentBet - pl.committedThisStreet;

  switch (action.type) {
    case 'fold': {
      pl.folded = true;
      pl.lastAction = 'fold';
      pl.lastAmount = 0;
      logAction(state, pl, 'fold', 0);
      break;
    }
    case 'check': {
      if (toCall > 0) {
        // 非法过牌降级为跟注保护
        return applyAction(prev, { type: 'call' });
      }
      pl.lastAction = 'check';
      pl.lastAmount = 0;
      logAction(state, pl, 'check', 0);
      break;
    }
    case 'call': {
      const pay = Math.min(toCall, pl.stack);
      commit(state, pl, pay);
      pl.lastAction = 'call';
      pl.lastAmount = pay;
      logAction(state, pl, 'call', pay);
      break;
    }
    case 'raise': {
      const target = Math.max(
        action.amount ?? state.currentBet + state.minRaise,
        state.currentBet + Math.min(state.minRaise, pl.stack - toCall)
      );
      const cappedTarget = Math.min(target, pl.committedThisStreet + pl.stack);
      const pay = cappedTarget - pl.committedThisStreet;
      const raiseIncrement = cappedTarget - state.currentBet;
      commit(state, pl, pay);
      // 更新最小加注增量（完整加注才更新）
      if (raiseIncrement >= state.minRaise) {
        state.minRaise = raiseIncrement;
      }
      state.currentBet = Math.max(state.currentBet, cappedTarget);
      state.lastAggressorIndex = idx;
      pl.lastAction = 'raise';
      pl.lastAmount = cappedTarget;
      // 新的加注会重置其他玩家的“已行动”标记
      for (const other of state.players) {
        if (other.id !== pl.id && !other.folded && !other.allIn) {
          other.hasActedThisStreet = false;
        }
      }
      logAction(state, pl, 'raise', cappedTarget);
      break;
    }
  }

  pl.hasActedThisStreet = true;

  advance(state);
  return state;
}

function commit(state: GameState, pl: Player, pay: number): void {
  const real = Math.min(pay, pl.stack);
  pl.stack -= real;
  pl.committedThisStreet += real;
  pl.committedTotal += real;
  state.pot += real;
  if (pl.stack === 0) pl.allIn = true;
}

function logAction(
  state: GameState,
  pl: Player,
  action: ActionType,
  amount: number
): void {
  state.log.push({
    street: state.street,
    playerId: pl.id,
    playerName: pl.name,
    action,
    amount,
    potAfter: state.pot,
  });
}

/** 判断本轮下注是否结束，并推进街道或进入摊牌。 */
function advance(state: GameState): void {
  const contenders = state.players.filter((p) => !p.folded);

  // 只剩一人：直接结束本手
  if (contenders.length === 1) {
    finishHand(state);
    return;
  }

  // 检查本轮是否结束：所有未弃牌且未 all-in 的玩家都已行动，且投入一致
  const needAction = state.players.filter(
    (p) => !p.folded && !p.allIn
  );
  const allMatched = needAction.every(
    (p) => p.committedThisStreet === state.currentBet && p.hasActedThisStreet
  );

  // 若可行动者 <=1 且其余已 all-in，则跳过后续下注直接发完公共牌
  const canStillAct = needAction.length;

  if (allMatched && (canStillAct === 0 || allActedOnce(state))) {
    proceedStreet(state);
    return;
  }

  // 否则移动到下一个行动者
  const next = findNextToAct(state, state.toActIndex, false);
  if (next === -1) {
    proceedStreet(state);
  } else {
    state.toActIndex = next;
  }
}

function allActedOnce(state: GameState): boolean {
  return state.players
    .filter((p) => !p.folded && !p.allIn)
    .every((p) => p.hasActedThisStreet);
}

/** 进入下一条街或摊牌。 */
function proceedStreet(state: GameState): void {
  // 若仅剩 <=1 名可行动玩家，剩余街道无需下注，直接发牌到河牌摊牌
  const activeNonAllIn = state.players.filter((p) => !p.folded && !p.allIn);

  const order: Street[] = ['preflop', 'flop', 'turn', 'river'];
  const curIdx = order.indexOf(state.street);

  if (state.street === 'river') {
    goToShowdown(state);
    return;
  }

  // 重置本轮下注状态
  resetStreet(state);
  const nextStreet = order[curIdx + 1];
  dealStreet(state, nextStreet);
  state.street = nextStreet;

  // 若无人还能行动（都 all-in），继续自动发牌
  const stillActable = state.players.filter((p) => !p.folded && !p.allIn);
  if (stillActable.length <= 1 && activeNonAllIn.length <= 1) {
    // 自动推进到河牌摊牌
    proceedStreet(state);
    return;
  }

  // 设置行动者：翻后从按钮左手第一个未弃牌者开始
  const first = findNextToAct(state, state.buttonIndex, false);
  state.toActIndex = first;
  if (first === -1) {
    proceedStreet(state);
  }
}

function resetStreet(state: GameState): void {
  for (const p of state.players) {
    p.committedThisStreet = 0;
    p.hasActedThisStreet = false;
    if (!p.folded && !p.allIn) p.lastAction = undefined;
  }
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
  state.lastAggressorIndex = -1;
}

function dealStreet(state: GameState, street: Street): void {
  if (street === 'flop') {
    state.board.push(state.deck.pop()!, state.deck.pop()!, state.deck.pop()!);
  } else if (street === 'turn' || street === 'river') {
    state.board.push(state.deck.pop()!);
  }
}

/** 发满 5 张公共牌后进入摊牌与结算。 */
function goToShowdown(state: GameState): void {
  // 补满公共牌
  while (state.board.length < 5) {
    state.board.push(state.deck.pop()!);
  }
  state.phase = 'showdown';
  settle(state);
  state.phase = 'handComplete';
}

/** 仅剩一名玩家时的收池。 */
function finishHand(state: GameState): void {
  const winner = state.players.find((p) => !p.folded)!;
  winner.stack += state.pot;
  state.potShares = [{ playerId: winner.id, amount: state.pot }];
  state.showdown = state.players.map((p) => ({
    playerId: p.id,
    name: p.name,
    hole: p.hole,
    hand: undefined,
    won: p.id === winner.id ? state.pot : 0,
  }));
  state.pot = 0;
  state.toActIndex = -1;
  state.phase = 'handComplete';
}

/** 摊牌比牌 + 边池分配。 */
function settle(state: GameState): void {
  const contenders = state.players.filter((p) => !p.folded);

  // 计算每个未弃牌玩家的最终牌力
  const hands = new Map<number, HandResult>();
  for (const p of contenders) {
    hands.set(p.id, evaluateHand([...p.hole, ...state.board]));
  }

  // 边池：按各玩家 committedTotal 分层
  const shares = distributePots(state, contenders, hands);

  // 派发筹码
  const wonBy = new Map<number, number>();
  for (const s of shares) {
    wonBy.set(s.playerId, (wonBy.get(s.playerId) ?? 0) + s.amount);
    const pl = state.players.find((p) => p.id === s.playerId)!;
    pl.stack += s.amount;
  }

  state.potShares = shares;
  state.showdown = state.players.map((p) => ({
    playerId: p.id,
    name: p.name,
    hole: p.hole,
    hand: hands.get(p.id),
    won: wonBy.get(p.id) ?? 0,
  }));
  state.pot = 0;
  state.toActIndex = -1;
}

/**
 * 边池分配算法：按投入额分层，每层在“有资格且未弃牌”的玩家中比牌分配。
 */
function distributePots(
  state: GameState,
  contenders: Player[],
  hands: Map<number, HandResult>
): PotShare[] {
  const shares: PotShare[] = [];

  // 所有玩家（含弃牌者）的投入构成底池；分层用未弃牌者的投入档位
  const levels = Array.from(
    new Set(contenders.map((p) => p.committedTotal))
  ).sort((a, b) => a - b);

  let prevLevel = 0;
  const all = state.players;

  for (const level of levels) {
    if (level <= prevLevel) continue;
    const layerCap = level - prevLevel;
    // 该层每个投入 >= level 的玩家贡献 layerCap
    let layerPot = 0;
    for (const p of all) {
      const contribution = Math.min(
        Math.max(p.committedTotal - prevLevel, 0),
        layerCap
      );
      layerPot += contribution;
    }

    // 有资格竞争该层的玩家：未弃牌且投入 >= level
    const eligible = contenders.filter((p) => p.committedTotal >= level);
    if (eligible.length > 0 && layerPot > 0) {
      // 找最强牌
      let best: HandResult | null = null;
      for (const p of eligible) {
        const h = hands.get(p.id)!;
        if (!best || compareHands(h, best) > 0) best = h;
      }
      const winners = eligible.filter(
        (p) => compareHands(hands.get(p.id)!, best!) === 0
      );
      const each = Math.floor(layerPot / winners.length);
      let remainder = layerPot - each * winners.length;
      for (const w of winners) {
        let amt = each;
        // 余数分给最靠前者（简化处理）
        if (remainder > 0) {
          amt += 1;
          remainder--;
        }
        shares.push({ playerId: w.id, amount: amt });
      }
    }

    prevLevel = level;
  }

  return shares;
}

/** 当前应由 AI 行动时，计算其动作。返回 null 表示当前应由人类行动或牌局已结束。 */
export function computeAiActionForState(
  state: GameState,
  rand: () => number = Math.random
): PlayerAction | null {
  if (state.phase !== 'betting') return null;
  const idx = state.toActIndex;
  if (idx < 0) return null;
  const pl = state.players[idx];
  if (pl.isHero || !pl.difficulty) return null;

  const toCall = state.currentBet - pl.committedThisStreet;
  const position = positionStrength(state, idx);

  const ai = decideAiAction(
    {
      hole: pl.hole,
      board: state.board,
      street: state.street,
      toCall,
      pot: state.pot,
      stack: pl.stack,
      committed: pl.committedThisStreet,
      bigBlind: state.bigBlind,
      activePlayers: state.players.filter((p) => !p.folded).length,
      positionStrength: position,
    },
    pl.difficulty,
    rand
  );

  if (ai.type === 'raise') {
    return { type: 'raise', amount: ai.amount };
  }
  return { type: ai.type };
}

/** 该玩家决策理由（用于点评展示）。 */
export function explainAiAction(
  state: GameState,
  idx: number,
  rand: () => number = Math.random
): string {
  const pl = state.players[idx];
  if (!pl.difficulty) return '';
  const toCall = state.currentBet - pl.committedThisStreet;
  return decideAiAction(
    {
      hole: pl.hole,
      board: state.board,
      street: state.street,
      toCall,
      pot: state.pot,
      stack: pl.stack,
      committed: pl.committedThisStreet,
      bigBlind: state.bigBlind,
      activePlayers: state.players.filter((p) => !p.folded).length,
      positionStrength: positionStrength(state, idx),
    },
    pl.difficulty,
    rand
  ).reason;
}

/** 位置强度 0-1：相对按钮越靠后越接近 1。 */
function positionStrength(state: GameState, idx: number): number {
  const n = state.players.length;
  // 距离按钮的顺时针步数（按钮=最强=n-1 步后行动）
  const stepsAfterButton = (idx - state.buttonIndex + n) % n;
  // 按钮本身位置最强
  return 1 - stepsAfterButton / n;
}

export function isHeroToAct(state: GameState): boolean {
  return (
    state.phase === 'betting' &&
    state.toActIndex >= 0 &&
    state.players[state.toActIndex].isHero
  );
}

function cloneState(s: GameState): GameState {
  return {
    ...s,
    players: s.players.map((p) => ({ ...p, hole: [...p.hole] })),
    deck: [...s.deck],
    board: [...s.board],
    log: s.log.map((l) => ({ ...l })),
    showdown: s.showdown?.map((e) => ({ ...e, hole: [...e.hole] })),
    potShares: s.potShares?.map((p) => ({ ...p })),
  };
}
