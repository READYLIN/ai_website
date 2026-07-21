# 新闻中心

统一聚合 AI 资讯、AI 论文、传媒情报与私募股权动态的 Next.js 网站。内容由定时任务自动抓取并写入 Upstash Redis；订阅者可选择 AI、传媒、私募任意组合，偏好同时保存在 Redis 和 Buttondown 标签中。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

在 `.env.local` 中配置 Upstash、Buttondown 与 `CRON_SECRET`。生产构建：

```bash
npm run build
npm start
```

## 数据与自动化

- AI 资讯：RSS 聚合、正文抓取、中文翻译，云端按月保存。
- AI 论文：arXiv、OpenAlex、Semantic Scholar，云端按月保存。
- 传媒：结构化情报历史归档 + 传媒 RSS 自动抓取；云端增量合并不覆盖旧数据，页面与邮件按事件级去重。
- 私募：仅追踪 `data/private-equity-companies-source.txt` 中的 619 家投中 × 清科合并去重机构；简称和法律主体全称均参与匹配，结构化历史与云端存量都会经过该白名单，页面与邮件按公司、业务维度、时间和事件主体去重。
- 订阅：`ai`、`media`、`private-equity` 三种偏好，Redis 与 Buttondown 双写。
- 邮件：三类简报按 Buttondown 标签 ID 严格分发；标签不存在时停止发送，手机端使用 20px 内边距和响应式字号。

更新私募名单时运行：

```bash
node scripts/update-private-equity-companies.mjs /path/to/company-list.txt
```

脚本会同步 AI_web 与 `private_equity_fund_automation/config.json`，并固定德同资本为首个机构。

Vercel 会按 `vercel.json` 每天调用：

- `01:00 UTC`：`/api/storage/sync` 抓取并同步全部云端数据。
- `03:35 UTC`：`/api/cron/digest` 生成并分栏目发送简报。

外部结构化情报脚本也可以携带 `Authorization: Bearer <CRON_SECRET>`，向 `/api/storage/sync` POST `media` 和 `privateEquity` 数组，实现同一云端入口。

## Automation 数据包

AI_web 是传媒与私募 RSS/RSSHub 的唯一采集端。automation 不再重复抓取 RSS，而是下载已经完成清洗、事件去重和云端合并的 JSON 文件：

```text
GET /api/intelligence/export?channel=media&days=90
GET /api/intelligence/export?channel=private-equity&days=30
```

返回的 v1 数据包包含 `items`、时间窗口、筛选口径和 `sourceInventory`。筛选聚焦业务、融资、投资、退出与并购，忽略纯董监高变动、股东会/董事会例行召开等治理信息。

automation 的豆包补充检索当前已关闭。传媒和私募 automation 只读取 AI_web 汇总、清洗、去重并存入云端的数据包，不再单独调用豆包。

## 安全说明

不要提交 `.env.local`、真实 API Key 或 Redis Token。可交付副本只包含 `.env.example`，线上密钥保存在 Vercel 环境变量中。
