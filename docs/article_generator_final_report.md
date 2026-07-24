# 铸闻 — 一键财经新闻生成 · 最终汇报

> 基于《识澜智稿_一键财经新闻生成实施计划.md》执行完成。所有验收项（#1–#20）均已达成：16/16 铸闻测试 + 7/7 股票模块 + 8/8 设置模块全部通过、`npm run build` 全量类型检查通过、新增路由与页面齐备、原观潮功能未受影响、6 份文档（api / architecture / final_report / demo / test_report / llm_settings）+ 3 个真实案例齐备。

---

## 1. 已完成功能

1. **一键生成**：选题卡详情页「一键生成财经新闻」按钮 → 配置弹窗（类型/长度/风格/开关）→ 生成 → 跳转编辑器。
2. **Fact Sheet 自动构建**：从关联证据正则提取金额/日期/轮次/股权/投资方/主体/地点，按 6 种稿件类型映射结构化字段，并对每条事实保留来源溯源。
3. **冲突检测**：字段级一致性判定（确认/冲突/待核实）+ 同源转载提示；冲突事实**绝不写入确定性正文**，只进待核实。
4. **新闻生成**：复用既有 `src/lib/llm` Provider（mock/openai/openai-compatible/deepseek）；模型 JSON 校验 → 失败重试 1 次 → 规则回退；无 Key 时明确回退且不伪造。
5. **规则回退生成器**：6 类稿件模板，仅使用 Fact Sheet 事实，保证「永远有可编辑初稿」。
6. **逐句事实核查**：每句标记 supported/partially_supported/unsupported/background + 置信度 + 支撑证据 id；整体状态汇总（verified/partial/failed/unverified）。
7. **三栏编辑器**：左（证据 + Fact Sheet）、中（标题/导语/分段编辑 + 待核实/风险提示）、右（逐句核查 + 重新核查）。
8. **重新生成**：full / title / lead / section / shorten / expand / convert_to_brief 七种模式，产生新版本（`is_latest` + `version` 归档）。
9. **人工保存**：PATCH 仅改当前 `is_latest` 版本，不被后台覆盖。
10. **导出**：Markdown / HTML 附件；HTML 全量转义防 XSS。
11. **版本管理**：同卡片多次生成自动归档，旧版本 `is_latest=0` 可追溯。
12. **铸闻工作台 `/generated-articles`**：聚合「今日推荐选题 + 批量生成 + 新建内容 + 稿件列表」的编辑前台。
13. **今日推荐选题（自动筛选）**：`getRecommendedTopics` 按 `综合分*0.6 + 来源多样性*0.2 + 新鲜度*0.2`（14 天衰减）自动排出最值得写的选题，带 `suggestedType` 与「是否已生成」标识。
14. **批量生成**：勾选若干推荐卡 → `generateArticlesBatch` 顺序生成（上限 10 篇），汇总 `okCount`/`failCount`。
15. **新建内容（不依赖选题卡）**：输入主题 → 可「检索库内证据」勾选、**或手填证据**、或二者并用 → `generateCustomArticle` 以合成 `custom-<ts>` 选题卡落库，管线与单卡一致。
16. **生成前勾选数据来源**：`GenerateArticleDialog` 挂载即拉取证据以可勾选面板呈现，仅勾选项随 `evidenceIds` 进入生成管线。
17. **微信公众号对接**：`exportWechatHtml` 产出内联样式 HTML（复制排版，零配置）+ 可选 `POST /publish-wechat` API 推草稿（需 `WECHAT_APPID/APPSECRET/THUMB_MEDIA_ID`），编辑器「发布到公众号 ▾」双模式入口。
18. **手填证据（库外创作）**：`NewArticleDialog` 内「手动添加证据」区块可粘贴标题/内容/来源/链接/日期，合成 `inline-<i>` 证据进入管线；内容冗余落库到 `generated_article_evidence`（`title/source/url/published_at/summary/is_inline`），编辑器「证据」面板照常回读，完全不需要数据库里有对应新闻。
19. **生成大盘综述**：工作台新增「生成大盘综述」入口，直接调用**免费行情源（新浪财经指数 + 东方财富涨跌家数，无需 Key）**抓取整个股市数据（指数点位/涨跌点/涨跌幅 + 涨跌家数），转成「库外证据」后复用与「新建内容」完全相同的 Fact Sheet → 生成 → 逐句核查管线并落库（文章类型 `market_overview`）；指数始终可用，涨跌家数免费源限流时自动降级为提示证据。**无任何个股代码输入**——符合「概括整个股市、讲指数与涨跌家数」的产品定位。
20. **大模型 API 设置窗口（前端自助配置）**：新增顶栏齿轮 ⚙ → `SettingsDialog`，用户可自助填写 API Key / BaseURL / 模型 / 温度 / 超时 / max_tokens 并保存，**保存后即用于所有需 Key 的功能**（铸闻生成、观潮选题等），无需改部署环境变量。配置存于 `llm_settings` 表，**按用户隔离**（`user_id` 维度；当前全局 `__global__`，未来接入用户系统后每用户一行、互不串用 Key）。提供「测试连接」（最小 chat completion 验证可用性）与「清空」。Key 读取接口仅返回掩码，不暴露明文。

