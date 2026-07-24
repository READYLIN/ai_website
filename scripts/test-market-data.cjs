// 识澜·铸闻 — 大盘行情模块测试
// 运行：npm run test:market-data
// 默认仅离线单测（解析 / 证据转换 / 主题）；设 MARKET_LIVE=1 时跑联网集成（实测新浪指数 + 涨跌家数）。

const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert');

const DIST = path.join(__dirname, '.test-dist');
const { parseBriefIndex, getMarketIndices, DEFAULT_INDEX_CODES } = require(path.join(DIST, 'market-data', 'indices'));
const { buildMarketEvidence, buildMarketTopic } = require(path.join(DIST, 'market-data', 'toEvidence'));
const { getMarketBreadth } = require(path.join(DIST, 'market-data', 'breadth'));
const { getMarketSnapshot } = require(path.join(DIST, 'market-data', 'snapshot'));

test('parseBriefIndex: 解析新浪简版指数行', () => {
  const idx = parseBriefIndex('s_sh000001', '上证指数,3876.7774,9.7438,0.25,5621226,102587552');
  assert.ok(idx, '应解析成功');
  assert.strictEqual(idx.code, 'sh000001');
  assert.strictEqual(idx.name, '上证指数');
  assert.strictEqual(idx.current, 3876.7774);
  assert.strictEqual(idx.change, 9.7438);
  assert.strictEqual(idx.changePct, 0.25);
  assert.strictEqual(idx.volume, 5621226);
  assert.strictEqual(idx.amount, 102587552);
});

test('parseBriefIndex: 字段不足返回 null', () => {
  assert.strictEqual(parseBriefIndex('s_sh000001', '上证指数,3876.7774'), null);
});

test('DEFAULT_INDEX_CODES: 默认含 5 个主要 A 股指数', () => {
  assert.strictEqual(DEFAULT_INDEX_CODES.length, 5);
  assert.ok(DEFAULT_INDEX_CODES.includes('s_sh000001'));
  assert.ok(DEFAULT_INDEX_CODES.includes('s_sh000688'));
});

test('buildMarketTopic: 派生大盘综述主题', () => {
  assert.strictEqual(buildMarketTopic('2026-07-23'), 'A股大盘综述（2026-07-23）');
});

test('buildMarketEvidence: 指数 + 涨跌家数 生成 2 条证据', () => {
  const snap = {
    date: '2026-07-23',
    time: '15:30:00',
    indices: [
      { code: 'sh000001', name: '上证指数', current: 3876.78, change: 9.74, changePct: 0.25, volume: 5621226, amount: 102587552 },
      { code: 'sz399006', name: '创业板指', current: 3575.52, change: 8.79, changePct: 0.25, volume: 35404880, amount: 26339716 },
    ],
    breadth: { up: 2800, down: 1900, flat: 300, total: 5000, available: true },
    source: 'test',
  };
  const items = buildMarketEvidence(snap);
  assert.strictEqual(items.length, 2);
  assert.ok(items[0].title.includes('指数快照'));
  assert.ok(items[0].content.includes('上证指数'));
  assert.ok(items[0].content.includes('3876.78'));
  assert.ok(items[1].title.includes('涨跌家数'));
  assert.ok(items[1].content.includes('上涨 2800 家'));
  assert.ok(items[1].content.includes('下跌 1900 家'));
});

test('buildMarketEvidence: 涨跌家数不可用时降级为提示证据', () => {
  const snap = {
    date: '2026-07-23',
    time: '15:30:00',
    indices: [{ code: 'sh000001', name: '上证指数', current: 3876.78, change: 9.74, changePct: 0.25, volume: 5621226, amount: 102587552 }],
    breadth: { up: 0, down: 0, flat: 0, total: 0, available: false, note: '免费源限流' },
    source: 'test',
  };
  const items = buildMarketEvidence(snap);
  assert.strictEqual(items.length, 2);
  assert.ok(items[1].title.includes('暂不可用'));
  assert.ok(items[1].content.includes('免费源限流'));
});

test('buildMarketEvidence: 指数取数失败也有兜底证据', () => {
  const snap = {
    date: '2026-07-23',
    time: '15:30:00',
    indices: [],
    breadth: { up: 0, down: 0, flat: 0, total: 0, available: false, note: 'x' },
    source: 'test',
  };
  const items = buildMarketEvidence(snap);
  assert.ok(items[0].content.includes('指数数据获取失败'));
});

if (process.env.MARKET_LIVE === '1') {
  test('integration: 实时抓取大盘快照（新浪指数 + 涨跌家数）', async () => {
    const snap = await getMarketSnapshot();
    assert.ok(Array.isArray(snap.indices), 'indices 应为数组');
    console.log(`  指数数量：${snap.indices.length}（${snap.indices.map((x) => x.name).join('、')}）`);
    assert.ok(snap.indices.length > 0, '应至少抓到 1 个指数');
    assert.ok(typeof snap.breadth.available === 'boolean', 'breadth.available 应为布尔');
    if (snap.breadth.available) {
      console.log(`  涨跌家数：上涨 ${snap.breadth.up} / 下跌 ${snap.breadth.down} / 平盘 ${snap.breadth.flat}（共 ${snap.breadth.total}）`);
      assert.ok(snap.breadth.total > 0, 'available 时 total 应 > 0');
    } else {
      console.log(`  涨跌家数暂不可用：${snap.breadth.note}`);
    }
    const items = buildMarketEvidence(snap);
    assert.ok(items.length >= 1, '应至少生成 1 条证据');
  });

  test('integration: 东方财富涨跌家数接口可达性', async () => {
    const b = await getMarketBreadth();
    assert.ok(typeof b.available === 'boolean');
    if (b.available) assert.ok(b.total > 0);
    else console.log('  （涨跌家数接口本次返回不可用，属免费源限流的正常降级）');
  });
}
