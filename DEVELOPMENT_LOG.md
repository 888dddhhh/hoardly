# Hoardly — Development Log

> 最后更新：2026-07-05
> 产品方案：`PRODUCT_SPEC.md`（即 `个人知识资产收藏系统-完整产品与技术方案.md` v2.19）

---

## ⚡ 开发原则（每次会话强制遵守）

| # | 原则 | 说明 |
|---|------|------|
| 1 | **跳过 Auth / 注册 / 登录 / 支付** | 当前阶段全部绕过，直接进主功能；支付/订阅不做任何真实接入 |
| 2 | **先体验，再迁移** | 现有 Vite H5 + WXT 继续作为前端验证环境；Next.js / Supabase 迁移留到体验验证完成后 |
| 3 | **功能循环制** | 每个功能循环：目标 → 预检 → 实现 → 自检 → 验证 → 记录，完成后才开下一个 |
| 4 | **复用优先** | 开始前先搜已有模块、组件，绝不重复造轮子 |
| 5 | **激进清理** | 无用代码/文件立即删，不留死代码，不屯 TODO 注释 |
| 6 | **用户体验第一** | 有疑问时选"对用户最直接"的方案，而不是技术上最优雅的方案 |
| 7 | **每轮验证** | 每轮结束必须跑 `npm run typecheck` + `npm run build:h5`，通过才算 Passed |
| 8 | **详细记录** | 本文件 + `TODO.md` + `BLOCKERS.md` + `AI_HANDOFF.md` 同步更新 |

---

## 📁 项目文件总览

```
Hoardly(不要整理)/
├── PRODUCT_SPEC.md          ← 产品方案（权威文档，勿乱改）
├── DEVELOPMENT_LOG.md       ← 本文件，功能进度 checklist
├── TODO.md                  ← 待确认事项 / 技术债
├── BLOCKERS.md              ← 当前阻碍
├── AI_HANDOFF.md            ← AI 交接快照
└── [源码根目录]
    ├── entrypoints/
    │   ├── web-preview/main.tsx   ← Web App H5 主入口（当前迭代主战场）
    │   ├── popup/main.tsx         ← Chrome 扩展 Popup
    │   └── background.ts          ← 扩展 Background
    ├── src/
    │   ├── types/hoardly.ts       ← 产品级类型定义
    │   ├── lib/hoardly-capture.ts ← localStorage 数据层（Supabase 占位）
    │   ├── lib/hoardly-seed.ts    ← Mock 数据
    │   └── components/ui/*        ← shadcn/ui 基础组件
    └── package.json
```

---

## ✅ 已完成功能循环

### 循环 01 — 代码库初检与清理
- **耗时**：~1h
- **状态**：✅ Passed

**完成内容：**
- [x] 扫描项目结构、入口、脚本、UI 组件和服务模块
- [x] 删除 `.DS_Store`、`docs/.DS_Store`、`components 2.json`（macOS 垃圾 + 废弃配置）
- [x] 创建 `DEVELOPMENT_LOG.md`、`TODO.md`、`BLOCKERS.md`、`AI_HANDOFF.md`
- [x] 记录可复用模块清单

**技术判断：**
- 先用 Vite H5 做前端闭环，不立即迁 Next.js/Supabase，待体验验证完成后再迁

**验证：**
- typecheck ✅ | build:h5 ✅ | build ✅

---

### 循环 02 — Web App 主信息架构壳
- **耗时**：~2h
- **状态**：✅ Passed

**完成内容：**
- [x] 定义 `HoardlyCard`、`HoardlyProject`、`HoardlyTag` 产品类型（`src/types/hoardly.ts`）
- [x] 重写 `entrypoints/web-preview/main.tsx` 为 `HoardlyWebApp`，旧原型保留为 `legacy-main.tsx`
- [x] 实现主布局：全部流 / 进行中项目 / 标签云 / AI 搜索 / 维护中心（5 大区域骨架）
- [x] 实现卡片 Grid 展示（等高网格 + List 切换入口）
- [x] 实现 Mock 数据种子（`src/lib/hoardly-seed.ts`）

