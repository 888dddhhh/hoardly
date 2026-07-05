# Hoardly TODO

## 下一轮产品开发

- Skill / Markdown 导出任务：批量选择和项目解散时生成知识包，目前只有入口占位。

## 后续需要人工确认

- 是否立即迁移到 Next.js + Supabase，还是先继续用 Vite H5 做前端体验验证。
- Supabase 项目、Auth、Postgres/pgvector、R2、部署域名和环境变量。
- 订阅计费、Stripe、加密货币支付是否在当前仓库内先做占位。

## 暂时跳过

- 完整登录/注册/Auth：规则文件允许先用 mock/占位。
- 订阅、支付、Billing、Stripe/PayPal：先预留接口与设置入口。
- 生产数据库与迁移脚本：等 Supabase 信息确认后接入。
- MCP Server：P0 产品能力，但需要后端与搜索底座后实现。

## 技术债

- `entrypoints/web-preview/main.tsx` 过大，需要按页面和组件拆分。
- 旧 H5 原型已保留为 `entrypoints/web-preview/legacy-main.tsx`，后续确认无用后再删除或拆取可复用逻辑。
- 当前 Web App 已有 localStorage 数据访问层占位，但不是生产数据库；后续需要替换为 Supabase 数据层。
- 项目解散撤销当前用完整 cards/projects 快照恢复，真实后端需改成事务级 undo。
- 批量操作当前在前端直接更新 localStorage library；正式后端需要批处理 API、事务和失败回滚。
- `Cmd/Ctrl+点击` 当前优先用于批量多选；产品文档里也曾用于进入详情，后续需要交互确认。
- Chrome 导入当前是前端点击后导入；正式后端需要 import job、进度订阅和失败记录表。
- Chrome bookmarks 真实读取依赖扩展环境；H5 预览只导入示例书签，仍需要在 Chrome 扩展里手动验证按钮。
- AI 搜索引用当前是本地关键词启发式；正式版本需要 Supabase hybrid search、pgvector、PGroonga、RRF 和 Agentic RAG。
- Popup 保存会写入本地 Hoardly library，但 H5 dev origin 与扩展 origin 的 localStorage 不共享；后续需接统一 cards API。
- 当前无 lint/test 脚本，需要补齐工程验证。
- 当前目录不是 Git 仓库，建议后续纳入版本管理，方便安全重构。
- 构建产物 `dist/`、`.output/`、`hoardly-1.0.0-chrome.zip` 是否应保留待确认。
