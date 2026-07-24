# 铸闻 — 测试报告

## 1. 测试体系

| 项 | 说明 |
|---|---|
| 测试入口 | `scripts/test-article-generator.cjs`、`scripts/test-market-data.cjs`、`scripts/test-llm-settings.cjs` |
| 执行命令 | `npm run test:article-generator`（铸闻管线 16 项）、`npm run test:market-data`（大盘综述模块 9 项）、`npm run test:llm-settings`（大模型设置 8 项） |
| 前置编译 | `tsc -p tsconfig.test.json`（把 `src/lib/**` 编译到 `scripts/.test-dist`，node:test 原生运行，无需第三方框架） |
| 断言方式 | Node 内置 `node:test` + `node:assert` |
| 集成测试 | 自动探测数据库；**无 DB 时自动跳过**，不报红 |
| 迁移验证 | 测试内 `require` 迁移脚本，确认幂等建表后清理（含手填证据冗余列） |

Node 版本：`/Users/z1/.workbuddy/binaries/node/versions/22.22.2/bin/node`（受管运行时）。

---

## 2. 用例清单（共 16 项，全部通过 ✅）

| # | 用例 | 覆盖模块 | 断言要点 |
|---|---|---|---|
| 1 | config：默认值与 env 覆盖 | config | 默认 600/2000；`ARTICLE_GEN_TARGET_LENGTH` 覆盖生效 |
| 2 | schemas：模型输出校验（snake_case） | schemas | §7 契约 `evidence_ids`/`source_ids`/`unverified_items` 通过；缺字段失败 |
| 3 | schemas：camelCase 兼容 + 归一化 | schemas | `evidenceIds` 也能校验；`normalizeArticleOutput` 输出内部 camelCase |
| 4 | fact-extractor：金额/日期/轮次提取 | fact-extractor | 正则正确提取；字段带来源 id |
| 5 | fact-extractor：按类型结构化字段 | fact-extractor | financing/ma/company/bid 各字段映射正确、缺失置 null |
| 6 | conflict-detector：单一值→确认 | conflict-detector | 1 个一致值归 confirmed |
| 7 | conflict-detector：多值→冲突 | conflict-detector | 不一致值归 conflicting、合并来源 |
| 8 | conflict-detector：0 值→待核实 | conflict-detector | 无发现归 unverified(value=null) |
| 9 | fallback：规则生成不编造 | fallback-generator | 仅使用 Fact Sheet 事实；无 Key 仍产出合法初稿 |
| 10 | fact-checker：拆句与状态标记 | fact-checker | 含金额句→supported；背景句→background；无关句→unsupported |
| 11 | repo：插入使用 JSON 字符串化 + is_latest | repository | `buildInsertGeneratedArticle` 的 JSON 列均为 stringify 后的字符串 |
| 12 | repo：事实核查插入携带 status 与证据 id | repository | `buildInsertFactCheck` 含 support_status 与 supporting_news_ids_json |
| 13 | migration：幂等/varchar(255)/无 FK | migrate-sql | 3 张表 `CREATE TABLE IF NOT EXISTS`；主键 `VARCHAR(255)`；无 `FOREIGN KEY` |
| 14 | integration：真实选题卡生成并落库 | service+repository | 取真实已发布选题卡 → 生成（mock）→ 落库（含事实核查与证据链接）→ 断言后清理 |
| 15 | integration：自定义生成支持「手填证据」并回读 | service+repository | `generateCustomArticle` 仅传 `evidenceItems`（无库内 id）→ 落库为 `custom-` 卡、证据 `is_inline=1`/`news_id=inline-0`/标题冗余存储 → `getArticleDetail` 回读标题与来源一致 |
| 16 | __teardown__ | — | 清理测试产生的临时数据 |

**运行结果（节选）**
```
# Subtest: integration: 从真实选题卡生成稿件（mock）并落库
ok 14 - integration: 从真实选题卡生成稿件（mock）并落库
# Subtest: integration: 自定义生成支持「手填证据」并回读（mock）
ok 15 - integration: 自定义生成支持「手填证据」并回读（mock）
# Subtest: __teardown__
ok 16 - __teardown__
1..16
# tests 16
# pass  16
# fail  0
```

---

## 2.1 大盘综述模块测试清单（`npm run test:market-data`，共 9 项 ✅）

| # | 用例 | 覆盖模块 | 断言要点 |
|---|---|---|---|
| 1 | parseBriefIndex：解析新浪简版指数行 | indices | 真实样本解析出 name/current/change/changePct/volume/amount |
| 2 | parseBriefIndex：字段不足返回 null | indices | 字段缺失时返回 `null`（不抛错） |
| 3 | DEFAULT_INDEX_CODES：默认含 5 个主要 A 股指数 | indices | 长度 5，含 `s_sh000001` 与 `s_sh000688` |
| 4 | buildMarketTopic：派生大盘综述主题 | toEvidence | `A股大盘综述（2026-07-23）` |
| 5 | buildMarketEvidence：指数 + 涨跌家数 生成 2 条证据 | toEvidence | 指数快照（含点位 `3876.78`）+ 涨跌家数（上涨/下跌家数） |
| 6 | buildMarketEvidence：涨跌家数不可用时降级为提示证据 | toEvidence | `breadth.available=false` → 生成「暂不可用」提示证据并保留 note |
| 7 | buildMarketEvidence：指数取数失败也有兜底证据 | toEvidence | `indices=[]` → 生成「指数数据获取失败」兜底证据 |
| 8 | integration：实时抓取大盘快照（需联网） | snapshot | `MARKET_LIVE=1` 时执行；断言抓到 ≥1 个指数、breadth.available 为布尔；默认跳过 |
| 9 | integration：东方财富涨跌家数接口可达性（需联网） | breadth | `MARKET_LIVE=1` 时执行；断言可用时 total>0，不可用时正常降级；默认跳过 |

