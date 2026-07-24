# 铸闻 — API 接口文档

所有接口均位于 Next.js App Router `src/app/api`，`runtime=nodejs`、`force-dynamic`。
正文均使用 JSON；错误返回 `{ "error": "..." }`。

---

## 1. POST `/api/topics/[id]/generate-article`

从选题卡 `[id]` 一键生成新闻初稿并落库。

**请求体**
```json
{
  "articleType": "financing_news",      // 必填，见下枚举
  "targetLength": 600,                  // 选填，100–2000，默认 600
  "style": "financial_media",           // 选填，默认 financial_media
  "includeBackground": true,            // 选填，默认 true
  "includeRiskNotes": true,             // 选填，默认 true
  "includeAlternativeTitles": true,     // 选填，默认 true
  "includeLead": true,                  // 选填，默认 true
  "includeSource": true                 // 选填，默认 true
}
```

**articleType 枚举**：`flash_news`(财经快讯) / `standard_news`(标准财经新闻) / `financing_news`(投融资) / `ma_news`(并购) / `company_news`(公司动态) / `bid_news`(中标与签约)。

**style 枚举**：`objective`(客观新闻体) / `financial_media`(财经媒体体) / `guangzhou_local`(广州本地媒体体) / `investment_brief`(投资研究简报体)。

**成功响应 (200)**
```json
{
  "id": "ga-9f3c...",
  "source": "mock | rule-fallback | llm",
  "modelName": "mock-model | rule-fallback | deepseek-chat",
  "version": 1,
  "verificationStatus": "unverified | partial | verified | failed"
}
```

**错误响应**
- `400`：`{ "error": "invalid articleType: ..." }` 或 `{ "error": "topic card not found" }` 或 `{ "error": "no evidence linked to this topic" }`
- `500`：未预期异常。

---

## 2. GET `/api/generated-articles/[id]`

读取稿件详情（含证据与逐句核查）。

**成功响应 (200)**
```json
{
  "article": { /* GeneratedArticleRecord 全字段 */ },
  "evidence": [ { "id": "...", "title": "...", "url": "...", "source": "...", "publishedAt": "...", "summary": "..." } ],
  "factChecks": [ { "sentenceIndex": 0, "sentenceText": "...", "supportStatus": "supported", "supportingNewsIds": ["..."], "explanation": "...", "confidenceScore": 90 } ]
}
```

**错误**：`404` `not found`；`500` 异常。

---

## 3. PATCH `/api/generated-articles/[id]`

保存人工修改。**仅修改当前 `is_latest` 版本**，不被后台自动覆盖。

**请求体（全部选填）**
```json
{
  "title": "编辑后的标题",
  "alternativeTitles": ["标题1", "标题2"],
  "leadText": "编辑后的导语",
  "bodyText": "编辑后的全文",
  "sections": [ { "heading": "小标题", "content": "正文", "evidenceIds": ["news_id"] } ],
  "unverifiedItems": ["待核实事项1"],
  "riskNotes": ["风险提示1"],
  "status": "draft | published"
}
```

**成功响应 (200)**：`{ "ok": true }`
**错误**：`400`（保存失败）/ `500`（异常）。

---

## 4. POST `/api/generated-articles/[id]/regenerate`

基于当前稿件重新生成（产生新版本）。

**请求体**
```json
{
  "mode": "full | title | lead | section | shorten | expand | convert_to_brief",
  "sectionIndex": 0,        // 仅 section 模式需要
  "targetLength": 600       // 仅 shorten/expand 用
}
```
- `convert_to_brief` 会强制 `articleType=flash_news`。

**成功响应 (200)**：同「生成」接口（`id`/`source`/`modelName`/`version`/`verificationStatus`）。
**错误**：`400` `invalid mode: ...`；`500` 异常。

---

## 5. POST `/api/generated-articles/[id]/verify`

对当前稿件正文重新执行逐句事实核查（覆盖旧核查结果）。

**请求体**：无。

**成功响应 (200)**
```json
{
  "ok": true,
  "status": "verified | partial | failed | unverified",
  "factChecks": [ /* FactCheckItem[] */ ]
}
```

**错误**：`400` `article not found`；`500` 异常。

---

## 6. GET `/api/generated-articles/[id]/export`

