// Worker 客户端封装：以 Promise 形式调用后台蒙特卡洛计算。
import type { Card } from './cards';
import type { EquityResult } from './equity';
import type { EquityRequest, EquityResponse } from './equity.worker';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<
  number,
  { resolve: (r: EquityResult) => void; reject: (e: Error) => void }
>();

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./equity.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<EquityResponse>) => {
      const { id, result, error } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (error) p.reject(new Error(error));
      else if (result) p.resolve(result);
    };
    worker.onerror = (e) => {
      // 广播错误给所有等待者
      for (const [, p] of pending) p.reject(new Error(e.message));
      pending.clear();
    };
  }
  return worker;
}

export function calcEquityAsync(
  hole: Card[],
  board: Card[],
  opponents: number,
  iterations = 3000
): Promise<EquityResult> {
  const w = ensureWorker();
  const id = ++seq;
  const req: EquityRequest = { id, hole, board, opponents, iterations };
  return new Promise<EquityResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage(req);
  });
}