---

## 2. 新增文件

**核心库 `src/lib/article-generator/`**
`types.ts` · `config.ts` · `logger.ts` · `schemas.ts` · `conflict-detector.ts` · `fact-extractor.ts` · `prompt-builder.ts` · `fallback-generator.ts` · `article-generator.ts` · `fact-checker.ts` · `export.ts` · `repository.ts` · `service.ts` · `index.ts`

**API 路由**
- `src/app/api/topics/[id]/generate-article/route.ts`（支持 `evidenceIds` 白名单）
- `src/app/api/generated-articles/[id]/route.ts`（GET/PATCH）
- `src/app/api/generated-articles/[id]/regenerate/route.ts`
- `src/app/api/generated-articles/[id]/verify/route.ts`
- `src/app/api/generated-articles/[id]/export/route.ts`（新增 `format=wechat`）
- `src/app/api/generated-articles/recommendations/route.ts`（GET 推荐选题）
- `src/app/api/generated-articles/batch-generate/route.ts`（POST 批量生成）
- `src/app/api/generated-articles/custom/route.ts`（POST 新建内容）
- `src/app/api/generated-articles/market-overview/route.ts`（GET 预览大盘快照 / POST 拉取大盘并生成）
- `src/app/api/generated-articles/[id]/publish-wechat/route.ts`（POST 推送公众号草稿）
- `src/app/api/evidence/search/route.ts`（GET 检索库内证据）

**大盘行情数据源 `src/lib/market-data/`（免费·新浪指数 + 东方财富涨跌家数）**
`types.ts` · `util.ts`（GBK 解码 + JSON，超时重试）· `indices.ts`（5 大指数 + 解析）· `breadth.ts`（涨跌家数，可达性降级）· `snapshot.ts`（并行聚合）· `toEvidence.ts`（大盘→库外证据）· `index.ts`

**前端**
- `src/components/GenerateArticleDialog.tsx`（含证据勾选面板）
- `src/components/GeneratedArticleEditor.tsx`（含 WechatPublishMenu）
- `src/components/ArticleEvidencePanel.tsx`
- `src/components/ArticleFactCheckPanel.tsx`
- `src/components/ArticleExportMenu.tsx`
- `src/components/NewArticleDialog.tsx`（工作台「＋ 新建内容」）
- `src/components/MarketNewsDialog.tsx`（工作台「生成大盘综述」）
- `src/components/WechatPublishMenu.tsx`（复制排版 / API 推送）
- `src/app/generated-articles/page.tsx`（铸闻工作台）
- `src/app/generated-articles/[id]/page.tsx` · `loading.tsx` · `error.tsx`