导出稿件为 Markdown 或 HTML 附件（含来源与待核实/风险提示）。

**查询参数**：`?format=markdown`（默认）| `?format=html` | `?format=wechat`

- `format=markdown`：`Content-Type: text/markdown`，`Content-Disposition: attachment; filename="article-<id>.md"`
- `format=html`：`Content-Type: text/html`，HTML 已对所有动态文本转义（防 XSS）。
- `format=wechat`：`Content-Type: application/json`，返回**微信公众号兼容的内联样式 HTML 片段**（无 `<html>/<head>`），便于直接粘入公众号后台；响应体为
  ```json
  { "title": "稿件标题", "digest": "导语摘要(≤120字)", "html": "<section>…内联样式正文…</section>" }
  ```
  正文含绿色(#07c160)小标题、待核实、来源、AI 生成声明四个区块，所有动态文本已转义。

**错误**：`404` `not found`；`500` 异常。

---

## 7. GET `/api/generated-articles/recommendations`

铸闻工作台「今日推荐选题」——按分值自动筛出最值得写的选题卡，供一键批量生成。

**查询参数**：`?limit=8`（选填，默认 8，上限 20）

**成功响应 (200)**
```json
{
  "topics": [
    {
      "cardId": "tc-xxxx",
      "topicId": "tp-xxxx",
      "title": "选题卡标题",
      "reason": "系统建议理由",
      "totalScore": 0.82,
      "articleId": "ga-xxxx | null",   // 已生成稿件 id（无则为 null）
      "suggestedType": "financing_news", // 依据内容推断的稿件类型
      "status": "pending | generated | published"
    }
  ]
}
```

**打分模型**：`total = total*0.6 + diversity*0.2 + freshness*0.2`
- `total`：选题卡自身综合分（来自观潮聚类）。
- `diversity`：证据来源去重比例（来源越分散越高）。
- `freshness`：14 天内线性衰减（越新越高）。
- 过滤 `status='rejected'` 的卡片；按分值降序取前 `limit`。

**错误**：`500` 异常。

---

## 8. POST `/api/generated-articles/batch-generate`

对推荐选题批量一键生成（顺序执行，便于成本控制；最多 10 篇）。

**请求体**
```json
{
  "cardIds": ["tc-xxxx", "tc-yyyy"],   // 必填，1–10 个
  "articleType": "financing_news",      // 选填，缺省时每篇用各自 suggestedType
  "targetLength": 600,                  // 选填
  "style": "financial_media"            // 选填
}
```

**成功响应 (200)**
```json
{
  "okCount": 2,
  "failCount": 0,
  "results": [
    { "cardId": "tc-xxxx", "articleId": "ga-xxxx", "source": "llm", "modelName": "deepseek-chat", "ok": true },
    { "cardId": "tc-yyyy", "articleId": "ga-yyyy", "source": "rule-fallback", "ok": true }
  ]
}
```

**错误**：`400` `{ "error": "cardIds required (1-10)" }`；`500` 异常。

---

## 9. POST `/api/generated-articles/custom`

「新建内容」——不依赖既有选题卡，自由创作。**证据来源两种、可并用**：①库内检索勾选的 `evidenceIds`；②用户**手填**的 `evidenceItems`（完全脱离数据库，粘贴手上的材料即可）。二者至少提供其一。

**请求体**
```json
{
  "topic": "请用库内证据写一篇关于 XX 公司融资的报道",  // 必填，主题/指令
  "evidenceIds": ["news-id-1", "news-id-2"],            // 选填，库内勾选的证据 id
  "evidenceItems": [                                    // 选填，用户手填证据（不来自数据库）
    { "title": "某司完成1亿元A轮融资",                    // 标题（与 content 至少其一）
      "content": "由X资本领投，资金用于研发",             // 正文/摘要，Fact Sheet 提取主料
      "source": "手填来源",                               // 选填，缺省标记「用户手填」
      "url": "https://...",                              // 选填
      "publishedAt": "2026-07-20" },                     // 选填
  ],
  "articleType": "financing_news",                      // 选填，缺省按内容推断
  "targetLength": 600,                                  // 选填
  "style": "financial_media",                           // 选填
  "includeBackground": true,
  "includeRiskNotes": true,
  "includeAlternativeTitles": true,
  "includeLead": true,
  "includeSource": true
}
```

> 手填证据以合成 `inline-<i>` 的 news_id 进入管线，内容**冗余落库**到 `generated_article_evidence` 的 `title/source/url/published_at/summary/is_inline` 列，编辑器回读时不依赖 `articles`/`intelligence`，因此「证据」面板照样能显示手填内容。

**成功响应 (200)**
```json
{ "id": "ga-xxxx", "source": "llm | rule-fallback", "modelName": "...", "verificationStatus": "..." }
```
> 稿件以合成 `custom-<timestamp>` 的 `topicCardId`/`topicId` 落库（表无外键，安全），编辑器据此隐藏「选题卡」回链。

**错误**：`400` `{ "error": "topic required" }` 或 `{ "error": "请至少提供一条证据（库内勾选或手填）" }`；`500` 异常。

---

## 9.1 POST `/api/generated-articles/market-overview`（生成大盘综述）

直接调用**免费行情源（新浪财经指数 + 东方财富涨跌家数，无需 Key）**抓取全市场数据，转成「库外证据」后走与「新建内容」**完全相同的** Fact Sheet → 生成 → 逐句核查管线；稿件类型为「大盘综述」（`market_overview`）。证据以 `inline-<i>` 冗余落库，编辑器证据面板可见大盘来源。

**请求体**
```json
{
  "targetLength": 600,           // 选填：目标字数（100–maxTargetLength，默认取配置 defaultTargetLength）
  "style": "financial_media"     // 选填：objective | financial_media | guangzhou_local | investment_brief（默认 financial_media）
}
```
> 主题与证据由后端自动生成：主题为「A股大盘综述（日期）」（`buildMarketTopic`），证据为 `getMarketSnapshot()` 的指数快照 + 涨跌家数（`buildMarketEvidence`）。**无需任何个股代码输入**——本接口只产出概括整个股市的内容。

**数据流**
1. `getMarketSnapshot()` 并行拉取：①新浪简要指数行情（`getMarketIndices`，GBK 解码，5 大指数 `DEFAULT_INDEX_CODES` = 上证指数/深证成指/创业板指/沪深300/科创50）；②东方财富涨跌家数（`getMarketBreadth`）。
2. `buildMarketEvidence(snap)` 生成证据：①指数快照（点位/涨跌点/涨跌幅）；②涨跌家数（上涨/下跌/平盘家数）。东方财富不可达时 `breadth.available=false` → 自动降级为「涨跌家数暂不可用」提示证据，稿件仍基于指数快照生成。
3. 调用 `generateCustomArticle({ topic, evidenceItems, options:{articleType:'market_overview', ...} })` 进入铸闻管线并落库（合成 `custom-<hash>` 选题卡）。

**GET 预览**（不消耗模型调用，供前端展示大盘快照）：`GET /api/generated-articles/market-overview` → `{ ok, date, time, topic, indices:[{code,name,price,change,changePct,volume,amount}], breadth:{available,up,down,flat,note} }`。

**成功响应 (200)**
```json
{ "id": "ga-xxxx", "source": "llm | rule-fallback", "modelName": "...", "verificationStatus": "..." }
```

**错误**
- `400`：`{ "error": "..." }`（`generateCustomArticle` 的错误，如证据为空）。
- `502`：`{ "error": "..." }`（大盘数据抓取失败，行情源不可达）。
- `500` 异常。

> **产品定位说明**：本接口只讲「指数 + 涨跌家数」的大盘维度，符合「自动生成概括整个股市的财经新闻、不针对个股」的定位。如需个股维度，请走「新建内容 + 检索证据」或接入付费个股数据源。

---

## 10. GET `/api/evidence/search`

「新建内容」对话框中按关键词检索库内可用证据（articles + intelligence）。

**查询参数**：`?q=融资关键词&limit=30`（默认 30，上限 50）

**成功响应 (200)**
```json
{
  "evidence": [
    { "id": "news-id", "title": "...", "url": "...", "source": "来源名", "publishedAt": "2026-07-01", "summary": "..." }
  ]
}
```
> 检索顺序：`articles.data LIKE %q%` 优先，不足时补 `intelligence.data`，按 `published_at` 倒序，最多 `limit` 条。

**错误**：`500` 异常。

---

## 11. POST `/api/generated-articles/[id]/publish-wechat`

将稿件推送为微信公众号草稿（需配置 `WECHAT_APPID`/`WECHAT_APPSECRET`/`WECHAT_THUMB_MEDIA_ID`）。

**请求体**：无。

**成功响应 (200)**
```json
{ "ok": true, "mediaId": "media_id_xxx", "message": "draft added" }
```

**错误**
- `501`：`{ "error": "WECHAT_APPID / WECHAT_APPSECRET not configured" }`（未配凭证，请用「复制排版」方式）。
- `400`：`{ "error": "thumb media not found, set WECHAT_THUMB_MEDIA_ID or upload an image material" }`。
- `500`：获取 `access_token` 或推送草稿失败（含微信返回的错误码）。

> 另提供**零配置**「复制排版」：前端 `WechatPublishMenu` 取 `/export?format=wechat` 的 HTML，写入剪贴板（text/html + text/plain）并打开 `mp.weixin.qq.com`。

---

## 12. 证据白名单（生成前勾选数据来源）

`GenerateArticleDialog` 在挂载时拉取该选题卡证据，以可勾选折叠面板呈现，生成时仅使用勾选项：

- 请求 `POST /api/topics/[id]/generate-article` 时，在请求体追加：
  ```json
  { "evidenceIds": ["news-id-1", "news-id-3"] }
  ```
- **全部勾选时省略该字段**（行为同全量）；仅部分勾选时携带，service 层据此过滤 `rawEvidence`。
- `evidenceIds` 亦被 `generateArticle` 的 `GenerateOptions` 支持（见 `types.ts`），自定义新建与批量生成可复用同一过滤逻辑。

---

## 13. 铸闻工作台页面 `/generated-articles`

聚合「推荐选题 + 批量生成 + 新建内容 + 稿件列表」的编辑前台：

- **今日推荐选题**：调用 §7 拉取推荐，支持勾选若干卡片后「批量生成」或单篇「生成」。
- **＋ 新建内容**：打开 `NewArticleDialog`（§9/§10 流程：输入主题 → 检索证据 → 勾选 → 生成）。
- **生成大盘综述**：打开 `MarketNewsDialog`（§9.1 流程：点「生成大盘综述」→ `GET /market-overview` 预览指数/涨跌家数 → 选风格/长度 → `POST /market-overview` 拉取大盘并生成）。
- **稿件列表**：展示全部稿件；`topicCardId` 以 `custom-` 开头的标记为「自建」且隐藏选题卡回链；每行提供「发布到公众号 ▾」(`WechatPublishMenu`)。

---

## 14. 前端调用入口

| 页面/组件 | 调用接口 |
|---|---|
| `GenerateArticleDialog` | 挂载拉 `GET /api/topics/[id]` 证据；POST `/api/topics/[id]/generate-article`（可带 `evidenceIds`）→ 成功后 `router.push('/generated-articles/'+id)` |
| `GeneratedArticleEditor` | GET / PATCH `/api/generated-articles/[id]`、POST `/regenerate`、POST `/verify`；`WechatPublishMenu` → GET `/export?format=wechat`、POST `/publish-wechat` |
| `ArticleExportMenu` | GET `/export?format=markdown|html|wechat` |
| `generated-articles/page.tsx`（铸闻工作台） | GET `/api/generated-articles/recommendations`；POST `/batch-generate`；`NewArticleDialog` → GET `/evidence/search`、POST `/custom`；`MarketNewsDialog` → GET/POST `/api/generated-articles/market-overview` |
| `NewArticleDialog` | GET `/api/evidence/search`；POST `/api/generated-articles/custom` |
| `MarketNewsDialog` | GET `/api/generated-articles/market-overview`（预览）；POST `/api/generated-articles/market-overview`（生成） |
| `WechatPublishMenu` | 复制：`GET /export?format=wechat`；推送：`POST /publish-wechat` |
| `Header`（顶栏齿轮 ⚙） | `SettingsDialog` → GET/POST/DELETE `/api/settings/llm`、POST `/api/settings/llm/test` |
| `SettingsDialog`（大模型 API 设置窗口） | GET `/api/settings/llm`（回填）；POST（保存）；DELETE（清空）；POST `/api/settings/llm/test`（测试连接） |

---

## 15. 大模型设置 API `/api/settings/llm`（前端「设置」窗口）

> 所有「需要 API Key 的功能」（铸闻生成、观潮选题等）的大模型参数，改由前端「设置」窗口配置，保存进数据库 `llm_settings` 表，**不再要求部署时改环境变量**（环境变量仍作为兜底）。按用户隔离：当前无用户系统 → 统一为全局行 `__global__`；未来接入用户系统后，每个用户各占一行，互不串用 Key。

### 15.1 GET `/api/settings/llm`
返回当前用户（当前为全局）的配置。**Key 仅以掩码形式返回，绝不暴露明文。**
```json
{ "configured": true, "source": "db", "provider": "openai-compatible",
  "storedProvider": "deepseek", "model": "deepseek-chat",
  "baseUrl": "https://api.deepseek.com/v1", "temperature": 0.3,
  "timeoutMs": 30000, "maxTokens": 2000, "apiKeySet": true, "apiKeyMasked": "sk-d…5678" }
```
- `configured`：是否具备调用真实模型的条件（有 Key 且有 Model）。
- `source`：`db`（来自本窗口保存）/ `env`（来自环境变量）/ `none`（两者皆无 → 生成走规则回退）。
- `provider`：解析后的实际 provider（`openai-compatible` 或 `mock`）；`storedProvider`：窗口保存时选择的预设（openai/deepseek/custom）。

### 15.2 POST `/api/settings/llm`
保存/更新当前用户配置。
```jsonc
// 请求体（均可选；apiKey 留空表示保留原 Key）
{ "provider": "deepseek", "baseUrl": "https://api.deepseek.com/v1",
  "model": "deepseek-chat", "apiKey": "sk-xxxx", "temperature": 0.3,
  "timeoutMs": 30000, "maxTokens": 2000 }
```
- 成功：`{ "ok": true, "configured": true, "source": "db", "provider": "deepseek", "model": "...", "apiKeySet": true, "apiKeyMasked": "sk-…xxxx" }`
- `apiKey` 为空字符串时**保留原密钥**（便于只改温度/模型而不必重填 Key）。
- 错误：`400`（非法 JSON）/ `500`（保存失败，如数据库未连接）。

### 15.3 DELETE `/api/settings/llm`
清空当前用户配置，回到环境变量 / 默认（无 Key → 生成走规则回退）。返回 `{ "ok": true }`。

### 15.4 POST `/api/settings/llm/test`（测试连接）
用「提交值优先、缺 Key 时回退到已保存配置」做一次最小 chat completion，验证 Key/BaseURL/模型可用。始终返回 `200`（`ok:true` 或 `ok:false + error`），便于前端直接读取。
```jsonc
// 请求体（均可选；缺 apiKey 时自动用已保存的）
{ "provider": "deepseek", "baseUrl": "https://api.deepseek.com/v1", "model": "deepseek-chat", "apiKey": "sk-xxxx" }
// 成功：{ "ok": true, "model": "deepseek-chat", "provider": "openai-compatible", "sample": "连接正常。" }
// 失败：{ "ok": false, "error": "LLM HTTP 401: ..." }
```

### 15.5 解析优先级与隔离
- 解析：`llm_settings` 中当前用户的行 > 环境变量（`LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL`）。无配置 → `getLLMProvider()` 回退到 mock（规则生成，不调用真实模型、不伪造）。
- 隔离：全代码唯一需要改动以接入真实用户系统的地方是 `src/lib/llm/settings.ts` 的 `getCurrentUserId()`（当前返回 `'__global__'`，未来改为从会话读取登录用户 ID 即可）。

---

## 16. 数据契约要点（见 `types.ts`）

- `SupportStatus`：`supported`(绿/有证据) · `partially_supported`(黄/部分重叠) · `unsupported`(红/未证实) · `background`(蓝/背景性)。
- `VerificationStatus`（整体）：`unverified` / `partial` / `verified` / `failed`；由 `summarizeVerification` 按逐句结果汇总。
- 模型输出契约为 snake_case（`evidence_ids`/`source_ids`/`unverified_items`/`risk_notes`/`article_type`/`style`），`schemas.normalizeArticleOutput` 统一归一到内部 camelCase，camelCase 亦兼容。
