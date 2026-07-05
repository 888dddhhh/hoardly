/**
 * /library — 主卡片墙（Server Component）
 *
 * 迁移步骤：
 * 1. 把 AllCardsView 的 JSX 粘贴进来
 * 2. 用 createServerClient() 替换 loadHoardlyLibrary()
 * 3. 把交互状态（searchQuery、sortMode 等）移到 Client Component
 */
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  // TODO: replace with real Supabase query
  // const supabase = createServerClient(...)
  // const { data: cards } = await supabase.from("cards").select("*")...
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">收藏库</h1>
      <p className="mt-2 text-muted-foreground">
        迁移中 — 请先在 Vite H5 预览（npm run dev:h5）验证体验
      </p>
    </main>
  );
}