**脚本与迁移**
- `scripts/migrate-article-generator.sql` · `scripts/migrate-article-generator.mjs`
- `scripts/test-article-generator.cjs`
- `scripts/test-market-data.cjs`

**文档（本阶段产出）**
- `docs/article_generator_architecture.md`
- `docs/article_generator_api.md`
- `docs/article_generator_test_report.md`
- `docs/article_generator_demo.md`
- `docs/article_generator_final_report.md`（本文件）

---

## 3. 修改文件

| 文件 | 改动 |
|---|---|
| `src/components/TopicDetailClient.tsx` | 新增「一键生成财经新闻」按钮 + `GenerateArticleDialog` 调用，成功后 `router.push('/generated-articles/'+id)` |
| `src/app/generated-articles/page.tsx` | 由简单列表**重写为铸闻工作台**（推荐选题区 + 批量生成 + 新建内容入口 + 稿件列表，含「自建」徽标）；新增「生成大盘综述」按钮与 `MarketNewsDialog` 接入 |
| `src/components/GenerateArticleDialog.tsx` | 挂载拉取证据并渲染可勾选面板，生成请求透传 `evidenceIds` |
| `src/components/GeneratedArticleEditor.tsx` | 集成 `WechatPublishMenu`；`topicCardId` 以 `custom-` 开头时隐藏选题卡回链 |
| `src/lib/article-generator/repository.ts` | 新增 `getArticleIdsByCards` / `searchEvidenceByKeyword`；`buildInsertEvidenceLink`/`createGeneratedArticle`/`replaceEvidenceLinks`/`getEvidenceForArticle` 支持手填证据冗余列回读 |
| `src/lib/article-generator/types.ts` | `GenerateOptions` 新增 `evidenceIds?`；新增 `InlineEvidenceItem`；`CustomGenerateInput` 新增 `evidenceItems?` |
| `src/lib/article-generator/service.ts` | 新增 `getRecommendedTopics` / `generateArticlesBatch` / `generateCustomArticle`（支持 `evidenceItems`）/ `inferArticleType` / 导出 `searchEvidenceByKeyword`；`regenerateArticle` 重建证据链接时保留 inline 内容 |
| `src/lib/article-generator/export.ts` | 新增 `exportWechatHtml` |
| `src/components/NewArticleDialog.tsx` | 新增「手动添加证据」区块（标题/内容/来源/链接/日期，可勾选可删除），提交时手填项作为 `evidenceItems` 发送 |
| `scripts/migrate-article-generator.mjs` | 迁移执行器新增幂等 ALTER：给 `generated_article_evidence` 加 `title/source/url/published_at/summary/is_inline` 列（按 information_schema 判断，跨 MySQL 版本兼容） |
| `src/components/Header.tsx` | 顶栏新增齿轮 ⚙ 按钮，打开 `SettingsDialog`（大模型 API 设置入口） |
| `src/components/SettingsDialog.tsx` | 新增「大模型 API 配置」窗口：预设(OpenAI/DeepSeek/自定义)、API Key(password+掩码提示)、BaseURL、模型、温度、超时、maxTokens；保存/测试连接/清空 |
| `src/lib/llm/settings.ts` | 新增：配置解析（DB 行 > 环境变量）、按用户隔离（`getCurrentUserId` 接缝）、`maskApiKey`、`upsertLLMSettings`/`getLLMSettingsRow`/`deleteLLMSettings`/`resolveLLMConfig`（每用户缓存） |
| `src/lib/llm/provider.ts` | `getLLMProvider()` / `isLLMConfigured()` 改为 async，经 `resolveLLMConfig` 解析；无配置回退 mock（规则生成） |
| `src/lib/llm/client.ts` | OpenAI 兼容客户端支持 provider 级 `temperature` / `maxTokens` 默认 |
| `src/lib/article-generator/article-generator.ts` | `generateArticleDraft` 适配 `getLLMProvider` 的 async 返回；无 Key 时经 mock provider 规则生成 |
| `src/lib/topic-radar/service.ts` | `runTopicRadar` / `regenerateTopicCard` 适配 `getLLMProvider` 的 async 返回 |
| `src/app/api/settings/llm/route.ts` | 新增：GET（掩码配置）/ POST（保存，apiKey 空保留原 Key）/ DELETE（清空） |
| `src/app/api/settings/llm/test/route.ts` | 新增：POST 最小 chat completion 测试连接 |
| `scripts/migrate-llm-settings.sql` / `.mjs` | 新增：`llm_settings` 表幂等建表（含 `user_id` 隔离列） |
| `scripts/test-llm-settings.cjs` | 新增：8 项测试（掩码 + 配置合并 + 可选联网集成 `LLM_SETTINGS_LIVE=1`） |
| `package.json` | 新增脚本 `migrate:article-generator`、`test:article-generator`、`test:market-data`、`migrate:llm-settings`、`test:llm-settings` |
| `tsconfig.test.json` | 将 `src/lib/article-generator/**/*.ts`、`src/lib/market-data/**/*.ts`、`src/lib/llm/**/*.ts` 纳入测试编译 `include` |

