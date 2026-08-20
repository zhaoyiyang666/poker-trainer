import { describe, it, expect } from 'vitest';
import { parseCards } from './cards';
import { decideAiAction, type AiContext } from './ai';

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function baseCtx(overrides: Partial<AiContext>): AiContext {
  return {
    hole: parseCards('As Ah'),
    board: [],
    street: 'preflop',
    toCall: 20,
    pot: 30,
    stack: 1000,
    committed: 0,
    bigBlind: 20,
    activePlayers: 3,
    positionStrength: 0.5,
    streetRaiseCount: 0,
    ...overrides,
  };
}

describe('AI 决策 decideAiAction', () => {
  it('拿到 AA 翻前不会弃牌', () => {
    const a = decideAiAction(baseCtx({}), 'balanced', makeRng(1));
    expect(a.type).not.toBe('fold');
  });

  it('紧守 AI 面对加注会弃掉 72o 这类垃圾牌', () => {
    const a = decideAiAction(
      baseCtx({ hole: parseCards('7d 2c'), positionStrength: 0.1 }),
      'tight',
      makeRng(3)
    );
    expect(a.type).toBe('fold');
  });

  it('可过牌时弱牌选择过牌而非弃牌', () => {
    const a = decideAiAction(
      baseCtx({ hole: parseCards('7d 2c'), toCall: 0 }),
      'balanced',
      makeRng(5)
    );
    expect(['check', 'raise']).toContain(a.type);
  });

  it('翻后拿到坚果不会弃牌', () => {
    const a = decideAiAction(
      baseCtx({
        hole: parseCards('As Ks'),
        board: parseCards('Qs Js Ts'),
        street: 'flop',
        toCall: 50,
        pot: 200,
      }),
      'balanced',
      makeRng(9)
    );
    expect(a.type).not.toBe('fold');
  });

  it('加注额不超过自身筹码上限', () => {
    const a = decideAiAction(
      baseCtx({ hole: parseCards('As Ah'), stack: 40, bigBlind: 20 }),
      'aggressive',
      makeRng(2)
    );
    if (a.type === 'raise') {
      expect(a.amount).toBeLessThanOrEqual(40);
    }
  });

  it('激进 AI 本轮加注达 3 次后不再加注（降级为跟注）', () => {
    const a = decideAiAction(
      baseCtx({ hole: parseCards('As Ah'), streetRaiseCount: 3 }),
      'aggressive',
      makeRng(2)
    );
    expect(a.type).not.toBe('raise');
    expect(a.type).toBe('call');
  });

  it('激进 AI 本轮加注达上限且可过牌时选择过牌', () => {
    const a = decideAiAction(
      baseCtx({
        hole: parseCards('As Ah'),
        board: parseCards('Ad Kc 7h'),
        street: 'flop',
        toCall: 0,
        streetRaiseCount: 3,
      }),
      'aggressive',
      makeRng(2)
    );
    expect(a.type).toBe('check');
  });

  it('未达上限时激进 AI 仍可正常加注', () => {
    const a = decideAiAction(
      baseCtx({ hole: parseCards('As Ah'), streetRaiseCount: 2 }),
      'aggressive',
      makeRng(2)
    );
    expect(a.type).toBe('raise');
  });
});