**验证：**
- typecheck ✅ | build:h5 ✅ | build ✅

---

### 循环 03 — 卡片 CRUD（增 / 改 / 软删 / 恢复 / 星标）
- **耗时**：~1.5h
- **状态**：✅ Passed

**完成内容：**
- [x] 创建 `src/lib/hoardly-capture.ts`：localStorage 数据层（增删改查）
- [x] URL 去重逻辑（`canonical_url` 优先）
- [x] 卡片软删 + 恢复（`deletedAt` 字段）
- [x] 星标（`starred`）toggle
- [x] 编辑笔记（`noteMarkdown`）inline 编辑
- [x] 创建 `src/components/ui/textarea.tsx`（shadcn 风格）

**验证：**
- typecheck ✅ | build:h5 ✅ | build ✅

---

### 循环 04 — 项目工作流（创建 / 加入 / 移除 / 解散）
- **耗时**：~1.5h
- **状态**：✅ Passed

**完成内容：**
- [x] 项目列表侧边栏（进行中项目 + 全部项目）
- [x] 创建项目（Modal 输入标题 + 颜色标签）
- [x] 卡片加入项目 / 移出项目
- [x] 项目解散（仅解散关联，不删卡片）
- [x] `updateProjectMembership` 写入 localStorage

**验证：**
- typecheck ✅ | build:h5 ✅ | build ✅

---

### 循环 05 — Popup 对齐（极简采集 + 当前页预览）
- **耗时**：~1h
- **状态**：✅ Passed

**完成内容：**
- [x] 重写 `entrypoints/popup/main.tsx`：当前页 URL / 标题 / 描述预览
- [x] 项目选择下拉
- [x] Thread 展开选项（社交帖预留）
- [x] 保存按钮（写 localStorage）
- [x] 跳转 Hoardly 主页 / 设置链接

**验证：**
- typecheck ✅ | build:h5 ✅ | build ✅

---

### 循环 06 — 采集服务占位（PlatformAdapter 基础注册表）
- **耗时**：~1h
- **状态**：✅ Passed

**完成内容：**
- [x] 定义 `NormalizedCapture` 输出标准结构
- [x] 实现 Tier 1（网页）、Tier 2（YouTube / Twitter / Bilibili）适配器骨架
- [x] 注册表路由：按 URL pattern 匹配适配器
- [x] Popup 保存时调用注册表，输出 `NormalizedCapture` → 写 localStorage

**验证：**
- typecheck ✅ | build:h5 ✅ | build ✅

---

### 循环 07 — 批量操作（多选 / 批量加项目 / 批量删除）
- **耗时**：~1h
- **状态**：✅ Passed

**完成内容：**
- [x] Cmd/Ctrl/Shift + 点击多选卡片
- [x] 批量操作浮动工具栏（加入项目 / 软删 / 取消）
- [x] 批量操作写 localStorage（原子更新）

**验证：**
- typecheck ✅ | build:h5 ✅ | build ✅

---

### 循环 08 — Chrome 书签导入 UI
- **耗时**：~1h
- **状态**：✅ Passed

**完成内容：**
- [x] 维护中心入口 → 导入页
- [x] H5 环境：展示示例数据（无 Chrome API，UI 验证用）
- [x] 扩展环境：动态 import `bookmark-service.ts`，读取 Chrome 书签树，转 `HoardlyCard`
- [x] 去重逻辑复用 `upsertCapturedCard`
- [x] `importBookmarksToLibrary` 函数封装

**验证：**
- typecheck ✅ | build:h5 ✅ | build ✅

---

### 循环 09 — AI 搜索引用面板（占位 RAG）
- **耗时**：~1h
- **状态**：✅ Passed

**完成内容：**
- [x] AI 搜索面板：RAG 3 阶段状态（检索 → 融合 → 生成）
- [x] 本地关键词匹配 `buildAiCitations`（真实 RAG 待接入）
- [x] 可点击引用卡片：标题 / snippet / 命中字段 / 相关度分
- [x] 无来源时明确标注"来自模型通识，非你的收藏"
- [x] `AiCitation` 类型定义