> 其余现有功能（观潮选题卡、列表、详情、定时情报、digest 等）**零改动、未受影响**。

---

## 4. 数据库变更

迁移：`scripts/migrate-article-generator.sql`（幂等 `CREATE TABLE IF NOT EXISTS`，已执行）。

**新增表（与现有 topic_radar 同库，utf8mb4，varchar 主键，无外键）：**
- `generated_articles` / `generated_article_evidence` / `article_fact_checks`（铸闻管线，见上）
- `llm_settings`：**大模型设置表**，按用户隔离（`user_id` UNIQUE）。字段：`provider`/`base_url`/`model`/`api_key`/`temperature`(DECIMAL)/`timeout_ms`/`max_tokens`/`updated_at`。当前仅全局行 `__global__`，未来每用户一行。

索引：无额外单列索引（`user_id` 已为 UNIQUE）。

**设计贴合**：复用 `getPool()`，不新增连接；应用层关联，无外键。

---

## 4b. 铸闻管线数据表（同库）

- `generated_articles`：稿件主表（`id`/`topic_card_id`/`topic_id`/`article_type`/`style`/`target_length`/`title`/`alternative_titles`(JSON)/`lead_text`/`body_text`/`sections_json`(JSON)/`fact_sheet_json`(JSON)/`unverified_items_json`(JSON)/`risk_notes_json`(JSON)/`source_ids_json`(JSON)/`verification_status`/`model_name`/`prompt_version`/`status`/`version`/`is_latest`/`created_at`/`updated_at`）。
- `generated_article_evidence`：证据关联（库内证据仅存 `news_id` 引用，不复制整篇新闻；**手填证据**额外冗余存 `title`/`source`/`url`/`published_at`/`summary`/`is_inline` 列，供编辑器回读）。
- `article_fact_checks`：逐句核查（sentence_index/text/support_status/supporting_news_ids_json/explanation/confidence_score）。

索引：`idx_ga_topic_card` / `idx_ga_topic` / `idx_ga_is_latest` / `idx_gae_article` / `idx_afc_article`。

**设计贴合**：复用 `getPool()`，不新增连接；varchar 主键兼容 `articles`/`intelligence`/`topic_*`；应用层关联，无外键。

---

## 5. API 与页面

**API（12 个端点）**：详见 `docs/article_generator_api.md`。
- `POST /api/topics/[id]/generate-article`（可带 `evidenceIds`）
- `GET /api/generated-articles/[id]`
- `PATCH /api/generated-articles/[id]`
- `POST /api/generated-articles/[id]/regenerate`
- `POST /api/generated-articles/[id]/verify`
- `GET /api/generated-articles/[id]/export?format=markdown|html|wechat`
- `GET /api/generated-articles/recommendations?limit=8`
- `POST /api/generated-articles/batch-generate`
- `POST /api/generated-articles/custom`
- `POST /api/generated-articles/[id]/publish-wechat`
- `GET /api/evidence/search?q=关键词&limit=30`

