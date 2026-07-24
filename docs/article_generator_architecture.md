# 铸闻 — 架构设计文档

> 模块定位：在「识澜·观潮」选题雷达之上，新增「一键生成财经新闻」能力，将选题卡 + 抓取证据自动转化为可溯源、可核查、可编辑的新闻初稿，并支持人工修订与导出。

---

## 1. 整体架构

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser（编辑前台）                                                 │
│  /topics/[id]  ──「一键生成财经新闻」按钮──▶ GenerateArticleDialog   │
│  /generated-articles/[id] ── 三栏编辑器 GeneratedArticleEditor       │
│        ├─ 左：ArticleEvidencePanel（证据 + Fact Sheet）              │
│        ├─ 中：标题/导语/分段编辑 + 待核实/风险提示                   │
│        └─ 右：ArticleFactCheckPanel（逐句核查 + 重新核查）           │
└───────────────┬──────────────────────────────────────┬─────────────┘
                │ fetch                                  │ fetch
                ▼                                        ▼
┌───────────────────────────────┐      ┌───────────────────���──────────┐
│  API Routes (Next.js)          │      │  API Routes                  │
│  POST /api/topics/[id]/        │      │  GET/PATCH /api/generated-   │
│       generate-article         │      │    articles/[id]             │
│                                │      │  POST .../regenerate         │
│                                │      │  POST .../verify             │
│                                │      │  GET  .../export             │
└───────────────┬───────────────┘      └───────────────┬──────────────┘
                │                                       │
                ▼                                       ▼
┌────────────────────────────────────────────────────────────────────┐
│  Service 编排层  src/lib/article-generator/service.ts                │
│   read card → read evidence → build Fact Sheet → draft → persist     │
│   (version + is_latest archive) → auto fact-check                    │
└───────────────┬──────────────────────────────────────────────────────┘
                │ 调用
   ┌────────────┼───────────────┬───────────────┬──────────────────┐
   ▼            ▼               ▼               ▼                  ▼
fact-extractor conflict-detector article-generator fact-checker  export
 buildFactSheet detectConflicts generateDraft    checkArticle   markdown/html
   │                                 │
   │                                 ▼
   │                          prompt-builder → 复用 src/lib/llm Provider
   │                          (mock/openai/openai-compatible/deepseek)
   │                                 │ 校验失败/无Key
   │                                 ▼
   │                          fallback-generator（规则回退，不编造）
   ▼
repository.ts（复用 storage.getPool()，不建第二连接）
   ├─ generated_articles
   ├─ generated_article_evidence
   └─ article_fact_checks
                │
                ▼
        MySQL 8.4（与现有 topic_radar 同库，utf8mb4）
```

---

## 2. 目录结构（新增）

```
src/lib/article-generator/
├── types.ts              数据契约（ArticleType/Style/FactSheet/ArticleDraft/FactCheckItem…）
├── config.ts             配置层（环境变量 + 默认值，ARTICLE_TYPE_LABELS/STYLE_LABELS）
├── logger.ts             日志记录（[ARTICLE_GENERATOR] 前缀 + 统计累加）
├── schemas.ts            Fact Sheet/模型输出校验 + snake_case↔camelCase 归一化
├── conflict-detector.ts  字段级冲突检测（确认/冲突/待核实 + 同源转载判定）
├── fact-extractor.ts     从证据正则提取结构化事实 → 构建 Fact Sheet
├── prompt-builder.ts     系统/用户提示词（财经编辑守则 + 输出 JSON Schema 约束）
├── fallback-generator.ts 规则回退生成（Mock/无Key/校验失败时产出合法初稿）
├── article-generator.ts  生成编排：模型调用 → 校验 → 重试1次 → 规则回退
├── fact-checker.ts       逐句核查（supported/partially_supported/unsupported/background）
├── export.ts             Markdown / HTML 导出（HTML 转义防 XSS）
├── repository.ts         数据仓储（SQL 构造器 + 读写 + 版本归档 + 事务）
├── service.ts            管线编排（generate/get/save/regenerate/verify）
└── index.ts              统一导出

