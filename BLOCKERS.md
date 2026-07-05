# Blockers

## 当前状态

No active blockers.

## 已知限制

- 当前目录不是 Git 仓库，无法使用 Git diff/status 辅助变更审计。
- 缺少 Supabase、R2、正式 Auth、生产 API 等配置，暂时不能实现云端主库闭环。
- 当前 localStorage 数据层只是前端占位，H5 dev origin 与扩展 origin 不共享，不能代表跨设备同步。
- Chrome bookmarks 真实导入依赖扩展环境；当前自动验证只能覆盖 H5 示例导入入口和扩展构建。
- AI 搜索引用面板目前是本地启发式占位；正式 Agentic RAG 需要后端搜索和模型服务。
- package.json 无 lint/test 脚本，验证只能先依赖 typecheck 与 build。
