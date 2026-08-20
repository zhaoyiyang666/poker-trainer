// 蒙特卡洛胜率模拟算法
// 对未知未发牌进行随机模拟，统计获胜/平分/落败概率。
// 纯函数实现，可在主线程或 Web Worker 中调用（对局结算用同步版，计算器页用 Worker）。

import type { Card } from './cards';
import { remainingDeck, shuffle } from './cards';
import { evaluateHand, compareHands } from './handEvaluator';

export interface EquityResult {
  /** 己方获胜概率 0-1 */
  win: number;
  /** 平分概率 0-1 */
  tie: number;
  /** 落败概率 0-1 */
  lose: number;
  /** 综合权益（胜 + 平分按人数折算），常用于赔率对比 */
  equity: number;
  iterations: number;
  opponents: number;
}

export interface EquityInput {
  hole: Card[]; // 己方 2 张
  board: Card[]; // 0-5 张公共牌
  opponents: number; // 对手数量 1-8
  iterations?: number; // 模拟次数
}

/**
 * 同步蒙特卡洛模拟。iterations 默认 3000，兼顾精度与性能。
 * @param rand 可注入的随机源，便于测试确定性。
 */
export function simulateEquity(
  input: EquityInput,
  rand: () => number = Math.random
): EquityResult {
  const { hole, board, opponents } = input;
  const iterations = input.iterations ?? 3000;

  if (hole.length !== 2) throw new Error('己方手牌必须为 2 张');
  if (board.length > 5) throw new Error('公共牌最多 5 张');
  if (opponents < 1) throw new Error('至少 1 名对手');

  const known = [...hole, ...board];
  const pool = remainingDeck(known);

  const needBoard = 5 - board.length;
  const needOpp = opponents * 2;
  const needTotal = needBoard + needOpp;

  if (pool.length < needTotal) {
    throw new Error('剩余牌不足以完成模拟');
  }

  let wins = 0;
  let ties = 0;
  let losses = 0;

  // 复用数组减少 GC
  const work = pool.slice();

  for (let iter = 0; iter < iterations; iter++) {
    // 部分洗牌：只需前 needTotal 张随机
    partialShuffle(work, needTotal, rand);

    let idx = 0;
    const fullBoard = board.slice();
    for (let i = 0; i < needBoard; i++) fullBoard.push(work[idx++]);

    const heroScore = evaluateHand([...hole, ...fullBoard]);

    let heroBeatsAll = true;
    let heroTiesBest = false;

    for (let o = 0; o < opponents; o++) {
      const oppHole = [work[idx++], work[idx++]];
      const oppScore = evaluateHand([...oppHole, ...fullBoard]);
      const cmp = compareHands(heroScore, oppScore);
      if (cmp < 0) {
        heroBeatsAll = false;
        heroTiesBest = false;
        break;
      } else if (cmp === 0) {
        heroTiesBest = true;
      }
    }

    if (!heroBeatsAll) {
      losses++;
    } else if (heroTiesBest) {
      ties++;
    } else {
      wins++;
    }
  }

  const win = wins / iterations;
  const tie = ties / iterations;
  const lose = losses / iterations;
  // 权益：平分时假设与并列者均分，这里简化按“胜 + 平分/2”估算综合权益
  const equity = win + tie / 2;

  return { win, tie, lose, equity, iterations, opponents };
}

/** 只把前 n 张洗成随机（Fisher–Yates 前 n 步），避免整副洗牌开销。 */
function partialShuffle<T>(arr: T[], n: number, rand: () => number): void {
  const len = arr.length;
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (len - i));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

/** 精确枚举（当未知牌较少时可选，MVP 主用蒙特卡洛，这里保留洗牌工具引用避免误删）。 */
export { shuffle };
