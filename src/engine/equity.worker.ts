// 蒙特卡洛胜率计算 Web Worker
// 在后台线程执行模拟，避免阻塞 UI（满足性能需求：计算不卡顿）。

import { simulateEquity, type EquityInput, type EquityResult } from './equity';
import type { Card } from './cards';

export interface EquityRequest {
  id: number;
  hole: Card[];
  board: Card[];
  opponents: number;
  iterations?: number;
}

export interface EquityResponse {
  id: number;
  result?: EquityResult;
  error?: string;
}

self.onmessage = (e: MessageEvent<EquityRequest>) => {
  const { id, hole, board, opponents, iterations } = e.data;
  try {
    const input: EquityInput = { hole, board, opponents, iterations };
    const result = simulateEquity(input);
    const res: EquityResponse = { id, result };
    (self as unknown as Worker).postMessage(res);
  } catch (err) {
    const res: EquityResponse = {
      id,
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(res);
  }
};
