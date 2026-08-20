import { describe, it, expect } from 'vitest';
import { QUESTION_BANK } from './questions';
import { parseCards, cardId } from '@/engine/cards';

describe('题库自洽性校验', () => {
  it('每题的手牌与公共牌合法且互不重复', () => {
    for (const q of QUESTION_BANK) {
      const hole = parseCards(q.hole);
      expect(hole.length).toBe(2);
      const all = [...hole];
      if (q.board) all.push(...parseCards(q.board));
      const ids = all.map(cardId);
      expect(new Set(ids).size).toBe(ids.length); // 无重复牌
    }
  });

  it('每题都有明确答案与解析', () => {
    for (const q of QUESTION_BANK) {
      expect(['fold', 'call', 'raise']).toContain(q.correct);
      expect(q.explanation.length).toBeGreaterThan(4);
      expect(q.reasoning.length).toBeGreaterThan(4);
    }
  });

  it('题目 id 唯一', () => {
    const ids = QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
