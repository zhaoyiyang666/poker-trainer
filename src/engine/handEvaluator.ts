// 牌型判定算法（核心）
// 输入 5-7 张牌，选出最优 5 张，精准判定 10 种牌型并可比较大小。
// 设计要点：用一个可比较的数值/数组表达“牌力”，比较时逐位比较即可。

import type { Card, Rank } from './cards';
import { RANK_LABELS } from './cards';

/** 牌型等级，数值越大牌型越强。 */
export enum HandCategory {
  HighCard = 1, // 高牌
  Pair = 2, // 一对
  TwoPair = 3, // 两对
  ThreeOfAKind = 4, // 三条
  Straight = 5, // 顺子
  Flush = 6, // 同花
  FullHouse = 7, // 葫芦
  FourOfAKind = 8, // 四条
  StraightFlush = 9, // 同花顺
  RoyalFlush = 10, // 皇家同花顺
}

export const CATEGORY_LABELS: Record<HandCategory, string> = {
  [HandCategory.HighCard]: '高牌',
  [HandCategory.Pair]: '一对',
  [HandCategory.TwoPair]: '两对',
  [HandCategory.ThreeOfAKind]: '三条',
  [HandCategory.Straight]: '顺子',
  [HandCategory.Flush]: '同花',
  [HandCategory.FullHouse]: '葫芦',
  [HandCategory.FourOfAKind]: '四条',
  [HandCategory.StraightFlush]: '同花顺',
  [HandCategory.RoyalFlush]: '皇家同花顺',
};

export interface HandResult {
  category: HandCategory;
  /** 比较用的“分值序列”：先比 category，再按 tiebreakers 逐位比较（大者胜）。 */
  tiebreakers: number[];
  /** 组成最优牌型的 5 张牌（点数，降序，仅用于展示）。 */
  ranks: Rank[];
  label: string;
}

/** 在最多 5 个位置内寻找顺子的最高牌点（含 A-2-3-4-5 轮子）。返回顶端点数或 0。 */
function straightHighFromRanks(uniqueDesc: number[]): number {
  // uniqueDesc: 去重后的点数，降序
  const set = new Set(uniqueDesc);
  // 轮子：A 也当作 1
  const withWheel = new Set(uniqueDesc);
  if (set.has(14)) withWheel.add(1);
  const sorted = Array.from(withWheel).sort((a, b) => b - a);
  let run = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i] - 1 === sorted[i + 1]) {
      run++;
      if (run >= 5) return sorted[i - 3]; // 连续 5 张的顶端
    } else {
      run = 1;
    }
  }
  return 0;
}

/**
 * 评估最多 7 张牌，返回最优 5 张的牌力。
 * 算法为直接枚举/统计法，O(牌数)，精确无误差。
 */
