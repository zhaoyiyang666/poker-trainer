// 对局控制器 Hook：驱动状态机、自动执行 AI 行动、记录数据、生成结算点评。
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiDifficulty } from '@/engine/ai';
import {
  startHand,
  applyAction,
  availableActions,
  computeAiActionForState,
  isHeroToAct,
  explainAiAction,
  type GameState,
  type PlayerAction,
} from '@/engine/game';
import { simulateEquity } from '@/engine/equity';
import { computePotOdds } from '@/engine/potOdds';
import {
  addGameRecord,
  genId,
  type GameRecord,
} from '@/storage/store';
import { RANK_LABELS, SUIT_LABELS, type Card } from '@/engine/cards';

export interface GameConfig {
  seats: 6 | 9;
  difficulty: AiDifficulty;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
}

export interface ReviewData {
  heroResult: 'win' | 'lose' | 'tie' | 'fold';
  heroNet: number;
  heroEquityAtDecision: number | null;
  potOddsNote: string;
  feedback: string;
  suggestion: string;
}

function cardStr(c: Card): string {
  return `${RANK_LABELS[c.rank]}${SUIT_LABELS[c.suit]}`;
}

export function useGame(config: GameConfig) {
  const [state, setState] = useState<GameState>(() => createInitial(config));
  const [review, setReview] = useState<ReviewData | null>(null);
  const buttonRef = useRef(0);
  const handNumRef = useRef(1);
  // 记录英雄本手是否入池/加注，以及最后一次面临决策时的权益
  const heroVpipRef = useRef(false);
  const heroRaisedRef = useRef(false);
  const heroLastEquityRef = useRef<number | null>(null);
  const heroLastPotOddsRef = useRef<string>('');
  const recordedRef = useRef(false);

  function createInitialWrap(): GameState {
    return createInitial(config);
  }

  const startNext = useCallback(
    (carry?: number[]) => {
      buttonRef.current = (buttonRef.current + 1) % config.seats;
      handNumRef.current += 1;
      heroVpipRef.current = false;
      heroRaisedRef.current = false;
      heroLastEquityRef.current = null;
      heroLastPotOddsRef.current = '';
      recordedRef.current = false;
      setReview(null);
      setState(
        startHand({
          seats: config.seats,
          aiDifficulties: [config.difficulty],
          smallBlind: config.smallBlind,
          bigBlind: config.bigBlind,
          startingStack: config.startingStack,
          buttonIndex: buttonRef.current,
          handNumber: handNumRef.current,
          carryStacks: carry,
        })
      );
    },
    [config]
  );

  // 记录英雄决策前的权益（用于点评与错题式建议）
  const captureHeroContext = useCallback((s: GameState) => {
    if (!isHeroToAct(s)) return;
    const hero = s.players.find((p) => p.isHero)!;
    const toCall = s.currentBet - hero.committedThisStreet;
    const opponents = s.players.filter((p) => !p.folded).length - 1;
    if (opponents >= 1) {
      const eq = simulateEquity(
        { hole: hero.hole, board: s.board, opponents, iterations: 800 },
        Math.random
      ).equity;
      heroLastEquityRef.current = eq;
      if (toCall > 0) {
        const odds = computePotOdds(s.pot, toCall, eq);
        heroLastPotOddsRef.current = `底池赔率 ${odds.ratioLabel}，盈亏平衡点约 ${(
          odds.breakEvenEquity * 100
        ).toFixed(0)}%，你的实时胜率约 ${(eq * 100).toFixed(0)}%。`;
      } else {
        heroLastPotOddsRef.current = `当前可过牌，实时胜率约 ${(eq * 100).toFixed(0)}%。`;
      }
    }
  }, []);

  // 英雄执行动作
  const heroAction = useCallback(
    (action: PlayerAction) => {
      setState((s) => {
        if (!isHeroToAct(s)) return s;
        if (action.type === 'call' || action.type === 'raise') {
          heroVpipRef.current = true;
        }
        if (action.type === 'raise') heroRaisedRef.current = true;
        return applyAction(s, action);
      });
    },
    []
  );

  // 自动推进 AI 行动 + 捕获英雄决策上下文 + 结算记录
  useEffect(() => {
    if (state.phase === 'betting') {
      if (isHeroToAct(state)) {
        captureHeroContext(state);
        return;
      }
      // AI 行动，加一点延迟提升可读性
      const ai = computeAiActionForState(state);
      if (ai) {
        const t = setTimeout(() => {
          setState((s) => {
            if (s !== state) return s; // 状态已变，跳过
            const act = computeAiActionForState(s);
            return act ? applyAction(s, act) : s;
          });
        }, 620);
        return () => clearTimeout(t);
      }
    } else if (state.phase === 'handComplete' && !recordedRef.current) {
      recordedRef.current = true;
      buildReviewAndRecord(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function buildReviewAndRecord(s: GameState) {
    const hero = s.players.find((p) => p.isHero)!;
    const sd = s.showdown?.find((e) => e.playerId === hero.id);
    const won = sd?.won ?? 0;
    const heroNet = won - hero.committedTotal;

    let result: ReviewData['heroResult'];
    if (hero.folded) result = 'fold';
    else if (won > 0 && heroNet >= 0) {
      // 判断平分：赢得金额但可能与他人并列
      const winners = s.showdown?.filter((e) => e.won > 0) ?? [];
      result = winners.length > 1 ? 'tie' : 'win';
    } else if (won > 0) {
      result = 'win';
    } else {
      result = 'lose';
    }

    // 生成点评
    const eq = heroLastEquityRef.current;
    let feedback = '';
    let suggestion = '';
    if (hero.folded) {
      if (eq !== null && eq > 0.55) {
        feedback = '你在仍有较高胜率时选择了弃牌，可能过于保守。';
        suggestion = '当实时胜率高于底池赔率所需时，跟注或加注通常更有价值。';
      } else {
        feedback = '弃掉边缘/弱牌是纪律性的体现。';
        suggestion = '继续保持：无正期望的牌面果断放弃，能长期减少损失。';
      }
    } else if (result === 'win') {
      feedback = '本手把牌力转化为了收益，决策方向正确。';
      suggestion =
        eq !== null && eq > 0.6
          ? '强牌时可考虑加注下更大的价值注，扩大盈利。'
          : '注意在强牌时争取价值、弱牌时控制底池。';
    } else if (result === 'tie') {
      feedback = '本手与对手平分底池。';
      suggestion = '平分说明牌力相近，翻后可通过位置与下注尺度制造更多弃牌。';
    } else {
      feedback =
        eq !== null && eq < 0.4
          ? '在胜率不足时投入较多筹码，属于典型的追注亏损。'
          : '牌力足够但运气不佳，决策本身未必错误。';
      suggestion =
        eq !== null && eq < 0.4
          ? '面对下注先算底池赔率：所需胜率 = 跟注 ÷ (底池+跟注)。低于阈值应弃牌。'
          : '关注长期期望值而非单手结果，坚持正确决策即可。';
    }

    const boardStr = s.board.map(cardStr).join(' ');

    const rec: GameRecord = {
      id: genId(),
      timestamp: Date.now(),
      seats: s.players.length,
      heroHole: hero.hole.map(cardStr).join(''),
      board: boardStr,
      result,
      heroNet,
      wentToShowdown: !hero.folded && !!sd?.hand,
      vpip: heroVpipRef.current,
      raised: heroRaisedRef.current,
      street: s.street,
    };
    addGameRecord(rec);

    setReview({
      heroResult: result,
      heroNet,
      heroEquityAtDecision: eq,
      potOddsNote: heroLastPotOddsRef.current,
      feedback,
      suggestion,
    });
  }

  const actions = availableActions(state);
  const heroTurn = isHeroToAct(state);

  return {
    state,
    review,
    actions,
    heroTurn,
    heroAction,
    startNext,
    restart: () => {
      recordedRef.current = false;
      heroVpipRef.current = false;
      heroRaisedRef.current = false;
      setReview(null);
      setState(createInitialWrap());
    },
    aiReasonFor: (idx: number) => explainAiAction(state, idx),
  };
}

function createInitial(config: GameConfig): GameState {
  return startHand({
    seats: config.seats,
    aiDifficulties: [config.difficulty],
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    startingStack: config.startingStack,
    buttonIndex: 0,
    handNumber: 1,
  });
}
