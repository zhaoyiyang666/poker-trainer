// AI 决策算法（规则化，多难度梯度）
// 依据：手牌力（翻前用 Chen 评分，翻后用蒙特卡洛权益）、座位位置、底池赔率、对手行动。
// 行为稳定可控，无异常随机操作。四种难度：新手 / 均衡 / 激进 / 紧守。

import type { Card } from './cards';
import { chenScore } from './preflop';
import { simulateEquity } from './equity';
import { computePotOdds } from './potOdds';

export type AiDifficulty = 'novice' | 'balanced' | 'aggressive' | 'tight';

export const DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  novice: '新手 AI',
  balanced: '均衡 AI',
  aggressive: '激进 AI',
  tight: '紧守 AI',
};

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type ActionType = 'fold' | 'check' | 'call' | 'raise';

export interface AiAction {
  type: ActionType;
  /** raise 时的总下注额（到该金额），其余为 0 */
  amount: number;
  reason: string;
}

export interface AiContext {
  hole: Card[];
  board: Card[];
  street: Street;
  /** 需要跟注的额度（0 表示可过牌） */
  toCall: number;
  pot: number;
  /** 该 AI 当前剩余筹码 */
  stack: number;
  /** 已投入本轮的筹码（用于计算加注到多少） */
  committed: number;
  /** 大盲金额，用于最小加注与下注尺度 */
  bigBlind: number;
  /** 还在牌局中的玩家数（含自己） */
  activePlayers: number;
  /** 位置强弱 0-1，越大越靠后（越有利） */
  positionStrength: number;
  /** 该 AI 在当前下注轮已加注的次数（用于限制激进 AI 连续加注） */
  streetRaiseCount: number;
}

interface Profile {
  // 翻前入池阈值（Chen 分）
  openThreshold: number;
  // 跟注阈值
  callThreshold: number;
  // 加注/3bet 阈值
  raiseThreshold: number;
  // 翻后加注/诈唬倾向 0-1
  aggression: number;
  // 权益容忍：需要多少额外安全垫才跟注
  equityMargin: number;
}

const PROFILES: Record<AiDifficulty, Profile> = {
  novice: {
    // 新手：偏松、被动，容易跟注、少加注
    openThreshold: 5,
    callThreshold: 3,
    raiseThreshold: 12,
    aggression: 0.1,
    equityMargin: -0.05,
  },
  balanced: {
    openThreshold: 8,
    callThreshold: 6,
    raiseThreshold: 10,
    aggression: 0.35,
    equityMargin: 0.0,
  },
  aggressive: {
    // 激进：宽入池、频繁加注施压
    openThreshold: 6,
    callThreshold: 5,
    raiseThreshold: 8,
    aggression: 0.6,
    equityMargin: -0.03,
  },
  tight: {
    // 紧守：只玩强牌，少诈唬
    openThreshold: 10,
    callThreshold: 8,
    raiseThreshold: 12,
    aggression: 0.2,
    equityMargin: 0.05,
  },
};

/** 激进 AI 同一下注轮的连续加注上限，超过后不再加注，避免无休止的加注战。 */
export const MAX_AGGRESSIVE_STREET_RAISES = 3;

/**
 * 计算 AI 的行动。确定性主导，仅在“边界情况”用小幅随机制造混合策略，
 * 且随机源可注入以便测试。
 */
export function decideAiAction(
  ctx: AiContext,
  difficulty: AiDifficulty,
  rand: () => number = Math.random
): AiAction {
  const p = PROFILES[difficulty];
  const canCheck = ctx.toCall <= 0;

  const action =
    ctx.street === 'preflop'
      ? decidePreflop(ctx, p, canCheck, rand)
      : decidePostflop(ctx, p, canCheck, rand);

  // 约束：激进 AI 本轮加注已达上限时，将“再加注”降级为跟注/过牌
  if (
    difficulty === 'aggressive' &&
    action.type === 'raise' &&
    ctx.streetRaiseCount >= MAX_AGGRESSIVE_STREET_RAISES
  ) {
    if (canCheck) {
      return {
        type: 'check',
        amount: 0,
        reason: `本轮已连续加注 ${ctx.streetRaiseCount} 次，达到激进加注上限，改为过牌控制节奏。`,
      };
    }
    return {
      type: 'call',
      amount: ctx.toCall,
      reason: `本轮已连续加注 ${ctx.streetRaiseCount} 次，达到激进加注上限，改为跟注而非继续加注。`,
    };
  }

  return action;
}