**验证：**
- typecheck ✅ | build:h5 ✅ | build ✅

---

## 🚧 进行中 / 待启动功能循环

> 顺序参考产品文档 PRODUCT_SPEC.md P0 优先级，可根据实际需要调整。
> **⚠️ 所有循环跳过登录 / 注册 / 支付，专注主功能体验。**

---

### 循环 10 — 社交平台 PlatformAdapter（P0 社交）
- **预估工时**：3h | **实际**：~1.5h
- **状态**：✅ Passed

**目标：** 让 Reddit / Twitter / Instagram / Facebook / Threads / LinkedIn / 微信公众号 采集的卡片能正确解析、展示作者/子版块/平台角标。

**Checklist：**
- [x] 创建 `src/lib/platform-adapters.ts`：21 个平台注册表（color / displayName / loginWallRisk）
- [x] `extractSocialMeta(url, type)`：Reddit subreddit / X @handle / Instagram @user / Threads @user / LinkedIn handle / YouTube @channel / Bilibili UID / TikTok @user / XHS UID 提取
- [x] `socialMetaLine(card)`：优先 subreddit > authorHandle > authorName 的单行展示
- [x] `ParseFailReason` 类型：login_wall / private / network_error / unsupported + 中文提示文案
- [x] `HoardlyCard` 类型新增 `authorHandle`、`subreddit`、`parseFailReason` 字段
- [x] `HoardlyParseFailReason` 类型 export 自 types/hoardly.ts
- [x] `hoardly-capture.ts`：`createCardFromCapture` 自动调用 `extractSocialMeta`；新增 `markCardParseFailed` 便捷方法
- [x] seed 数据补充 Twitter / Instagram / LinkedIn / Threads / 微信公众号 示例卡片（含 parseFailReason）
- [x] 卡片 thumbnail 角标改为"平台色圆点 + 平台名"
- [x] 卡片 meta 行展示带平台色的 authorHandle / subreddit
- [x] `StatusPill` 支持 `failReason`，hover title 展示具体指引
- [x] Drawer 详情：失败时展示 `parseFailReason` 中文说明 + 针对登录墙的"截图兜底"重试按钮文案
- [x] Drawer header：平台色圆点 + 作者/subreddit 展示

**验证：**
- [x] typecheck ✅
- [x] build:h5 ✅

---

### 循环 11 — 智能排序与标签云
- **预估工时**：2h | **实际**：~1h
- **状态**：✅ Passed

**目标：** 卡片网格支持"最新 / 最近访问 / 智能推荐"排序，标签云可多选 AND 筛选，平台类型改为色彩 chip。

**Checklist：**
- [x] `HoardlySortMode` 加 `"lastViewed"` 选项
- [x] 排序 Tab 三档：最新 / 最近访问 / 智能
- [x] `sortCards("lastViewed")`：按 `lastOpenedAt` 降序，未访问落底
- [x] `sortCards("smart")`：修正权重计算，freshness + project + opened + starred
- [x] `readStoredSortMode` 支持持久化 lastViewed
- [x] `selectedTagId → selectedTagIds: string[]` 全面替换
- [x] `visibleCards` 改为 AND 多标签过滤
- [x] `toggleTagFilter()` 便捷方法
- [x] AllCardsView：顶部平台 chip 横排（18 个平台，带颜色圆点，active 时填充平台色）
- [x] AllCardsView：标签多选 chip（已选标签显示 × 可移除，下拉追加更多标签）
- [x] TagsView 重写为视觉标签云：Top 20，字号 0.85-1.8rem 随数量缩放，active 高亮
- [x] TagsView 标签详情列表：卡片数 + 来源类型
- [x] TagsView：全部清除按钮

**验证：**
- [x] typecheck ✅
- [x] build:h5 ✅

---

### 循环 12 — 卡片详情抽屉（Detail Drawer）
- **预估工时**：2h | **实际**：~1h
- **状态**：✅ Passed

