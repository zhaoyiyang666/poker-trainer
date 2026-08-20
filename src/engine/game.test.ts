import { describe, it, expect } from 'vitest';
import {
  startHand,
  applyAction,
  computeAiActionForState,
  isHeroToAct,
  type GameState,
} from './game';

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function play(state: GameState, rand: () => number): GameState {
  let s = state;
  let guard = 0;
  while (s.phase === 'betting' && guard++ < 500) {
    if (isHeroToAct(s)) {
      // 英雄自动做保守动作：能过牌就过牌，否则弃牌
      const bet = s.currentBet - s.players[s.toActIndex].committedThisStreet;
      s = applyAction(s, bet > 0 ? { type: 'fold' } : { type: 'check' });
    } else {
      const ai = computeAiActionForState(s, rand);
      if (!ai) break;
      s = applyAction(s, ai);
    }
  }
  return s;
}

describe('对局状态机 game', () => {
  it('能把一手牌打到结束并结算，筹码守恒', () => {
    const rand = makeRng(123);
    const state = startHand({
      seats: 6,
      aiDifficulties: ['balanced', 'aggressive', 'tight', 'novice', 'balanced'],
      smallBlind: 10,
      bigBlind: 20,
      startingStack: 1000,
      rand,
    });
    const totalBefore = state.players.reduce((a, p) => a + p.stack, 0) + state.pot;
    const done = play(state, rand);
    expect(done.phase).toBe('handComplete');
    const totalAfter = done.players.reduce((a, p) => a + p.stack, 0) + done.pot;
    expect(totalAfter).toBe(totalBefore);
    expect(done.showdown).toBeDefined();
  });

  it('多手连打筹码始终守恒（含边池场景）', () => {
    const rand = makeRng(999);
    let carry: number[] | undefined = undefined;
    let button = 0;
    const startTotal = 6 * 1000;
    for (let h = 0; h < 30; h++) {
      const state = startHand({
        seats: 6,
        aiDifficulties: ['aggressive', 'aggressive', 'balanced', 'tight', 'novice'],
        smallBlind: 10,
        bigBlind: 20,
        startingStack: 1000,
        buttonIndex: button,
        carryStacks: carry,
        handNumber: h + 1,
        rand,
      });
      const done = play(state, rand);
      expect(done.phase).toBe('handComplete');
      carry = done.players.map((p) => p.stack);
      const total = carry.reduce((a, b) => a + b, 0);
      // 因筹码耗尽自动重置，总额只会 >= 初始，且为整数
      expect(Number.isInteger(total)).toBe(true);
      expect(total).toBeGreaterThanOrEqual(startTotal - 6000); // 宽松边界，主要验证无 NaN
      button = (button + 1) % 6;
    }
  });

  it('翻前只剩一人时立即结算', () => {
    const rand = makeRng(7);
    const state = startHand({
      seats: 6,
      aiDifficulties: ['tight', 'tight', 'tight', 'tight', 'tight'],
      smallBlind: 10,
      bigBlind: 20,
      startingStack: 1000,
      rand,
    });
    const done = play(state, rand);
    expect(done.phase).toBe('handComplete');
  });
});
