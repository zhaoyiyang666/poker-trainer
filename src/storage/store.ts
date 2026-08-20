// 本地数据存储层（localStorage）
// 存储：对局记录、错题、练习统计、设置。无任何联网、无资金数据。

export interface GameRecord {
  id: string;
  timestamp: number;
  seats: number;
  heroHole: string; // 如 "AsKh"
  board: string;
  result: 'win' | 'lose' | 'tie' | 'fold';
  heroNet: number; // 本手净筹码变化（虚拟练习道具）
  wentToShowdown: boolean;
  vpip: boolean; // 是否主动投入底池（入池）
  raised: boolean; // 本手是否加注过
  street: string; // 结束时所在街道
}

export interface QuizRecord {
  id: string;
  timestamp: number;
  questionId: string;
  scenario: string;
  chosen: string;
  correct: string;
  isCorrect: boolean;
  category: string; // 场景分类，用于统计 TOP 错题
}

export interface AppSettings {
  offlineMode: boolean;
  onboardingSeen: boolean;
  defaultSeats: 6 | 9;
  defaultDifficulty: string;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
}

const KEYS = {
  games: 'pt_games',
  quizzes: 'pt_quizzes',
  wrongIds: 'pt_wrong_ids',
  settings: 'pt_settings',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  offlineMode: true,
  onboardingSeen: false,
  defaultSeats: 6,
  defaultDifficulty: 'balanced',
  smallBlind: 10,
  bigBlind: 20,
  startingStack: 1000,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储失败静默处理（隐私模式/容量限制）
  }
}

// —— 对局记录 ——
export function getGameRecords(): GameRecord[] {
  return read<GameRecord[]>(KEYS.games, []);
}

export function addGameRecord(rec: GameRecord): void {
  const list = getGameRecords();
  list.unshift(rec);
  // 限制上限，避免无限增长
  write(KEYS.games, list.slice(0, 500));
}

// —— 刷题记录 ——
export function getQuizRecords(): QuizRecord[] {
  return read<QuizRecord[]>(KEYS.quizzes, []);
}

export function addQuizRecord(rec: QuizRecord): void {
  const list = getQuizRecords();
  list.unshift(rec);
  write(KEYS.quizzes, list.slice(0, 1000));
}

// —— 错题收藏 ——
export function getWrongIds(): string[] {
  return read<string[]>(KEYS.wrongIds, []);
}

export function toggleWrongId(questionId: string): string[] {
  const set = new Set(getWrongIds());
  if (set.has(questionId)) set.delete(questionId);
  else set.add(questionId);
  const arr = Array.from(set);
  write(KEYS.wrongIds, arr);
  return arr;
}

export function addWrongId(questionId: string): void {
  const set = new Set(getWrongIds());
  set.add(questionId);
  write(KEYS.wrongIds, Array.from(set));
}

// —— 设置 ——
export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(KEYS.settings, {}) };
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch };
  write(KEYS.settings, next);
  return next;
}

// —— 清空数据 ——
export function clearAllData(): void {
  for (const k of Object.values(KEYS)) {
    localStorage.removeItem(k);
  }
}

export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
