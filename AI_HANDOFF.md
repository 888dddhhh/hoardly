# AI Handoff

> 产品方案：`PRODUCT_SPEC.md`（项目根目录，即原 `个人知识资产收藏系统-完整产品与技术方案.md` v2.19）
> 进度 Checklist：`DEVELOPMENT_LOG.md`

## 当前项目状态

Hoardly 当前是 WXT Chrome 扩展 + Vite H5 预览项目，已有 shadcn/base-ui 基础组件、Chrome 书签读取/分析/搜索、AI 打标签、失效链接检查等原型能力。H5 预览入口已切换为产品文档导向的 Web App 主信息架构壳，旧 H5 原型保留在 `entrypoints/web-preview/legacy-main.tsx`。

## 已完成功能

- 完成代码库初检与最小清理。
- 删除 `.DS_Store`、`docs/.DS_Store`、`components 2.json`。
- 验证 `npm run typecheck`、`npm run build:h5`、`npm run build` 均通过。
- 新增 `src/types/hoardly.ts` 产品级类型。
- 新增 `src/lib/hoardly-seed.ts` 本地 mock 主库数据。
- 重写 `entrypoints/web-preview/main.tsx`，实现全部流、项目、标签云、AI 搜索、维护中心、设置入口。
- 完成卡片 CRUD 前端闭环：Drawer 标题/标签/笔记编辑、星标、软删除、回收站恢复/永久删除、失败解析重试、URL 去重提示。
- 新增 `src/components/ui/textarea.tsx`。
- 完成项目工作流前端：新建项目、项目描述和颜色、Drawer 多项目归属编辑、解散项目 10 秒撤销。
- 完成扩展 Popup 对齐：当前页预览、粘贴链接、项目选择、Reddit/X 线程选项、保存到 Hoardly、查看/设置入口；移除最近书签搜索网格与 AuthPanel。
- 完成统一采集 service / 前端数据访问层占位：新增 `src/lib/hoardly-capture.ts`，Web App 使用 localStorage library，Popup 保存成功后同步 upsert 本地 Hoardly card。
- 完成批量操作底部浮条：全部流支持 checkbox、Shift 连选、Cmd/Ctrl 多选，批量打标签、入/移项目、星标、删除和 Skill 导出占位。
- 完成 Chrome bookmarks 导入到 Hoardly cards：设置页新增导入入口，扩展环境读取真实 bookmarks API，H5 预览导入示例书签，导入走 URL 去重并写入本地 Hoardly library。
- 完成 AI 搜索引用面板增强：AI 搜索页展示 RAG 阶段占位、可点击引用卡片、命中字段、证据片段和“模型常识非收藏”提示。

## 当前正在开发的功能

- 当前功能循环已完成并通过验证。

## 下一步应该做什么

1. 做 Skill / Markdown 导出任务：批量选择和项目解散时生成知识包。
2. 后续增强 AI 搜索为真正 hybrid search + Agentic RAG。
3. 后续把 `hoardly-capture` localStorage service 替换为 Supabase cards API。
4. 每完成一个功能循环后运行 typecheck/build 并更新本文件与 DEVELOPMENT_LOG.md。

## 暂时跳过的功能

- 完整 Auth、注册、订阅、支付。
- Supabase/Next.js/Cloudflare R2 生产迁移。
- MCP Server、Agentic RAG、完整多语言 AI schema。

## 重要技术决策

- 先复用现有 WXT + Vite + shadcn 代码做体验闭环，再迁移到产品文档建议的 Next.js + Supabase。
- 扩展后续定位为采集器；完整卡片库体验应在 Web App 中完成。
- Chrome 书签后续只作为导入源，不再作为主库心智。
- `src/lib/hoardly-capture.ts` 是当前前端数据访问层占位，后续替换 Supabase 时优先改这里。
- 全部流中 `Cmd/Ctrl/Shift+点击` 当前优先用于批量选择；详情入口保留为卡片右上角“⋯”与 note/无 URL 卡片主点击。
- Chrome 导入在 Web 入口中动态 import `bookmark-service`，避免 H5 主包静态带入旧书签分析/AI 逻辑。
- AI 搜索引用当前用本地卡片字段启发式计算命中字段；正式 RAG 接入后替换 `buildAiCitations()`。

## 已知问题

- `entrypoints/web-preview/main.tsx` 当前是新产品主框架，但仍应继续拆分组件。
- `entrypoints/web-preview/legacy-main.tsx` 仍有旧文件夹导航、Admin、订阅等与新产品文档不一致的内容。
- 新主框架目前使用 localStorage + seed 数据，还没有真实 API/Auth/DB。
- H5 dev origin 与扩展 origin 的 localStorage 不共享；正式产品需要云端 API 统一数据源。
- 项目解散撤销在前端用快照恢复，后续接后端时需改为事务级恢复。
- 批量操作当前是前端 localStorage mutation；正式后端需要批处理 API、事务和失败回滚。
- Skill 导出目前只有批量操作入口占位，尚未生成 Markdown/Skill 文件。
- Chrome 导入当前不是后台 import job；正式后端需要进度订阅、失败记录表和 Supabase `POST /cards` 批量入口。
- Chrome bookmarks 真实读取还需要在浏览器扩展环境手动点击验证；H5 只能验证示例导入。
- AI 搜索当前不是正式 Agentic RAG，只是前端可解释引用占位；需要 Supabase hybrid search、pgvector、PGroonga、RRF 和后端 AI 服务。
- Popup 保存仍复用 Chrome bookmark 写入；还不是产品文档最终的云端 `POST /cards`。

## 测试状态

- `npm run typecheck`: passed
- `npm run build:h5`: passed
- `npm run build`: passed
- `curl -I --max-time 3 http://127.0.0.1:5173/`: HTTP 200
- dev server: running at `http://127.0.0.1:5173/`
- lint/test: scripts missing

## 关键文件

- `package.json`
- `components.json`
- `entrypoints/web-preview/main.tsx`
- `entrypoints/web-preview/legacy-main.tsx`
- `entrypoints/popup/main.tsx`
- `entrypoints/background.ts`
- `src/types/hoardly.ts`
- `src/lib/hoardly-capture.ts`
- `src/lib/hoardly-seed.ts`
- `src/components/ui/textarea.tsx`
- `src/components/ui/*`
- `src/lib/bookmark-service.ts`
- `src/lib/bookmark-ai-classify.ts`
- `src/lib/bookmark-page-signals.ts`
- `src/types/bookmark.ts`
