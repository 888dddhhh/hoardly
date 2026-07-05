/**
 * Hoardly — Next.js 主页
 *
 * 当前：重定向到 /library（主卡片视图）
 * 迁移说明：把 entrypoints/web-preview/main.tsx 中的
 *   HoardlyWebApp 组件拆分为：
 *   - app/library/page.tsx      ← AllCardsView
 *   - app/projects/page.tsx     ← ProjectsView
 *   - app/tags/page.tsx         ← TagsView
 *   - app/ai/page.tsx           ← AiSearchView
 *   - app/maintenance/page.tsx  ← MaintenanceView
 *   - app/settings/page.tsx     ← SettingsView
 *   - app/trash/page.tsx        ← TrashView
 *
 * 数据层替换：
 *   localStorage (hoardly-capture.ts) → supabase (src/lib/supabase.ts)
 *   在每个 page.tsx 里用 createServerClient() 做 Server Component 查询
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/library");
}
