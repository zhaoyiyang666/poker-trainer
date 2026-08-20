// 练习数据统计聚合：从本地记录计算对局与刷题指标。
import type { GameRecord, QuizRecord } from './store';
import { getGameRecords, getQuizRecords } from './store';

export type Period = 'today' | '7d' | 'all';

function inPeriod(ts: number, period: Period): boolean {
  if (period === 'all') return true;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (period === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return ts >= start.getTime();
  }
  return ts >= now - 7 * day;
}

export interface GameStats {
  totalHands: number;
  showdownHands: number;
  showdownWins: number;
  showdownWinRate: number; // 摊牌胜率
  vpipCount: number;
  vpipRate: number; // 入池率
  raiseCount: number;
  raiseRate: number; // 加注率
  foldCount: number;
  foldRate: number; // 弃牌率
  netChips: number;
}

export interface QuizStats {
  total: number;
  correct: number;
  accuracy: number;
  wrong: number;
  topWrongScenarios: { category: string; count: number }[];
}

export function computeGameStats(period: Period, records?: GameRecord[]): GameStats {
  const list = (records ?? getGameRecords()).filter((r) => inPeriod(r.timestamp, period));
  const totalHands = list.length;
  const showdown = list.filter((r) => r.wentToShowdown);
  const showdownWins = showdown.filter((r) => r.result === 'win').length;
  const vpipCount = list.filter((r) => r.vpip).length;
  const raiseCount = list.filter((r) => r.raised).length;
  const foldCount = list.filter((r) => r.result === 'fold').length;
  const netChips = list.reduce((a, r) => a + r.heroNet, 0);

  return {
    totalHands,
    showdownHands: showdown.length,
    showdownWins,
    showdownWinRate: showdown.length ? showdownWins / showdown.length : 0,
    vpipCount,
    vpipRate: totalHands ? vpipCount / totalHands : 0,
    raiseCount,
    raiseRate: totalHands ? raiseCount / totalHands : 0,
    foldCount,
    foldRate: totalHands ? foldCount / totalHands : 0,
    netChips,
  };
}

export function computeQuizStats(period: Period, records?: QuizRecord[]): QuizStats {
  const list = (records ?? getQuizRecords()).filter((r) => inPeriod(r.timestamp, period));
  const total = list.length;
  const correct = list.filter((r) => r.isCorrect).length;
  const wrongList = list.filter((r) => !r.isCorrect);

  const byCategory = new Map<string, number>();
  for (const r of wrongList) {
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
  }
  const topWrongScenarios = Array.from(byCategory.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    correct,
    accuracy: total ? correct / total : 0,
    wrong: wrongList.length,
    topWrongScenarios,
  };
}