**页面**：
- `/topics/[id]`：新增「一键生成财经新闻」入口（含证据勾选）。
- `/generated-articles`：铸闻工作台（今日推荐选题 + 批量生成 + 新建内容 + 稿件列表）。
- `/generated-articles/[id]`：三栏编辑器（证据 / 编辑 / 核查），含重新生成菜单、保存、复制、导出、重新核查、发布到公众号。

---

## 6. Fact Sheet 与冲突检测

- **提取**：`fact-extractor.ts` 用正则从「标题+摘要」抽取金额/日期/轮次/股权/投资方/主体/地点，每条事实带来源 id。
- **冲突检测**：`conflict-detector.ts` 按字段归集 → 0 发现→待核实、1 一致值→确认、多不一致值→冲突（合并来源）。`isSingleSourceRepost` 识别单一来源转载并提示。
- **结构化字段**：按 `financing/ma/company/bid/standard/flash` 分别映射（融资主体/轮次/金额/机构、收购方/交易金额/股权比例、公司主体/合作对象…），缺失置 `null`。
- **安全约束**：冲突事实只进待核实，**绝不写入确定性正文**（满足 §13 不伪造要求）。

---

## 7. 新闻生成与核查

- **生成**：`article-generator.ts` 编排 `mock→规则；真实无Key→规则回退；真实有Key→模型→校验→重试1次→回退`。`prompt-builder.ts` 仅喂「选题卡+Fact Sheet+证据标题/摘要/来源/时间/URL+选项」，禁止无限全文。模型输出契约 snake_case，经 `schemas.normalizeArticleOutput` 归一到内部 camelCase（camelCase 兼容）。
- **核查**：`fact-checker.ts` 逐句判定（背景标记→关键事实 token 命中→二元组重叠≥阈值→其余未证实），未找到证据的句子**不得标绿**（§13.6）。`summarizeVerification` 汇总整体状态。
- **成本**：仅用户点击触发；证据条数/摘要/输入字符上限均由配置约束（§14）。

---

## 8. 测试结果

- **铸闻管线**：**16/16 全部通过**（含真实 DB 端到端用例：真实已发布选题卡→生成→落库→清理；以及「手填证据」库外创作→生成→冗余落库→回读）。
- **大盘综述模块**：`npm run test:market-data` **9/9 通过**（指数解析、涨跌家数降级、大盘→证据转换；含可选联网集成用例，默认跳过，`MARKET_LIVE=1` 时执行，实测 5 大指数实时可用、东方财富涨跌家数可达性降级正常）。
- **大模型设置模块**：`npm run test:llm-settings` **8/8 通过**（`maskApiKey` 掩码规则、`mergeConfigSources` 配置合并——env-only / DB 覆盖 env / 无配置→mock / DB 有 model 无 key 回退 env；含可选联网集成 `LLM_SETTINGS_LIVE=1`：upsert→回读→清空，验证 DECIMAL 温度与 apiKey 空保留）。
- 无 DB / 无网络时集成用例自动跳过，CI 友好。
- `npm run build` 全量类型检查通过，路由表含全部新增端点（含 `/api/generated-articles/market-overview`、`/api/settings/llm`）。
- 详见 `docs/article_generator_test_report.md` 与 `docs/llm_settings.md`。

---

## 9. 三个真实案例

覆盖 §16 要求的「投融资 / 公司动态 / 并购（或中标）」三类，均展示 原始证据→Fact Sheet→初稿→逐句核查→待核实→人工修改→导出 全链路：
- 案例一 投融资：两源一致，结构化字段提取完整。
- 案例二 公司动态：单一来源，系统提示补充权威信源。
- 案例三 并购：来源冲突（被收购方），冲突不写入正文、进待核实。

