import { describe, it, expect } from 'vitest';
import { parseCards } from './cards';
import { simulateEquity } from './equity';
import { computePotOdds } from './potOdds';

// 简单可复现随机源（LCG），用于确定性测试
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('蒙特卡洛胜率 simulateEquity', () => {
  it('AA vs 1 对手，翻前胜率应约 85%', () => {
    const r = simulateEquity(
      { hole: parseCards('As Ah'), board: [], opponents: 1, iterations: 8000 },
      makeRng(42)
    );
    expect(r.win + r.tie + r.lose).toBeCloseTo(1, 5);
    // 已知理论值约 0.85，允许蒙特卡洛误差
    expect(r.win).toBeGreaterThan(0.80);
    expect(r.win).toBeLessThan(0.90);
  });

  it('对手越多，AA 胜率越低', () => {
    const one = simulateEquity(
      { hole: parseCards('As Ah'), board: [], opponents: 1, iterations: 6000 },
      makeRng(7)
    );
    const five = simulateEquity(
      { hole: parseCards('As Ah'), board: [], opponents: 5, iterations: 6000 },
      makeRng(7)
    );
    expect(five.win).toBeLessThan(one.win);
  });

  it('已成坚果同花顺应接近必胜', () => {
    const r = simulateEquity(
      {
        hole: parseCards('As Ks'),
        board: parseCards('Qs Js Ts'),
        opponents: 2,
        iterations: 4000,
      },
      makeRng(99)
    );
    expect(r.win + r.tie).toBeGreaterThan(0.99);
  });
});

describe('底池赔率 computePotOdds', () => {
  it('底池 100 跟注 50，赔率 2:1，盈亏平衡点约 33%', () => {
    const r = computePotOdds(100, 50, 0.4);
    expect(r.ratioLabel).toBe('2.0 : 1');
    expect(r.breakEvenEquity).toBeCloseTo(1 / 3, 3);
    expect(r.worthCalling).toBe(true);
  });

  it('胜率低于盈亏平衡点时不建议跟注', () => {
    const r = computePotOdds(100, 100, 0.3);
    expect(r.breakEvenEquity).toBeCloseTo(0.5, 5);
    expect(r.worthCalling).toBe(false);
    expect(r.expectedValue).toBeLessThan(0);
  });
});