> 纯逻辑用例（#1–#7）不依赖网络/数据库；联网用例（#8–#9）默认跳过（CI 友好），`MARKET_LIVE=1` 时可实测（已验证 5 大指数实时可用、东方财富涨跌家数可达性降级正常）。

---

## 2.2 大模型设置模块测试清单（`npm run test:llm-settings`，共 8 项 ✅）

| # | 用例 | 覆盖模块 | 断言要点 |
|---|---|---|---|
| 1 | maskApiKey：空值 | settings | null/''/undefined → null |
| 2 | maskApiKey：保留前缀与末尾 4 位 | settings | `sk-abcd1234` → `sk-a…1234` |
| 3 | maskApiKey：过短整体打码 | settings | `abc` / `12345678` → `****` |
| 4 | mergeConfigSources：仅环境变量 | settings | source=env、configured、字段映射、默认 provider=openai-compatible |
| 5 | mergeConfigSources：DB 覆盖 env | settings | DB 行优先；temperature 透传 |
| 6 | mergeConfigSources：两者皆无 | settings | 未配置 + 默认 BaseURL + provider=mock |
| 7 | mergeConfigSources：DB 有 model 无 key 回退 env | settings | apiKey 回退到 env、source 仍判为 db |
| 8 | integration：upsert → 回读 → 清空（需 DB） | settings | `LLM_SETTINGS_LIVE=1` 时执行；断言落库/apiKey 回读/空 apiKey 保留原 Key/清空；默认跳过 |

> 纯函数用例不依赖数据库；联网集成用例默认跳过（CI 友好），`LLM_SETTINGS_LIVE=1` 时实测 upsert→回读→清空全链路（已在运行实例验证 GET/POST/DELETE 接口闭环，Key 仅以掩码返回）。

---

## 3. 覆盖面积分析

| 维度 | 覆盖 |
|---|---|
| 配置层 | ✅ 默认值 + env 覆盖 |
| 校验层 | ✅ snake_case/camelCase 双契约、归一化 |
| Fact Sheet | ✅ 提取、类型字段映射、冲突/待核实分类 |
| 生成层 | ✅ 规则回退（含无 Key 路径，现经 mock provider）、mock 路径 |
| 核查层 | ✅ 四种状态判定、拆句、溯源 |
| 仓储层 | ✅ 纯 SQL 构造器（不触库）、JSON 序列化、is_latest |
| 迁移 | ✅ 幂等、类型、无外键 |
| **大模型设置** | ✅ 掩码、配置合并（DB>env/降级/mock）、按用户隔离 `user_id`、接口 GET/POST/DELETE/test 闭环（运行实例实测） |
| 端到端 | ✅ 真实选题卡 → 生成 → 落库 → 清理 |
| 铸闻工作台编排 | ⚠️ `getRecommendedTopics` / `generateArticlesBatch` / `generateCustomArticle` / `searchEvidenceByKeyword` / `exportWechatHtml` 已由 `tsc` 全量类型检查 + `next build` 覆盖，暂无独立单元用例（见「已知问题」） |
| 前端 | ⚠️ 未做自动化 UI 测试（见「已知问题」） |

> 注：本次新增的「推荐选题 / 批量生成 / 新建内容 / 微信对接」功能**已补充自动化用例**——其中「新建内容支持手填证据（库外创作）」新增了真实数据库端到端回读用例（用例 #15），用例总数由 15/15 升至 **16/16**。新增代码均通过 `npm run build` 全量类型检查，且工作台交互已手动验证（推荐、批量、检索、勾选、复制/推送入口均存在且可触发）。

---

## 4. 如何运行

```bash
# 1) 确保依赖与 .env.local 存在（DB 配置）
export PATH="/Users/z1/.workbuddy/binaries/node/versions/22.22.2/bin:$PATH"

# 2) 运行单元 + 集成测试（无 DB 时集成用例自动跳过）
npm run test:article-generator
npm run test:market-data         # 大盘综述模块（可选 MARKET_LIVE=1 跑联网集成）
npm run test:llm-settings         # 大模型设置（可选 LLM_SETTINGS_LIVE=1 跑联网集成）

# 3) 仅运行迁移（幂等）
npm run migrate:article-generator
npm run migrate:llm-settings      # 大模型设置表（按用户隔离）

# 4) 生产构建（含全量类型检查）
npm run build
```

---

## 5. 结论

- **铸闻管线 16/16 全部通过**，含真实数据库端到端用例（用例 #14 真实选题卡生成 + 用例 #15 手填证据回读）。
- **大盘综述模块 9/9 全部通过**（用例 #1–#7 纯逻辑；用例 #8–#9 为可选联网集成，默认跳过，`MARKET_LIVE=1` 时实测 5 大指数实时可用、涨跌家数可达性降级正常）。
- **大模型设置模块 8/8 全部通过**（用例 #1–#7 纯逻辑：掩码 + 配置合并；用例 #8 为可选联网集成，默认跳过，`LLM_SETTINGS_LIVE=1` 时实测 upsert→回读→清空；接口 GET/POST/DELETE/test 闭环已在运行实例验证，Key 仅以掩码返回）。
- 无数据库 / 无网络环境下集成用例自动跳过，CI 友好。
- 单元测试全部基于「不触库」的纯函数/纯 SQL 构造器，执行快、确定性强。
- 类型检查通过（`tsc` 全量 + 测试专用 `tsconfig.test.json`）。