src/lib/market-data/                      大盘行情数据源（免费·新浪指数 + 东方财富涨跌家数，无需 Key）
├── types.ts              MarketIndex/MarketBreadth/MarketSnapshot
├── util.ts              fetchGbkText(GBK解码)+fetchJson，超时重试（复用 mita-search 模式）
├── indices.ts           DEFAULT_INDEX_CODES(5大指数)+parseBriefIndex+getMarketIndices（新浪简要行情）
├── breadth.ts           getMarketBreadth() 涨跌家数统计（东方财富；不可达时降级 available:false）
├── snapshot.ts          getMarketSnapshot() 并行聚合指数+涨跌家数
├── toEvidence.ts        buildMarketTopic()/buildMarketEvidence() → InlineEvidenceItem[]
└── index.ts              统一导出

src/lib/llm/settings.ts   大模型设置：解析（DB 行 > 环境变量）、按用户隔离（getCurrentUserId 接缝）、掩码、upsert/delete
src/app/api/settings/llm/route.ts                       GET 配置(掩码) / POST 保存 / DELETE 清空
src/app/api/settings/llm/test/route.ts                  POST 测试连接（最小 chat completion）

src/app/api/topics/[id]/generate-article/route.ts      POST 生成（支持 evidenceIds 白名单）
src/app/api/generated-articles/[id]/route.ts           GET 详情 / PATCH 保存
src/app/api/generated-articles/[id]/regenerate/route.ts POST 重新生成
src/app/api/generated-articles/[id]/verify/route.ts    POST 重新核查
src/app/api/generated-articles/[id]/export/route.ts    GET 导出(md/html/wechat)
src/app/api/generated-articles/recommendations/route.ts GET 推荐选题（自动打分）
src/app/api/generated-articles/batch-generate/route.ts POST 批量生成（≤10）
src/app/api/generated-articles/custom/route.ts         POST 新建内容（无选题卡）
src/app/api/generated-articles/market-overview/route.ts GET 预览大盘快照 / POST 拉取大盘并生成（免费源·新浪指数+东方财富涨跌家数）
src/app/api/generated-articles/[id]/publish-wechat/route.ts POST 推送公众号草稿
src/app/api/evidence/search/route.ts                   GET 关键词检索库内证据

src/components/GenerateArticleDialog.tsx   选题卡页「一键生成」配置弹窗（含证据勾选）
src/components/GeneratedArticleEditor.tsx  三栏编辑器页（含 WechatPublishMenu）
src/components/ArticleEvidencePanel.tsx    左栏：证据 + Fact Sheet
src/components/ArticleFactCheckPanel.tsx   右栏：逐句核查
src/components/ArticleExportMenu.tsx       导出菜单（Markdown/HTML/WeChat）
src/components/NewArticleDialog.tsx        铸闻工作台「＋ 新建内容」对话框
src/components/MarketNewsDialog.tsx         铸闻工作台「生成大盘综述」对话框（预览指数/涨跌家数→选风格长度→生成）
src/components/SettingsDialog.tsx           顶栏齿轮「⚙ 设置」打开的大模型 API 配置窗口（GET/POST/DELETE/测试连接）
src/components/WechatPublishMenu.tsx       编辑器「发布到公众号 ▾」（复制排版 / API 推送）

src/app/generated-articles/page.tsx        铸闻工作台（推荐选题 + 批量生成 + 新建 + 列表）
src/app/generated-articles/[id]/page.tsx|loading.tsx|error.tsx