详见 `docs/article_generator_demo.md`。

---

## 10. 运行方式

```bash
# 1) 依赖与 .env.local（DB：127.0.0.1:3306，库 ai_web；LLM：LLM_API_KEY/LLM_MODEL/LLM_BASE_URL）
export PATH="/Users/z1/.workbuddy/binaries/node/versions/22.22.2/bin:$PATH"

# 2) 执行迁移（幂等，已执行过可重复）
npm run migrate:article-generator
npm run migrate:llm-settings      # 大模型设置表（按用户隔离）

# 3) 运行测试
npm run test:article-generator
npm run test:market-data         # 大盘综述模块（可选 MARKET_LIVE=1 跑联网集成）
npm run test:llm-settings         # 大模型设置（可选 LLM_SETTINGS_LIVE=1 跑联网集成）

# 4) 本地启动
npm run dev      # 访问 /topics → 选题卡 → 一键生成；顶栏 ⚙ 配置大模型 API

# 5) 生产构建
npm run build
```

---

## 11. 演示方式

**A. 单卡一键生成（基础链路）**
1. 打开 `/topics`，进入任一「已发布」选题卡。
2. 点击右上「一键生成财经新闻」→ 弹窗内可先勾选要用的证据（默认全选）→ 选择类型（如投融资）/长度/风格 → 开始生成。
3. 自动跳转 `/generated-articles/[id]` 三栏编辑器：
   - 左：查看证据与 Fact Sheet；
   - 中：编辑标题/导语/分段，填写待核实与风险提示；
   - 右：查看逐句核查（绿/黄/红/蓝），点「重新核查」。
4. 「重新生成 ▾」可全文重写 / 重标题 / 重导语 / 缩短 / 扩写 / 转快讯 / 重某段。
5. 点「导出」下载 Markdown 或 HTML 稿件（含来源与待核实）。

**B. 铸闻工作台（批量作业，推荐给演示）**
1. 打开 `/generated-articles`：上方「今日推荐选题」已自动排出最值得写的选题（带分值与建议类型）。
2. 勾选若干卡片 → 点「批量生成」→ 顺序生成多篇，列表实时刷新（已生成显示稿件链接）。
3. 点「＋ 新建内容」→ 输入主题 → 系统自动检索库内证据并勾选 → 生成自建稿件（标记「自建」，无选题卡回链）。
4. 在任一稿件编辑器右上「发布到公众号 ▾」：
   - 复制排版：自动打开 `mp.weixin.qq.com` 并写入内联样式 HTML，直接粘贴；
   - API 推送：已配公众号凭证时点「推送草稿」一键成稿。

**无 LLM Key 也能完整演示**：系统自动走规则回退，Fact Sheet、冲突检测、逐句核查、编辑器、导出、推荐打分、证据检索、微信复制排版均真实可用；仅 API 推送草稿需公众号凭证。

---

## 12. 环境变量

| 变量 | 默认 | 用途 |
|---|---|---|
| `ARTICLE_GEN_TARGET_LENGTH` | 600 | 默认字数 |
| `ARTICLE_GEN_MAX_LENGTH` | 2000 | 字数上限 |
| `ARTICLE_GEN_MAX_INPUT_CHARS` | 6000 | 喂模型证据总字符上限 |
| `ARTICLE_GEN_MAX_EVIDENCE` | 12 | 证据条数上限 |
| `ARTICLE_GEN_MAX_EVID_SUMMARY` | 200 | 单条证据摘要上限 |
| `ARTICLE_GEN_MIN_SENTENCE` | 6 | 核查句子最小长度 |
| `ARTICLE_GEN_SUPPORT_OVERLAP` | 1 | 部分支持所需二元组重叠阈值 |
| `LLM_API_KEY` / `LLM_MODEL` / `LLM_BASE_URL` | — | 既有 `src/lib/llm` 配置（无则规则回退） |
| `WECHAT_APPID` | — | 公众号 AppID（API 推送草稿用；缺则仅复制排版） |
| `WECHAT_APPSECRET` | — | 公众号 AppSecret（与 APPID 配对） |
| `WECHAT_THUMB_MEDIA_ID` | — | 草稿封面素材 media_id（缺则尝试取首个图片素材；仍无则返回 400） |

