import { describe, it, expect } from 'vitest';
import { parseCards } from './cards';
import {
  evaluateHand,
  compareHands,
  HandCategory,
} from './handEvaluator';

function cat(text: string): HandCategory {
  return evaluateHand(parseCards(text)).category;
}

describe('牌型判定 evaluateHand', () => {
  it('识别皇家同花顺', () => {
    expect(cat('As Ks Qs Js Ts 2h 3d')).toBe(HandCategory.RoyalFlush);
  });

  it('识别同花顺（含轮子 A-5）', () => {
    expect(cat('As 2s 3s 4s 5s 9h Kd')).toBe(HandCategory.StraightFlush);
    expect(cat('9h 8h 7h 6h 5h 2c 2d')).toBe(HandCategory.StraightFlush);
  });

  it('识别四条', () => {
    expect(cat('9h 9s 9d 9c 2h 3d Ks')).toBe(HandCategory.FourOfAKind);
  });

  it('识别葫芦', () => {
    expect(cat('Kh Ks Kd 2c 2h 5s 7d')).toBe(HandCategory.FullHouse);
  });

  it('两个三条应组成葫芦（取高三条+低三条为对）', () => {
    const r = evaluateHand(parseCards('Kh Ks Kd Qc Qh Qs 7d'));
    expect(r.category).toBe(HandCategory.FullHouse);
    expect(r.tiebreakers).toEqual([HandCategory.FullHouse, 13, 12]);
  });

  it('识别同花', () => {
    expect(cat('2h 5h 8h Jh Kh 3s 4d')).toBe(HandCategory.Flush);
  });

  it('识别顺子（含轮子 A-2-3-4-5）', () => {
    expect(cat('Ah 2s 3d 4c 5h Kd Qs')).toBe(HandCategory.Straight);
    expect(cat('Th Js Qd Kc Ah 2s 3d')).toBe(HandCategory.Straight);
  });

  it('识别三条 / 两对 / 一对 / 高牌', () => {
    expect(cat('7h 7s 7d 2c 5h 9s Kd')).toBe(HandCategory.ThreeOfAKind);
    expect(cat('7h 7s 5d 5c 2h 9s Kd')).toBe(HandCategory.TwoPair);
    expect(cat('7h 7s 2d 5c 8h 9s Kd')).toBe(HandCategory.Pair);
    expect(cat('2h 5s 7d 9c Jh Ks Ad')).toBe(HandCategory.HighCard);
  });
});

describe('牌力比较 compareHands', () => {
  it('同花 > 顺子', () => {
    const flush = evaluateHand(parseCards('2h 5h 8h Jh Kh 3s 4d'));
    const straight = evaluateHand(parseCards('Ah 2s 3d 4c 5h Kd Qs'));
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
  });

  it('高对 vs 低对，比对子大小', () => {
    const aces = evaluateHand(parseCards('Ah As 2d 5c 8h 9s Kd'));
    const kings = evaluateHand(parseCards('Kh Ks 2d 5c 8h 9s Qd'));
    expect(compareHands(aces, kings)).toBeGreaterThan(0);
  });

  it('相同对子比踢脚', () => {
    const a = evaluateHand(parseCards('Ah As Kd 5c 8h 2s 3d'));
    const b = evaluateHand(parseCards('Ac Ad Qd 5c 8h 2s 3h'));
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it('完全相同牌力应平分', () => {
    const a = evaluateHand(parseCards('Ah As Kd Qc Jh 2s 3d'));
    const b = evaluateHand(parseCards('Ac Ad Kh Qs Jd 4s 5h'));
    expect(compareHands(a, b)).toBe(0);
  });

  it('轮子顺子应小于 6 高顺子', () => {
    const wheel = evaluateHand(parseCards('Ah 2s 3d 4c 5h 9s Kd'));
    const six = evaluateHand(parseCards('2h 3s 4d 5c 6h 9s Kd'));
    expect(compareHands(six, wheel)).toBeGreaterThan(0);
  });
});