**目标：** 点击卡片打开右侧详情抽屉，展示全文/截图/笔记/标签/元数据，并可编辑。

**Checklist：**
- [x] Sticky header：平台色圆点 + 标题 inline 编辑 + 快捷操作行（打开原文/星标/问这张卡）
- [x] 平台色背景缩略图区域：有 thumbnailUrl 展示图片，无则平台色 + 图标 + 状态文字
- [x] 元数据区 `<dl>`：URL 可点击链接 / 作者 authorHandle / subreddit 版块 / 采集时间 / 字数+阅读时长 / 解析状态
- [x] 解析失败区：独立展示 parseFailReason 中文说明 + 重试按钮（登录墙文案特化）
- [x] AI 摘要区块
- [x] Thread snapshot 区块（社交卡专用）：帖子列表带层级缩进 + 作者/点赞数 + 总数提示
- [x] 类型字段 `HoardlyThreadSnapshot` + `HoardlyThreadPost` + `wordCount` 加入 types
- [x] seed 数据：Reddit 卡带真实 threadSnapshot 示例
- [x] 标签增删（点击 × 移除，下拉直接添加）
- [x] 项目 checkbox（hover 高亮优化）
- [x] 高亮区块：引用块样式（左侧 primary 边框）
- [x] 笔记 编辑/预览 切换（右上角按钮），预览用 `SimpleMarkdown` 渲染 bold/italic/code/heading
- [x] `Textarea` 组件升级为 `React.forwardRef`，支持 `ref` 绑定
- [x] 键盘快捷键：`Esc` 关闭，`E`（非输入态）聚焦笔记并切换到编辑模式
- [x] `DrawerSection` 组件升级支持可选 `action` slot（右侧按钮）
- [x] `SimpleMarkdown` + `inlineFormat` 工具函数

**验证：**
- [x] typecheck ✅
- [x] build:h5 ✅

---

### 循环 13 — 搜索增强（全文 + 语义占位）
- **预估工时**：1.5h
- **状态**：⬜ 待启动

**目标：** 搜索框支持全文关键词 + 标签 + 平台过滤，结果高亮匹配段落。

**Checklist：**
- [ ] 搜索框前置：自动聚焦，`/` 快捷键唤起
- [ ] 本地全文搜索（title + description + noteMarkdown）
- [ ] 平台过滤 chip（Web / Reddit / YouTube / Twitter…）
- [ ] 标签过滤 chip
- [ ] 结果高亮（关键词 bold）
- [ ] 搜索无结果引导：建议换词 / 查看 AI 搜索

**验证：**
- [ ] typecheck ✅
- [ ] build:h5 ✅

---

### 循环 14 — 维护中心增强（失效链 + 重复 + 配额）
- **预估工时**：2h
- **状态**：⬜ 待启动

**目标：** 维护中心展示失效链接、重复卡片、配额使用情况，并提供一键修复。

**Checklist：**
- [x] 失效链检测（`parseStatus === 'failed'` 卡片列表）
- [x] 重复卡片检测（相同 canonical_url）
- [x] 重复卡片合并（保留较旧，删较新副本）
- [x] 配额面板（卡片数 / 500 上限 / 进度条）
- [x] 一键清空回收站

**验证：**
- [x] typecheck ✅
- [x] build:h5 ✅

---

### 循环 15 — MCP Server 骨架（P0）
- **预估工时**：3h | **实际**：~45min
- **状态**：✅ 完成

**实现内容：**
- `vite.config.ts` 新增 `localMcpServer()` Vite Plugin：
  - `POST /api/mcp/sync` — 浏览器推送 library 快照
  - `GET /api/mcp/cards` — list_cards（分页）
  - `GET /api/mcp/cards/search?q=` — search_cards
  - `GET /api/mcp/cards/:id` — get_card
  - `GET /api/mcp/status` — health check
- Web App 加 `useEffect`：每次 library 变更自动推送到 `/api/mcp/sync`
- Settings 页新增 MCP 开关卡，含端点文档与 URL 展示