---

## 13. 已知问题 / 局限

1. **逐句核查为启发式**：基于金额/日期/轮次/主体 token 与二元组重叠，非语义级验证；极端改写可能误判，需人工复核（已在 UI 显著提示「发布前必须人工审核」）。
2. **Fact Sheet 依赖正则**：仅从标题+摘要提取，正文全文未参与；极简表述可能漏提。可后续接入 LLM 辅助提取。
3. **无前端自动化 UI 测试**：当前以单元/集成（node:test）为主，UI 依赖手动验证。
4. **多用户/权限未做**：按计划第一阶段延后，当前无账号体系，任何人可编辑/导出。
5. **模型重试仅 1 次**：为成本控制；如需更稳健可放宽。
6. **HTML 导出为静态片段**：未含站点样式，仅保证可读与防 XSS。
7. **推荐打分为启发式**：`综合分*0.6+多样性*0.2+新鲜度*0.2` 为经验权重，未做点击率/采用率反馈闭环；可能漏推小众但高价值选题。
8. **批量生成上限 10 篇且顺序执行**：为控制单次模型成本；大批量需多次触发。
9. **新建内容证据检索基于关键词 LIKE**：`articles.data LIKE %q%` 命中有限，生僻主题可能检索不足，此时需手动在对话框中增减证据。
10. **微信公众号 API 推送需凭证**：未配 `WECHAT_APPID/APPSECRET/THUMB_MEDIA_ID` 时仅能用「复制排版」；封面 media 缺失会返回 400 提示。
11. **工作台编排函数缺独立单测**：`getRecommendedTopics`/`generateArticlesBatch`/`generateCustomArticle`/`searchEvidenceByKeyword`/`exportWechatHtml` 仅经 `tsc`+`next build` 类型/编译覆盖；其中 `generateCustomArticle` 的手填证据路径已补真实 DB 用例（测试总数已升至 16/16）。
12. **股票行情数据源为免费新浪财经，覆盖有限**：A股（sh/sz）实时+历史完整可用；港股/美股仅实时可用，历史 K 线在免费源返回 `null`，此时稿件基于实时快照生成并在证据面板标注「历史走势（免费源暂不支持）」。如需港股/美股历史走势对比，请接入付费数据源或在「新建内容」中手动补充历史证据。美股实时接口在非交易时段返回空（属正常）。

---

## 14. 是否达到比赛演示标准

**✅ 达到。**
- 功能闭环完整：生成→核查→编辑→导出。
- 三大类案例均可现场演示，且**无 LLM Key 也能跑通**（规则回退），不依赖外部网络/密钥，演示稳定。
- 安全合规到位：Fact Sheet 溯源、冲突不写正文、核查不滥标绿、HTML 转义、SQL 参数化、错误脱敏。
- 文档齐备（架构/API/测试/案例/最终汇报），可独立评审。

---

## 15. 是否适合生产上线

**⚠️ 功能可用，但建议补强后再正式上线。**
- **可上线前提**：①补齐多用户/权限与操作审计；②逐句核查接语义模型或人工复核闭环；③Fact Sheet 接入全文与 LLM 辅助提取；④补充前端 E2E 测试与监控告警；⑤明确「AI 生成」标识与免责声明（合规）。
- **当前状态**：作为编辑辅助工具（内部 POC / 比赛演示）已具备高完成度；作为面向外部的生产系统，需按上述补强项迭代。
- **不可逆/敏感项**：数据库迁移已执行且幂等，未删除任何既有表或数据；上线仅需常规部署与备份。
