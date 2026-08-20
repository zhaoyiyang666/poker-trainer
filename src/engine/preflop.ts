// 起手牌强度评估（Chen formula 变体）
// 用于翻前 AI 决策与刷题解析，给出 0-20 区间的起手牌评分与通俗分级。

import type { Card, Rank } from './cards';
import { RANK_LABELS } from './cards';

const CHEN_BASE: Record<number, number> = {
  14: 10, // A
  13: 8, // K
  12: 7, // Q
  11: 6, // J
  10: 5, // T
};

function baseScore(rank: Rank): number {
  return CHEN_BASE[rank] ?? rank / 2;
}

/** Chen 公式起手牌评分，范围约 -1 ~ 20。 */
export function chenScore(hole: Card[]): number {
  if (hole.length !== 2) throw new Error('起手牌需 2 张');
  const [a, b] = hole;
  const high = Math.max(a.rank, b.rank) as Rank;
  const low = Math.min(a.rank, b.rank) as Rank;

  let score = baseScore(high);

  // 对子：翻倍，最低 5 分
  if (a.rank === b.rank) {
    score = Math.max(baseScore(high) * 2, 5);
    return round(score);
  }

  // 同花 +2
  if (a.suit === b.suit) score += 2;

  // 间隔扣分
  const gap = high - low - 1;
  if (gap === 1) score -= 1;
  else if (gap === 2) score -= 2;
  else if (gap === 3) score -= 4;
  else if (gap >= 4) score -= 5;

  // 顺子潜力加成：两张都 < Q 且间隔 <=1
  if (gap <= 1 && high < 12) score += 1;

  return round(score);
}

function round(x: number): number {
  return Math.round(x * 2) / 2;
}

export type HandTier = 'premium' | 'strong' | 'playable' | 'marginal' | 'weak';

export function tierFromChen(score: number): HandTier {
  if (score >= 10) return 'premium';
  if (score >= 8) return 'strong';
  if (score >= 6) return 'playable';
  if (score >= 4) return 'marginal';
  return 'weak';
}

export const TIER_LABELS: Record<HandTier, string> = {
  premium: '顶级牌',
  strong: '强牌',
  playable: '可玩牌',
  marginal: '边缘牌',
  weak: '弱牌',
};

/** 生成起手牌简写，如 "AKs" "QQ" "T9o"。 */
export function holeLabel(hole: Card[]): string {
  const [a, b] = hole;
  const high = Math.max(a.rank, b.rank) as Rank;
  const low = Math.min(a.rank, b.rank) as Rank;
  if (a.rank === b.rank) return `${RANK_LABELS[high]}${RANK_LABELS[low]}`;
  const suited = a.suit === b.suit ? 's' : 'o';
  return `${RANK_LABELS[high]}${RANK_LABELS[low]}${suited}`;
}