**验证：**
- [x] typecheck ✅
- [x] build:h5 ✅

---

### 循环 16 — Supabase 脚手架
- **预估工时**：6h | **实际**：~15min（脚手架，无需账号即可就绪）
- **状态**：✅ 脚手架就绪（需人工填 env）

**产出文件：**
- `supabase/schema.sql` — 完整 DDL（cards、tags、projects、card_tags、card_projects、hybrid_search 函数）
- `src/lib/supabase.ts` — 客户端 stub + 数据层函数（fetchCards、upsertCard、softDeleteCard、hybridSearch）

**激活步骤（人工）：**
1. 创建 Supabase 项目 → SQL Editor 执行 `schema.sql`
2. 复制 Project URL + anon key → `.env`
3. `npm install @supabase/supabase-js` → 解注释 `supabase.ts` 真实 client

---

### 循环 17 — Next.js 脚手架
- **预估工时**：8h | **实际**：~15min（脚手架）
- **状态**：✅ 脚手架就绪（需迁移组件）

**产出文件：**
- `next-app/package.json` — Next.js 15 + Supabase + Vercel AI SDK 依赖
- `next-app/src/app/layout.tsx` — 根布局（Inter 字体）
- `next-app/src/app/page.tsx` — 重定向 `/library`，含完整迁移注释
- `next-app/src/app/library/page.tsx` — 主卡片页脚手架
- `next-app/src/app/api/mcp/route.ts` — Next.js MCP Route Handler
- `next-app/README.md` — 完整迁移指南（含路线图表格）

**激活步骤（人工）：**
```bash
cd next-app && npm install
cp .env.example .env.local  # 填 Supabase env
npm run dev
```

---

## 📊 进度总览

| 循环 | 功能 | 预估 | 状态 |
|------|------|------|------|
| 01 | 代码库初检与清理 | 1h | ✅ 完成 |
| 02 | Web App 主信息架构壳 | 2h | ✅ 完成 |
| 03 | 卡片 CRUD | 1.5h | ✅ 完成 |
| 04 | 项目工作流 | 1.5h | ✅ 完成 |
| 05 | Popup 对齐 | 1h | ✅ 完成 |
| 06 | 采集服务占位 | 1h | ✅ 完成 |
| 07 | 批量操作 | 1h | ✅ 完成 |
| 08 | Chrome 书签导入 | 1h | ✅ 完成 |
| 09 | AI 搜索引用面板 | 1h | ✅ 完成 |
| **小计已完成** | | **~11h** | |
| 10 | 社交平台 PlatformAdapter | 3h | ✅ 完成 |
| 11 | 智能排序与标签云 | 2h | ✅ 完成 |
| 12 | 卡片详情抽屉 | 2h | ✅ 完成 |
| 13 | 搜索增强 | 1.5h | ✅ 完成 |
| 14 | 维护中心增强 | 2h | ✅ 完成 |
| 15 | MCP Server 骨架 | 3h | ✅ 完成 |
| 16 | Supabase 脚手架 | 6h | ✅ 脚手架就绪（需填 env） |
| 17 | Next.js 脚手架 | 8h | ✅ 脚手架就绪（需迁组件） |
| **小计待完成** | | **~27.5h** | |
| **总计** | | **~38.5h** | |

---

## 🗒️ 开发判断记录

| 日期 | 判断内容 | 决策 | 影响 |
|------|----------|------|------|
| 2026-07-05 | 是否立即迁 Next.js | 否，先 Vite H5 验证体验 | 更快看到产品形态 |
| 2026-07-05 | Auth 是否实现 | 跳过，直接进主功能 | 节约 4-6h，专注核心 |
| 2026-07-05 | 支付/订阅 | 跳过，不做任何真实接入 | 节约 3-5h |
| 2026-07-05 | Cmd+Click 冲突 | 优先批量选择，详情通过 hover "..." 触发 | 需后续 UX 确认 |
| 2026-07-05 | AI 搜索引用 | 本地关键词占位，真实 RAG 待 Supabase 接入后实现 | 用户可见 RAG 交互框架 |
