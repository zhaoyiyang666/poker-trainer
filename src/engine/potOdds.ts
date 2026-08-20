// 底池赔率计算算法
// 提供底池赔率、跟注性价比、所需胜率阈值等，用于对局点评与刷题解析。

export interface PotOddsResult {
  /** 需要跟注的筹码 */
  toCall: number;
  /** 跟注后底池总额 */
  potAfterCall: number;
  /** 底池赔率，形如 "3.0 : 1" */
  ratioLabel: string;
  /** 跟注所需的最低获胜概率（盈亏平衡点）0-1 */
  breakEvenEquity: number;
  /** 若给出当前胜率，则判断是否值得跟注 */
  worthCalling?: boolean;
  /** 期望价值（以筹码计），仅当传入 equity 时计算 */
  expectedValue?: number;
}

/**
 * @param pot 当前底池（跟注前，含对手刚下的注）
 * @param toCall 需要跟注的筹码
 * @param equity 己方当前胜率 0-1（可选）
 */
export function computePotOdds(
  pot: number,
  toCall: number,
  equity?: number
): PotOddsResult {
  const potAfterCall = pot + toCall;
  const breakEvenEquity = toCall <= 0 ? 0 : toCall / potAfterCall;
  const ratio = toCall <= 0 ? Infinity : pot / toCall;

  const result: PotOddsResult = {
    toCall,
    potAfterCall,
    ratioLabel: toCall <= 0 ? '免费' : `${ratio.toFixed(1)} : 1`,
    breakEvenEquity,
  };

  if (equity !== undefined) {
    result.worthCalling = equity >= breakEvenEquity;
    // EV(跟注) = 胜率 * 赢得底池 - 败率 * 付出跟注
    result.expectedValue = equity * pot - (1 - equity) * toCall;
  }

  return result;
}

/** 把 0-1 概率格式化为百分比文本。 */
export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}