function decidePreflop(
  ctx: AiContext,
  p: Profile,
  canCheck: boolean,
  rand: () => number
): AiAction {
  const score = chenScore(ctx.hole);
  // 位置加成：靠后位置放宽阈值
  const posBonus = ctx.positionStrength * 2;
  const effScore = score + posBonus;

  const raiseTo = raiseSize(ctx, canCheck ? 3 : 2.5);

  if (effScore >= p.raiseThreshold && ctx.stack > ctx.toCall) {
    return {
      type: 'raise',
      amount: raiseTo,
      reason: `起手牌评分高（${score.toFixed(1)}）且位置有利，主动加注建立底池并施压。`,
    };
  }

  if (canCheck) {
    // 大盲位可免费看翻牌，弱牌过牌
    if (effScore >= p.raiseThreshold && rand() < p.aggression) {
      return { type: 'raise', amount: raiseTo, reason: '强牌选择加注扩大价值。' };
    }
    return { type: 'check', amount: 0, reason: '可免费看翻牌，控制底池。' };
  }

  if (effScore >= p.callThreshold) {
    // 面对加注：够强则跟注，极强则再加注已在上面处理
    return {
      type: 'call',
      amount: ctx.toCall,
      reason: `起手牌达到跟注区间（评分 ${score.toFixed(1)}），跟注看翻牌。`,
    };
  }

  return {
    type: 'fold',
    amount: 0,
    reason: `起手牌偏弱（评分 ${score.toFixed(1)}）且需付出跟注，弃牌等待更好机会。`,
  };
}

function decidePostflop(
  ctx: AiContext,
  p: Profile,
  canCheck: boolean,
  rand: () => number
): AiAction {
  // 用较小迭代量估算权益（AI 决策不需极高精度）
  const opponents = Math.max(1, ctx.activePlayers - 1);
  const eq = simulateEquity(
    { hole: ctx.hole, board: ctx.board, opponents, iterations: 600 },
    rand
  ).equity;

  const raiseTo = raiseSize(ctx, 0.66); // 约 2/3 底池

  if (canCheck) {
    // 无人下注：强牌下注价值，中等牌控池，弱牌偶尔诈唬
    if (eq >= 0.62) {
      return {
        type: 'raise',
        amount: raiseTo,
        reason: `牌力较强（权益约 ${(eq * 100).toFixed(0)}%），下注争取价值。`,
      };
    }
    if (eq < 0.35 && rand() < p.aggression * 0.5) {
      return {
        type: 'raise',
        amount: raiseTo,
        reason: '牌力较弱但选择半诈唬施压，符合激进风格。',
      };
    }
    return { type: 'check', amount: 0, reason: '牌力中等，过牌控制底池。' };
  }

  // 面对下注：用底池赔率决定
  const odds = computePotOdds(ctx.pot, ctx.toCall, eq);
  const threshold = odds.breakEvenEquity + p.equityMargin;

  if (eq >= 0.66 && ctx.stack > ctx.toCall && rand() < 0.5 + p.aggression * 0.5) {
    return {
      type: 'raise',
      amount: raiseTo,
      reason: `牌力强（权益约 ${(eq * 100).toFixed(0)}%），加注扩大价值。`,
    };
  }

  if (eq >= threshold) {
    return {
      type: 'call',
      amount: ctx.toCall,
      reason: `权益（${(eq * 100).toFixed(0)}%）高于底池赔率盈亏平衡点（${(
        odds.breakEvenEquity * 100
      ).toFixed(0)}%），跟注有利。`,
    };
  }

  return {
    type: 'fold',
    amount: 0,
    reason: `权益（${(eq * 100).toFixed(0)}%）低于所需赔率，弃牌是长期正确选择。`,
  };
}

/** 计算加注到的总额：以底池或大盲为基准，并做上限/最小加注约束。 */
function raiseSize(ctx: AiContext, potFraction: number): number {
  const base =
    ctx.street === 'preflop'
      ? ctx.bigBlind * potFraction + ctx.toCall
      : ctx.pot * potFraction + ctx.toCall;
  const minRaise = ctx.toCall + Math.max(ctx.bigBlind, ctx.toCall);
  let target = Math.max(base, minRaise);
  // 不能超过自身总投入能力（committed + stack）
  const maxTotal = ctx.committed + ctx.stack;
  target = Math.min(target, maxTotal);
  return Math.round(target);
}
