// 识澜·铸闻 — 大盘行情数据契约（市场概览，非个股）

export interface MarketIndex {
  /** Sina 代码，如 sh000001 */
  code: string;
  /** 指数名称，如 上证指数 */
  name: string;
  /** 当前点位 */
  current: number;
  /** 涨跌点（可正可负） */
  change: number;
  /** 涨跌幅 % */
  changePct: number;
  /** 成交量（手） */
  volume: number;
  /** 成交额（万元） */
  amount: number;
}

export interface MarketBreadth {
  /** 上涨家数 */
  up: number;
  /** 下跌家数 */
  down: number;
  /** 平盘家数 */
  flat: number;
  /** 总计 */
  total: number;
  /** 取数是否成功（失败则 available=false 并给出 note） */
  available: boolean;
  /** 不可用时说明 */
  note?: string;
}

export interface MarketSnapshot {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 时间 HH:MM:SS */
  time: string;
  indices: MarketIndex[];
  breadth: MarketBreadth;
  source: string;
}
