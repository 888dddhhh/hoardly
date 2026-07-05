# Hoardly — Next.js 生产版本

这是从 Vite H5 预览迁移到 Next.js + Supabase 的脚手架。

## 快速启动

```bash
cd next-app
npm install
cp .env.example .env.local  # 填入 Supabase 配置
npm run dev
```

## 环境变量

创建 `next-app/.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
# AI（任选其一）
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
```

## 数据库初始化

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 新建项目 → SQL Editor → 粘贴 `../supabase/schema.sql` → Run
3. 复制 Project URL 和 anon key → 填入 `.env.local`

## 迁移路线图

| 路由 | 对应 Vite 组件 | 状态 |
|------|---------------|------|
| `/library` | `AllCardsView` | 脚手架 |
| `/projects` | `ProjectsView` | 待迁移 |
| `/tags` | `TagsView` | 待迁移 |
| `/ai` | `AiSearchView` | 待迁移 |
| `/maintenance` | `MaintenanceView` | 待迁移 |
| `/settings` | `SettingsView` | 待迁移 |
| `/trash` | `TrashView` | 待迁移 |
| `/api/mcp` | Vite MCP middleware | 脚手架（待接 Supabase） |

## 迁移步骤

1. **复制组件**：把 `entrypoints/web-preview/main.tsx` 里的各 View 函数拆成独立 Client Component 文件（放 `src/components/`）
2. **替换数据层**：把 `loadHoardlyLibrary()` / `saveHoardlyLibrary()` 调用替换成 `src/lib/supabase.ts` 里的函数
3. **Server Components**：初始加载用 `createServerClient()` 做 RSC 查询，交互状态用 `"use client"` 组件
4. **Auth**：使用 `@supabase/ssr` 的 `createServerClient` 读取用户会话
5. **部署**：`vercel deploy` 或 `next build && next start`