export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`牌型判定需要 5-7 张牌，收到 ${cards.length} 张`);
  }

  // 按点数计数
  const rankCount = new Map<number, number>();
  // 按花色分组，保存点数
  const suitRanks = new Map<string, number[]>();

  for (const c of cards) {
    rankCount.set(c.rank, (rankCount.get(c.rank) ?? 0) + 1);
    const arr = suitRanks.get(c.suit) ?? [];
    arr.push(c.rank);
    suitRanks.set(c.suit, arr);
  }

  const allRanksDesc = cards.map((c) => c.rank).sort((a, b) => b - a);
  const uniqueDesc = Array.from(new Set(allRanksDesc)).sort((a, b) => b - a);

  // —— 同花 / 同花顺 / 皇家同花顺 ——
  let flushSuit: string | null = null;
  for (const [suit, ranks] of suitRanks) {
    if (ranks.length >= 5) flushSuit = suit;
  }

  if (flushSuit) {
    const flushRanksDesc = Array.from(
      new Set(suitRanks.get(flushSuit)!)
    ).sort((a, b) => b - a);
    const sfHigh = straightHighFromRanks(flushRanksDesc);
    if (sfHigh) {
      const category =
        sfHigh === 14 ? HandCategory.RoyalFlush : HandCategory.StraightFlush;
      const ranks = straightRanks(sfHigh);
      return {
        category,
        tiebreakers: [category, sfHigh],
        ranks,
        label:
          category === HandCategory.RoyalFlush
            ? '皇家同花顺'
            : `${RANK_LABELS[sfHigh as Rank]} 高同花顺`,
      };
    }
  }

  // 计数分桶：[[count, rank], ...]，先按 count 降序，再按 rank 降序
  const groups = Array.from(rankCount.entries())
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => (b.count - a.count) || (b.rank - a.rank));

  const counts = groups.map((g) => g.count);

  // —— 四条 ——
  if (counts[0] === 4) {
    const quad = groups[0].rank;
    const kicker = uniqueDesc.filter((r) => r !== quad)[0];
    return {
      category: HandCategory.FourOfAKind,
      tiebreakers: [HandCategory.FourOfAKind, quad, kicker],
      ranks: [quad, quad, quad, quad, kicker] as Rank[],
      label: `四条 ${RANK_LABELS[quad as Rank]}`,
    };
  }

  // —— 葫芦（三条 + 对子/另一个三条） ——
  if (counts[0] === 3 && counts[1] >= 2) {
    const trips = groups[0].rank;
    const pair = groups[1].rank;
    return {
      category: HandCategory.FullHouse,
      tiebreakers: [HandCategory.FullHouse, trips, pair],
      ranks: [trips, trips, trips, pair, pair] as Rank[],
      label: `葫芦 ${RANK_LABELS[trips as Rank]} 带 ${RANK_LABELS[pair as Rank]}`,
    };
  }

  // —— 同花 —— （非同花顺）
  if (flushSuit) {
    const top5 = Array.from(new Set(suitRanks.get(flushSuit)!))
      .sort((a, b) => b - a)
      .slice(0, 5);
    return {
      category: HandCategory.Flush,
      tiebreakers: [HandCategory.Flush, ...top5],
      ranks: top5 as Rank[],
      label: `${RANK_LABELS[top5[0] as Rank]} 高同花`,
    };
  }

  // —— 顺子 ——
  const straightHigh = straightHighFromRanks(uniqueDesc);
  if (straightHigh) {
    return {
      category: HandCategory.Straight,
      tiebreakers: [HandCategory.Straight, straightHigh],
      ranks: straightRanks(straightHigh),
      label: `${RANK_LABELS[straightHigh as Rank]} 高顺子`,
    };
  }

  // —— 三条 ——
  if (counts[0] === 3) {
    const trips = groups[0].rank;
    const kickers = uniqueDesc.filter((r) => r !== trips).slice(0, 2);
    return {
      category: HandCategory.ThreeOfAKind,
      tiebreakers: [HandCategory.ThreeOfAKind, trips, ...kickers],
      ranks: [trips, trips, trips, ...kickers] as Rank[],
      label: `三条 ${RANK_LABELS[trips as Rank]}`,
    };
  }

  // —— 两对 ——
  if (counts[0] === 2 && counts[1] === 2) {
    const highPair = groups[0].rank;
    const lowPair = groups[1].rank;
    const kicker = uniqueDesc.filter((r) => r !== highPair && r !== lowPair)[0];
    return {
      category: HandCategory.TwoPair,
      tiebreakers: [HandCategory.TwoPair, highPair, lowPair, kicker],
      ranks: [highPair, highPair, lowPair, lowPair, kicker] as Rank[],
      label: `两对 ${RANK_LABELS[highPair as Rank]} & ${RANK_LABELS[lowPair as Rank]}`,
    };
  }

  // —— 一对 ——
  if (counts[0] === 2) {
    const pair = groups[0].rank;
    const kickers = uniqueDesc.filter((r) => r !== pair).slice(0, 3);
    return {
      category: HandCategory.Pair,
      tiebreakers: [HandCategory.Pair, pair, ...kickers],
      ranks: [pair, pair, ...kickers] as Rank[],
      label: `一对 ${RANK_LABELS[pair as Rank]}`,
    };
  }

  // —— 高牌 ——
  const top5 = uniqueDesc.slice(0, 5);
  return {
    category: HandCategory.HighCard,
    tiebreakers: [HandCategory.HighCard, ...top5],
    ranks: top5 as Rank[],
    label: `${RANK_LABELS[top5[0] as Rank]} 高牌`,
  };
}

/** 由顺子顶端点数生成 5 张点数（处理轮子 A-5）。 */
function straightRanks(high: number): Rank[] {
  if (high === 5) return [5, 4, 3, 2, 14] as Rank[]; // 轮子
  return [high, high - 1, high - 2, high - 3, high - 4] as Rank[];
}

/**
 * 比较两手牌力。返回 >0 表示 a 胜，<0 表示 b 胜，0 表示平分。
 */
export function compareHands(a: HandResult, b: HandResult): number {
  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreakers[i] ?? 0;
    const bv = b.tiebreakers[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}
