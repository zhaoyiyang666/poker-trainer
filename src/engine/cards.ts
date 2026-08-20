// 扑克牌基础模型：花色、点数、牌、牌组
// 纯计算模块，与 UI 完全解耦，便于单元测试与跨端复用。

export const SUITS = ['s', 'h', 'd', 'c'] as const;
// s=黑桃 spades, h=红桃 hearts, d=方块 diamonds, c=梅花 clubs
export type Suit = (typeof SUITS)[number];

// 点数 2-14，其中 11=J, 12=Q, 13=K, 14=A
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const RANK_LABELS: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const SUIT_LABELS: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};

export const SUIT_IS_RED: Record<Suit, boolean> = {
  s: false,
  h: true,
  d: true,
  c: false,
};

/** 卡牌唯一 id：0-51，用于快速去重与 Set 运算。 */
export function cardId(card: Card): number {
  return (card.rank - 2) * 4 + SUITS.indexOf(card.suit);
}

export function cardFromId(id: number): Card {
  const rank = (Math.floor(id / 4) + 2) as Rank;
  const suit = SUITS[id % 4];
  return { rank, suit };
}

/** 生成一副 52 张标准牌。 */
export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** 排除已知牌后剩余的牌池（用于蒙特卡洛发牌）。 */
export function remainingDeck(known: Card[]): Card[] {
  const used = new Set(known.map(cardId));
  return createFullDeck().filter((c) => !used.has(cardId(c)));
}

/** Fisher–Yates 洗牌，原地打乱。可传入随机源以便测试确定性。 */
export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/** 文本解析，如 "As" "Th" "2c"。用于测试与题库定义。 */
export function parseCard(text: string): Card {
  const raw = text.trim();
  const suitChar = raw[raw.length - 1].toLowerCase() as Suit;
  const rankStr = raw.slice(0, raw.length - 1).toUpperCase();
  if (!SUITS.includes(suitChar)) throw new Error(`非法花色: ${text}`);
  const rankMap: Record<string, Rank> = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    T: 10,
    '10': 10,
    '9': 9,
    '8': 8,
    '7': 7,
    '6': 6,
    '5': 5,
    '4': 4,
    '3': 3,
    '2': 2,
  };
  const rank = rankMap[rankStr];
  if (!rank) throw new Error(`非法点数: ${text}`);
  return { rank, suit: suitChar };
}

export function parseCards(text: string): Card[] {
  return text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(parseCard);
}