scripts/migrate-article-generator.sql     幂等建表
scripts/migrate-article-generator.mjs     迁移执行脚本
scripts/migrate-llm-settings.sql           llm_settings 表幂等建表（含 user_id 隔离列）
scripts/migrate-llm-settings.mjs           迁移执行脚本
scripts/test-article-generator.cjs        16 项测试
scripts/test-market-data.cjs               9 项测试（7 离线 + 2 联网集成，MARKET_LIVE=1）
scripts/test-llm-settings.cjs             8 项测试（掩码 + 配置合并 + 可选联网集成 LLM_SETTINGS_LIVE=1）
```

复用的现有能力（不重复实现）：
- `src/lib/article-generator/repository.ts` 的 `getArticleIdsByCards(cardIds)`（批量映射卡片→最新稿件 id）、`searchEvidenceByKeyword(keyword, limit)`（库内证据检索，供自定义新建）。
- `src/lib/topic-radar/repository.ts` 的 `getLatestTopicCards`（推荐选题打分数据源）、`getTopicCardById` / `getTopicArticleLinks` / `getEvidenceByIds`。
- `src/lib/storage.ts` 的 `getPool()` —— 复用同一 MySQL 连接池，不新建第二套连接。
- `src/lib/llm/provider.ts` 的 `getLLMProvider()` / `isLLMConfigured()` —— 统一 LLM 抽象（mock/openai/openai-compatible/deepseek）。现已改为 **async**，经 `src/lib/llm/settings.ts` 的 `resolveLLMConfig(userId)` 解析配置：**数据库 `llm_settings` 中当前用户的行 > 环境变量**；无配置回退 mock（规则生成，不调用真实模型、不伪造）。
- `src/lib/llm/settings.ts` 的 `getCurrentUserId()` —— **按用户隔离的唯一接缝**：当前返回 `'__global__'`（无用户系统，统一全局配置）；未来接入用户系统后，改为从会话读取登录用户 ID 即可，其余解析/缓存/路由全部按 userId 自动隔离，**天然避免「A 用户的 Key 被 B 用户使用」**。表 `llm_settings` 以 `user_id` 为唯一维度（UNIQUE），天然支持每用户一行。
- `src/lib/llm/schema.ts` 的 `parseJsonFromModel()` —— 安全地从模型输出中解析 JSON。
- `src/lib/article-generator/service.ts` 的 `generateCustomArticle()` —— 大盘综述模块把大盘快照转成 `evidenceItems` 后直接复用，获得 Fact Sheet → 生成 → 逐句核查 → 落库 全链路，不另起炉灶。
- `src/lib/market-data/util.ts` 的 `getBuffer` 超时重试模式 —— 复用 `mita-search.ts` 的稳健做法（AbortSignal.timeout + 重试 + Referer/UA）。
- `src/lib/topic-radar/repository.ts` 的 `getTopicCardById` / `getTopicArticleLinks` / `getEvidenceByIds` —— 读取选题卡与关联证据。

---

## 3. 数据流转（核心管线）

`service.generateArticle(cardId, options)`：

1. **读选题卡**：`getTopicCardById(cardId)` → 取标题/建议理由/所属 topic。
2. **读证据**：`getTopicArticleLinks(topicId)` → `getEvidenceByIds(...)` → 映射为 `EvidenceItem[]`。无证据直接报错。
3. **构建 Fact Sheet**：`buildFactSheet(evidence, articleType, {subjectHint})` → 正则提取金额/日期/轮次/股权/投资方/主体/地点 → `detectConflicts` 分确认/冲突/待核实 → 按类型映射结构化字段。
4. **生成初稿**：`generateArticleDraft(...)`：
   - `mock` provider → 规则生成；
   - 真实 provider 且无 Key → 规则回退（明确标注，不伪造）；
   - 真实 provider 有 Key → 模型调用 → JSON 校验 → 失败重试 1 次 → 仍失败规则回退。
5. **逐句核查**：`checkArticle(bodyText, evidence, factSheet)` → 每句标记 supported/partially_supported/unsupported/background + 置信度 + 支撑证据 id。
6. **落库**：`createGeneratedArticle(record, evidenceLinks, factChecks)` —— 同一卡片旧版本 `is_latest=0`，新版本 `is_latest=1`、`version+1`，证据链接与事实核查一并写入（事务内）。

重新生成 / 保存 / 核查 / 导出各自独立路由，复用上述模块。

---

## 3.1 铸闻工作台数据流转（推荐 / 批量 / 新建 / 微信）

在 §3 单卡生成之上，`service.ts` 新增五条编排能力，统一汇聚到 `/generated-articles` 工作台：

1. **推荐选题** `getRecommendedTopics(limit)`：
   - `getLatestTopicCards()` 取全部最新卡片 → 过滤 `status='rejected'` → 对每张卡计算
     `total = card.totalScore*0.6 + sourceDiversity*0.2 + freshness*0.2`（freshness 为 14 天内线性衰减）。
   - 附带 `getArticleIdsByCards([...])` 一次性映射「已生成稿件 id」（避免 N 次查询），并按内容 `inferArticleType` 给出 `suggestedType`。
   - 降序取前 `limit` 返回。

2. **批量生成** `generateArticlesBatch(cardIds, base?, provider?)`：
   - 顺序执行（非并发，控制模型调用成本），单批上限 10 篇；每篇缺省用各自 `suggestedType`，复用 §3 的 `generateArticle` 管线。
   - 返回每篇 `{ cardId, articleId, source, ok }` 汇总 `okCount`/`failCount`。

3. **新建内容** `generateCustomArticle(input, provider?)`：
   - 证据来源两种、可并用：①`input.evidenceIds`（库内检索勾选，经 `getEvidenceByIds` 读取）；②`input.evidenceItems`（用户**手填**，不来自数据库）。二者至少其一。
   - 手填证据合成 `inline-<i>` 的 news_id，Fact Sheet 以 `content` 作为提取主料；其余 Fact Sheet → 生成 → 核查流程与 §3 完全一致。
   - 以合成 `custom-<timestamp>` 作为 `topicCardId`/`topicId` 落库（**表无外键，安全**），后续编辑器据此隐藏选题卡回链。
   - **手填证据持久化**：`createGeneratedArticle` 在写 `generated_article_evidence` 时，对 `inline-*` 链接把内容冗余写入同表新增列 `title/source/url/published_at/summary/is_inline`，使编辑器回读（`getEvidenceForArticle` 在 LEFT JOIN 不到 `articles`/`intelligence` 时回退到这些列）能看到手填内容。重新生成（`regenerateArticle`）同样按证据 id 重建链接并保留 inline 冗余列。

4. **微信公众号对接**：
   - `exportWechatHtml(article, evidence)` 产出内联样式 HTML 片段（绿色小标题 + 待核实 + 来源 + AI 声明），供「复制排版」直接粘入后台。
   - `POST /publish-wechat` 在配置 `WECHAT_APPID`/`WECHAT_APPSECRET`/`WECHAT_THUMB_MEDIA_ID` 后，获取 `access_token` → 取封面 media（环境变量指定或首个图片素材）→ `cgi-bin/draft/add` 推送草稿；缺凭证返回 `501` 引导用复制方式。

5. **生成大盘综述** `GET/POST /api/generated-articles/market-overview`：
   - `MarketNewsDialog` 点「生成大盘综述」→ `GET` 预览大盘快照（指数点位/涨跌点/涨跌幅 + 涨跌家数，不消耗模型）→ 选风格/长度 → `POST` 拉取实时大盘并生成。
   - `getMarketSnapshot()` 并行拉取：新浪简要指数行情（`getMarketIndices`，GBK 解码，5 大指数 `DEFAULT_INDEX_CODES`）+ 东方财富涨跌家数（`getMarketBreadth`，不可达时 `available:false` 降级）；`buildMarketEvidence` 把快照转成 `InlineEvidenceItem[]`（指数快照 + 涨跌家数）。
   - 直接调用 `generateCustomArticle({ topic, evidenceItems, options:{articleType:'market_overview', style:'financial_media', ...} })` 进入与「新建内容」**完全相同**的 Fact Sheet → 生成 → 核查管线，无需新增数据库表（大盘快照作为库外证据冗余落库）。
   - 数据源为**免费新浪财经指数 + 东方财富涨跌家数**（无需 Key）；全部为 A股 大盘维度，无任何个股代码输入——符合「概括整个股市、讲指数与涨跌家数」的产品定位。

---

## 4. 关键设计决策

| 决策点 | 方案 | 理由 |
|---|---|---|
| 数据库连接 | 复用 `getPool()` | 不新增第二套连接，贴合项目既有风格 |
| 主键类型 | `VARCHAR(255)` | 兼容现有 `articles`/`intelligence`/`topic_*` 的 varchar 主键，无需外键 |
| 外键 | 不使用 | 应用层关联，证据仅存 `news_id` 引用，不复制整篇新闻 |
| JSON 列 | 写入 `JSON.stringify`、读取 `parseJsonCol` | mysql2 不自动序列化对象 |
| 版本管理 | `is_latest` + `version` 归档 | 重新生成产生新版本，旧版本保留可追溯 |
| 人工修改 | PATCH 仅改当前 `is_latest` | 不被后台自动覆盖（§12.4） |
| 模型契约 | snake_case（§7），同时兼容 camelCase | `normalizeArticleOutput` 统一归一到内部 camelCase |
| 无 Key 运行 | 规则回退 + 明确标注 | 满足「Mock 无 Key 可运行」，不伪造数据 |
| 安全 | SQL 全参数化；导出 HTML 转义；错误日志脱敏（剔除密码） | 防注入 / XSS / 凭证泄露（§13） |
| 新建内容 | 合成 `custom-<ts>` 主键，无外键关联 | 不依赖既有选题卡也能落库，且不污染观潮数据 |
| 推荐打分 | 综合分0.6 + 来源多样性0.2 + 新鲜度0.2（14天衰减） | 自动挑出最值得写的选题，减少人工筛选 |
| 批量生成 | 顺序执行、上限 10 篇 | 控制模型并发成本，避免突发大量调用 |
| 微信发布 | 双模式：零配置「复制排版」+ 可选 API 推草稿（凭证门控） | 无 Key/无公众号也能用；配齐凭证可一键推送 |
| 证据白名单 | `evidenceIds` 透传 service 过滤 `rawEvidence` | 生成前可勾选「用哪些数据写」，避免无关证据污染 |
| 手填证据 | 用户粘贴标题/内容/来源，合成 `inline-<i>` 入库 | 完全脱离库内数据也能创作；内容冗余存关联表，编辑器照常回读 |
| 库外创作 | `generateCustomArticle` 同时接受 `evidenceIds` 与 `evidenceItems` | 新建内容既可搜库、也可纯手填、或二者并用 |
| 大盘综述生成 | 新浪指数(GBK)+东方财富涨跌家数（无 Key）→ `buildMarketEvidence` → `generateCustomArticle({articleType:'market_overview'})` | 一键把整个股市数据下载为铸闻证据，复用整条管线，零新表；不输入任何个股代码 |
| 行情数据源 | 新浪财经指数（无 Key）+ 东方财富涨跌家数（无 Key）；指数始终可用，涨跌家数免费源限流时 `available:false` 自动降级 | 零成本接入大盘维度；限制透明，需要个股维度时走「新建内容+检索证据」或接付费源 |

---

## 5. 降级与成本策略（§13/§14）

- 仅用户点击「生成」时触发模型调用，无后台自动跑批。
- `mock` 不产生任何外部请求，便于演示与测试。
- 真实模型失败重试 1 次后回退到规则生成，保证「永远有可编辑初稿」。
- 证据条数（`maxEvidenceCount=12`）、单条摘要上限（`maxEvidenceSummaryChars=200`）、输入总字符上限（`maxInputChars=6000`）均由配置控制，约束上下文成本。
- 逐段重生成（section/title/lead）只产出对应内容，避免整篇重算。

---

## 6. 配置项（`src/lib/article-generator/config.ts`）

所有阈值从环境变量读取，带默认值，不在代码中硬编码：

| 变量 | 默认 | 含义 |
|---|---|---|
| `ARTICLE_GEN_TARGET_LENGTH` | 600 | 默认字数 |
| `ARTICLE_GEN_MAX_LENGTH` | 2000 | 字数上限 |
| `ARTICLE_GEN_MAX_INPUT_CHARS` | 6000 | 喂给模型的证据文本总字符上限 |
| `ARTICLE_GEN_MAX_EVIDENCE` | 12 | 证据条数上限 |
| `ARTICLE_GEN_MAX_EVID_SUMMARY` | 200 | 单条证据摘要字符上限 |
| `ARTICLE_GEN_MIN_SENTENCE` | 6 | 句子最小长度（过短不计入核查） |
| `ARTICLE_GEN_SUPPORT_OVERLAP` | 1 | 逐句核查「部分支持」所需二元组重叠阈值 |

LLM 相关变量沿用既有 `src/lib/llm`：`LLM_API_KEY`、`LLM_MODEL`、`LLM_BASE_URL`（openai-compatible/deepseek 用）。
