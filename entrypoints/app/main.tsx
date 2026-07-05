import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Plus as Add01Icon,
  Bot as BotIcon,
  Calendar as Calendar03Icon,
  Copy as Copy01Icon,
  Folder as FolderIcon,
  Globe as Globe02Icon,
  MoreHorizontal as MoreHorizontalIcon,
  Moon as Moon02Icon,
  RotateCw as RotateClockwiseIcon,
  Search as Search01Icon,
  Sun as Sun02Icon,
  Tag as TagIcon,
  UserCircle as UserCircleIcon,
  Mic as AiMicIcon,
} from "lucide-react";
import "../../src/styles/globals.css";
import { SiteBookmarkThumbnail } from "../../src/components/site-bookmark-thumbnail";
import { Button } from "../../src/components/ui/button";
import { Card, CardContent, CardHeader } from "../../src/components/ui/card";
import { Icon } from "../../src/components/ui/icon";
import { Input } from "../../src/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../src/components/ui/tabs";
import { Separator } from "../../src/components/ui/separator";
import { runBookmarkAiSearch } from "../../src/lib/ai-client";
import {
  applyBookmarkMetadataBatch,
  deleteAppBookmark,
  deleteInvalidAppBookmark,
  listAppBookmarks,
  listInvalidAppBookmarks,
  openBookmarkUrl,
  reanalyzeAllAppBookmarks,
  restoreInvalidAppBookmark,
  runInvalidAppBookmarkCheck,
} from "../../src/lib/bookmark-service";
import {
  getUniqueCategoryName,
  loadSidebarFolderOrder,
  loadSidebarTagOrder,
  mergeCategoryItems,
  mergeDiscoveryOrder,
  orderItems,
  saveSidebarFolderOrder,
  saveSidebarTagOrder,
} from "../../src/lib/app-category-preferences";
import { searchBookmarks } from "../../src/lib/bookmark-search";
import { mockAccount } from "../../src/lib/mock-data";
import type { InvalidBookmarkRecord } from "../../src/lib/invalid-links";
import type { BookmarkMetadata } from "../../src/types/bookmark";
import { AdminPage } from "./components/admin-page";
import { InvalidTagsPage } from "./components/invalid-page";
import { SettingsPage } from "./components/settings-page";
import { getTagItems, getFolderItems, getHostname, getShortUrl, formatDate, Pill } from "./components/shared";

type AppSection = "bookmarks" | "invalid" | "settings" | "admin";
type ThemeMode = "dark" | "light";

const sectionTitles: Record<AppSection, string> = {
  bookmarks: "Current Bookmarks",
  invalid: "Invalid Bookmarks",
  settings: "Settings",
  admin: "Admin",
};

function isExtensionAppOrigin() {
  if (typeof window === "undefined") return false;
  if (window.location.protocol !== "chrome-extension:") return false;
  return Boolean((globalThis as { chrome?: typeof chrome }).chrome?.runtime?.id);
}

function ExtensionContextGate() {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <Card className="max-w-lg">
        <CardHeader>
          <h1 className="text-xl font-semibold">请在扩展环境里打开全屏</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            当前地址不是 <span className="font-mono text-foreground">chrome-extension://…</span>{" "}
            下的 Hoardly 全屏页。若你在浏览器里直接打开了 https 演示站、或 Vite
            开发地址上的「全屏」链接，页面无法访问 Chrome
            书签，有时会误加载成带演示假数据的网页版。
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            正确做法：点击工具栏里的 Hoardly 图标，在弹出小窗里点「打开全屏」；这样会打开真实的{" "}
            <span className="font-mono text-foreground">chrome-extension://&lt;扩展ID&gt;/app.html</span>
            ，列表会与弹窗一致，来自本机的 Chrome 书签。
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function AppRoot() {
  if (!isExtensionAppOrigin()) {
    return <ExtensionContextGate />;
  }
  return <AppPage />;
}

function AppPage() {
  const [activeSection, setActiveSection] = useState<AppSection>(() =>
    getInitialSection(),
  );
  const [bookmarks, setBookmarks] = useState<BookmarkMetadata[]>([]);
  const [dataError, setDataError] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [query, setQuery] = useState("");
  const [invalidQuery, setInvalidQuery] = useState("");
  const [invalidItems, setInvalidItems] = useState<InvalidBookmarkRecord[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [tagOrder, setTagOrder] = useState<string[]>(() => loadSidebarTagOrder());
  const [folderOrder, setFolderOrder] = useState<string[]>(() => loadSidebarFolderOrder());

  const refreshData = async () => {
    setDataError("");
    setDataLoading(true);

    try {
      const [nextBookmarks, nextInvalidItems] = await Promise.all([
        listAppBookmarks(),
        listInvalidAppBookmarks(),
      ]);
      setBookmarks(nextBookmarks);
      setInvalidItems(nextInvalidItems);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Failed to load Hoardly data.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  useEffect(() => {
    saveSidebarTagOrder(tagOrder);
  }, [tagOrder]);

  useEffect(() => {
    saveSidebarFolderOrder(folderOrder);
  }, [folderOrder]);

  useEffect(() => {
    const tagNames = getTagItems(bookmarks).map((x) => x.name);
    setTagOrder((prev) => {
      const next = mergeDiscoveryOrder(prev, tagNames);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [bookmarks]);

  useEffect(() => {
    const folderNames = getFolderItems(bookmarks).map((x) => x.name);
    setFolderOrder((prev) => {
      const next = mergeDiscoveryOrder(prev, folderNames);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [bookmarks]);

  const filteredByCategory = useMemo(() => {
    if (selectedTag) {
      return bookmarks.filter((b) => b.tags.includes(selectedTag));
    }
    if (selectedFolder) {
      return bookmarks.filter((b) => (b.folderSuggestion ?? "Unsorted") === selectedFolder);
    }
    return bookmarks;
  }, [bookmarks, selectedTag, selectedFolder]);

  const filteredBookmarks = useMemo(() => {
    return searchBookmarks(filteredByCategory, query);
  }, [filteredByCategory, query]);

  const applyBookmarkPatches = async (next: BookmarkMetadata[]) => {
    await applyBookmarkMetadataBatch(next);
    await refreshData();
  };

  const filteredInvalidItems = useMemo(() => {
    const keyword = invalidQuery.trim().toLowerCase();
    if (!keyword) return invalidItems;

    return invalidItems.filter((item) =>
      [item.title, item.url, item.reason, item.originalFolder]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [invalidQuery]);

  return (
    <main
      className={`${theme} flex h-[100dvh] overflow-hidden bg-background text-foreground`}
    >
      <nav className="flex w-20 shrink-0 flex-col items-center border-r border-border bg-background py-6">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Hoardly Logo"
          onClick={() => setActiveSection("bookmarks")}
          className="rounded-2xl"
        >
          <img
            alt="Hoardly"
            className="size-11 rounded-2xl"
            src={getAssetUrl("/hoardly-logo.png")}
          />
        </Button>

        <div className="mt-[372px] flex flex-1 flex-col items-center gap-3">
          <Button
            variant={activeSection === "bookmarks" ? "secondary" : "ghost"}
            size="icon-lg"
            aria-label={`有效标签：${bookmarks.length} 个当前书签`}
            title={`有效标签：${bookmarks.length} 个当前书签`}
            onClick={() => setActiveSection("bookmarks")}
            className="rounded-2xl"
          >
            <Icon icon={TagIcon} className="size-5" strokeWidth={activeSection === "bookmarks" ? 2.2 : 1.8} />
          </Button>
          <Button
            variant={activeSection === "invalid" ? "secondary" : "ghost"}
            size="icon-lg"
            aria-label={`失效标签：${invalidItems.length} 个待确认链接`}
            title={`失效标签：${invalidItems.length} 个待确认链接`}
            onClick={() => setActiveSection("invalid")}
            className="rounded-2xl"
          >
            <Icon icon={TagIcon} className="size-5" strokeWidth={activeSection === "invalid" ? 2.2 : 1.8} />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={theme === "dark" ? "暗黑模式：点击切换亮色模式" : "亮色模式：点击切换暗黑模式"}
            title={theme === "dark" ? "切换亮色" : "切换暗色"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-2xl"
          >
            {theme === "dark" ? (
              <Icon icon={Moon02Icon} className="size-5" />
            ) : (
              <Icon icon={Sun02Icon} className="size-5" />
            )}
          </Button>
          <Button
            variant={activeSection === "settings" ? "secondary" : "ghost"}
            size="icon-lg"
            aria-label={`我的头像 / 设置：${mockAccount.googleEmail}`}
            title="设置"
            onClick={() => setActiveSection("settings")}
            className="rounded-2xl"
          >
            <Icon icon={UserCircleIcon} className="size-5" />
          </Button>
        </div>
      </nav>

      <section className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
        {activeSection === "bookmarks" && (
          <BookmarksPage
            query={query}
            setQuery={setQuery}
            allBookmarks={bookmarks}
            bookmarks={filteredBookmarks}
            error={dataError}
            loading={dataLoading}
            onRefresh={refreshData}
            onApplyPatches={applyBookmarkPatches}
            selectedTag={selectedTag}
            selectedFolder={selectedFolder}
            setSelectedTag={setSelectedTag}
            setSelectedFolder={setSelectedFolder}
            tagOrder={tagOrder}
            setTagOrder={setTagOrder}
            folderOrder={folderOrder}
            setFolderOrder={setFolderOrder}
            onDeleteBookmarks={async (ids) => {
              for (const id of ids) {
                await deleteAppBookmark(id);
              }
              await refreshData();
            }}
          />
        )}
        {activeSection === "invalid" && (
          <div className="min-w-0 flex-1 overflow-auto px-4">
            <TopBar activeSection={activeSection} />
            <InvalidTagsPage
              query={invalidQuery}
              setQuery={setInvalidQuery}
              items={filteredInvalidItems}
              onCheck={async () => {
                await runInvalidAppBookmarkCheck();
                await refreshData();
              }}
              onDelete={async (bookmarkId) => {
                await deleteInvalidAppBookmark(bookmarkId);
                await refreshData();
              }}
              onRestore={async (bookmarkId) => {
                await restoreInvalidAppBookmark(bookmarkId);
                await refreshData();
              }}
            />
          </div>
        )}
        {activeSection === "settings" && (
          <div className="min-w-0 flex-1 overflow-auto px-4">
            <TopBar activeSection={activeSection} />
            <SettingsPage />
          </div>
        )}
        {activeSection === "admin" && (
          <div className="min-w-0 flex-1 overflow-auto px-4">
            <TopBar activeSection={activeSection} />
            <AdminPage />
          </div>
        )}
      </section>
    </main>
  );
}

function getInitialSection(): AppSection {
  const section = new URLSearchParams(window.location.search).get("section");
  if (section === "invalid" || section === "settings" || section === "admin") {
    return section;
  }
  return "bookmarks";
}

function getAssetUrl(path: string) {
  const chromeRuntime = (globalThis as typeof globalThis & {
    chrome?: { runtime?: { getURL?: (path: string) => string } };
  }).chrome?.runtime;

  return chromeRuntime?.getURL ? chromeRuntime.getURL(path) : path;
}

function TopBar({
  activeSection,
  subtitle,
}: {
  activeSection: AppSection;
  subtitle?: string;
}) {
  return (
    <header className="flex h-20 shrink-0 items-end justify-between pb-1">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {sectionTitles[activeSection]}
        </h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="hidden items-center gap-4 md:flex">
        <Button variant="secondary" size="lg">操作</Button>
        <Button variant="secondary" size="lg">操作</Button>
      </div>
    </header>
  );
}

function BookmarksPage({
  query,
  setQuery,
  allBookmarks,
  bookmarks,
  error,
  loading,
  onRefresh,
  onApplyPatches,
  selectedTag,
  selectedFolder,
  setSelectedTag,
  setSelectedFolder,
  tagOrder,
  setTagOrder,
  folderOrder,
  setFolderOrder,
  onDeleteBookmarks,
}: {
  query: string;
  setQuery: (value: string) => void;
  allBookmarks: BookmarkMetadata[];
  bookmarks: BookmarkMetadata[];
  error: string;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onApplyPatches: (next: BookmarkMetadata[]) => Promise<void>;
  selectedTag: string | null;
  selectedFolder: string | null;
  setSelectedTag: (value: string | null) => void;
  setSelectedFolder: (value: string | null) => void;
  tagOrder: string[];
  setTagOrder: React.Dispatch<React.SetStateAction<string[]>>;
  folderOrder: string[];
  setFolderOrder: React.Dispatch<React.SetStateAction<string[]>>;
  onDeleteBookmarks: (ids: string[]) => Promise<void>;
}) {
  const [categoryMode, setCategoryMode] = useState<"tags" | "folders">("tags");
  const [bulkBusy, setBulkBusy] = useState<null | "update-tags">(null);
  const [bulkHint, setBulkHint] = useState<string | null>(null);
  const [emptyTags, setEmptyTags] = useState<Array<{ name: string; count: number }>>([]);
  const [emptyFolders, setEmptyFolders] = useState<Array<{ name: string; count: number }>>([]);
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiSearching, setAiSearching] = useState(false);

  const submitAiSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || aiSearching) return;
    setAiAnswer(null);
    setAiSearching(true);
    try {
      const result = await runBookmarkAiSearch({ query: trimmed, bookmarks: allBookmarks });
      setAiAnswer(result.answer);
    } catch (err) {
      setAiAnswer(err instanceof Error ? err.message : "AI 搜索失败，请检查设置中的 API 配置。");
    } finally {
      setAiSearching(false);
    }
  };

  const tagItems = getTagItems(allBookmarks);
  const folderItems = getFolderItems(allBookmarks);
  const categoryItemsRaw = categoryMode === "tags" ? tagItems : folderItems;
  const extras = categoryMode === "tags" ? emptyTags : emptyFolders;
  const merged = mergeCategoryItems(categoryItemsRaw, extras);
  const order = categoryMode === "tags" ? tagOrder : folderOrder;
  const categoryItems = orderItems(merged, order);
  const visibleCategoryItems = categoryItems.filter((item) =>
    item.name.toLowerCase().includes(categoryQuery.trim().toLowerCase()),
  );

  const startVoiceSearch = () => {
    type SpeechRecognitionConstructor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
    };

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setQuery("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setQuery(transcript);
    };
    recognition.onerror = () => {
      setQuery("Voice input failed. Please type your search.");
    };
    recognition.start();
  };

  const isTagMode = categoryMode === "tags";

  const moveCategory = (targetName: string) => {
    if (!draggingName || draggingName === targetName) return;
    const names = categoryItems.map((item) => item.name);
    const fromIndex = names.indexOf(draggingName);
    const toIndex = names.indexOf(targetName);
    if (fromIndex < 0 || toIndex < 0) return;
    const nextNames = [...names];
    const [moved] = nextNames.splice(fromIndex, 1);
    nextNames.splice(toIndex, 0, moved);
    if (isTagMode) setTagOrder(nextNames);
    else setFolderOrder(nextNames);
  };

  const beginRename = (name: string) => {
    setMenuFor(null);
    setEditingKey(name);
    setEditingValue(name);
  };

  const commitRename = async () => {
    if (!editingKey) return;
    const oldName = editingKey;
    const nextName = editingValue.trim();
    setEditingKey(null);
    setEditingValue("");
    if (!nextName || nextName === oldName) return;

    if (isTagMode) {
      const next = allBookmarks.map((b) => ({
        ...b,
        tags: b.tags.map((t) => (t === oldName ? nextName : t)),
      }));
      await onApplyPatches(next);
      setTagOrder((o) => o.map((t) => (t === oldName ? nextName : t)));
      setEmptyTags((list) => list.map((t) => (t.name === oldName ? { ...t, name: nextName } : t)));
      if (selectedTag === oldName) setSelectedTag(nextName);
    } else {
      const next = allBookmarks.map((b) => ({
        ...b,
        folderSuggestion:
          (b.folderSuggestion ?? "Unsorted") === oldName ? nextName : b.folderSuggestion,
      }));
      await onApplyPatches(next);
      setFolderOrder((o) => o.map((f) => (f === oldName ? nextName : f)));
      setEmptyFolders((list) => list.map((f) => (f.name === oldName ? { ...f, name: nextName } : f)));
      if (selectedFolder === oldName) setSelectedFolder(nextName);
    }
  };

  const removeCategoryFromBookmarks = async (name: string) => {
    if (isTagMode) {
      const next = allBookmarks.map((b) => ({
        ...b,
        tags: b.tags.filter((t) => t !== name),
      }));
      await onApplyPatches(next);
      setTagOrder((o) => o.filter((t) => t !== name));
      setEmptyTags((list) => list.filter((t) => t.name !== name));
      if (selectedTag === name) setSelectedTag(null);
    } else {
      const next = allBookmarks.map((b) => ({
        ...b,
        folderSuggestion:
          (b.folderSuggestion ?? "Unsorted") === name ? "Unsorted" : b.folderSuggestion,
      }));
      await onApplyPatches(next);
      setFolderOrder((o) => o.filter((f) => f !== name));
      setEmptyFolders((list) => list.filter((f) => f.name !== name));
      if (selectedFolder === name) setSelectedFolder(null);
    }
    setMenuFor(null);
  };

  const deleteCategoryAndLinks = async (name: string) => {
    const ids = isTagMode
      ? allBookmarks.filter((b) => b.tags.includes(name)).map((b) => b.bookmarkId)
      : allBookmarks
          .filter((b) => (b.folderSuggestion ?? "Unsorted") === name)
          .map((b) => b.bookmarkId);
    if (
      !window.confirm(
        `将永久从 Chrome 删除 ${ids.length} 条书签，且不可恢复。确定继续？`,
      )
    ) {
      return;
    }
    await onDeleteBookmarks(ids);
    if (isTagMode) {
      setTagOrder((o) => o.filter((t) => t !== name));
      setEmptyTags((list) => list.filter((t) => t.name !== name));
      if (selectedTag === name) setSelectedTag(null);
    } else {
      setFolderOrder((o) => o.filter((f) => f !== name));
      setEmptyFolders((list) => list.filter((f) => f.name !== name));
      if (selectedFolder === name) setSelectedFolder(null);
    }
    setMenuFor(null);
  };

  const addEmptyCategory = () => {
    const names = categoryItems.map((i) => i.name);
    const base = isTagMode ? "new-tag" : "new-folder";
    const nextName = getUniqueCategoryName(names, base);
    if (isTagMode) {
      setEmptyTags((list) => [...list, { name: nextName, count: 0 }]);
      setTagOrder((o) => [...o.filter((n) => n !== nextName), nextName]);
    } else {
      setEmptyFolders((list) => [...list, { name: nextName, count: 0 }]);
      setFolderOrder((o) => [...o.filter((n) => n !== nextName), nextName]);
    }
    beginRename(nextName);
  };

  return (
    <div className="flex min-h-0 w-full flex-1">
      {/* Sidebar */}
      <aside className="hidden w-[223px] shrink-0 border-r border-border px-4 py-6 lg:block">
        <Tabs
          defaultValue="tags"
          onValueChange={(val) => {
            setCategoryMode(val as "tags" | "folders");
            setMenuFor(null);
          }}
        >
          <TabsList className="mb-5 w-full">
            <TabsTrigger value="tags" className="flex-1">
              <Icon icon={TagIcon} className="size-3.5" />
              Tag
            </TabsTrigger>
            <TabsTrigger value="folders" className="flex-1">
              <Icon icon={FolderIcon} className="size-3.5" />
              Group
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative mb-5">
          <Icon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-9 pl-9 text-xs"
            placeholder="Search..."
            value={categoryQuery}
            onChange={(event) => setCategoryQuery(event.target.value)}
          />
        </div>

        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <p className="text-xs text-muted-foreground">排序 / 筛选 / 重命名</p>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              title="新建标签或文件夹"
              onClick={() => addEmptyCategory()}
            >
              <Icon icon={Add01Icon} className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              title="清除筛选"
              onClick={() => {
                setSelectedTag(null);
                setSelectedFolder(null);
              }}
            >
              <Icon icon={RotateClockwiseIcon} className="size-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[calc(100dvh-190px)] space-y-2 overflow-y-auto pr-1">
          {visibleCategoryItems.length === 0 ? (
            <div className="rounded-xl px-3 py-6 text-center text-sm text-muted-foreground">
              暂无分类。保存书签或使用 AI 打标签后会出现。
            </div>
          ) : null}
          {visibleCategoryItems.map((item) => {
            const active =
              (isTagMode && selectedTag === item.name) ||
              (!isTagMode && selectedFolder === item.name);
            const menuOpen = menuFor === item.name;
            return (
              <div
                key={item.name}
                draggable={!editingKey}
                onDragStart={() => setDraggingName(item.name)}
                onDragEnd={() => setDraggingName(null)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingName) e.dataTransfer.dropEffect = "move";
                }}
                onDrop={() => moveCategory(item.name)}
                className={`group relative flex h-9 w-full items-center gap-1 rounded-xl px-2 text-sm transition ${
                  active ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
                }`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => {
                    if (isTagMode) {
                      setSelectedFolder(null);
                      setSelectedTag(selectedTag === item.name ? null : item.name);
                    } else {
                      setSelectedTag(null);
                      setSelectedFolder(selectedFolder === item.name ? null : item.name);
                    }
                  }}
                >
                  <Icon
                    icon={isTagMode ? TagIcon : FolderIcon}
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  {editingKey === item.name ? (
                    <Input
                      className="h-6 min-w-0 flex-1 rounded-md px-1.5 text-xs"
                      value={editingValue}
                      autoFocus
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => void commitRename()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitRename();
                        if (e.key === "Escape") {
                          setEditingKey(null);
                          setEditingValue("");
                        }
                      }}
                    />
                  ) : (
                    <span className="truncate font-medium">{item.name}</span>
                  )}
                </button>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.count}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="复制名称"
                  onClick={() => void navigator.clipboard.writeText(item.name)}
                >
                  <Icon icon={Copy01Icon} className="size-3" />
                </Button>
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    title="更多"
                    onClick={() => setMenuFor(menuOpen ? null : item.name)}
                  >
                    <Icon icon={MoreHorizontalIcon} className="size-3" />
                  </Button>
                  {menuOpen ? (
                    <Card className="absolute right-0 top-full z-40 mt-1 w-48 py-1 shadow-lg">
                      <CardContent className="space-y-0.5 p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start rounded-lg"
                          onClick={() => beginRename(item.name)}
                        >
                          重命名…
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start rounded-lg"
                          onClick={() => void removeCategoryFromBookmarks(item.name)}
                        >
                          从所有书签移除此{isTagMode ? "标签" : "文件夹"}
                        </Button>
                        <Separator />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full justify-start rounded-lg"
                          onClick={() => void deleteCategoryAndLinks(item.name)}
                        >
                          删除此类别及其中书签…
                        </Button>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1 overflow-auto px-4">
        <TopBar activeSection="bookmarks" subtitle="标签 / 文件夹侧栏可筛选、排序与批量重命名" />

        {/* AI Search Card */}
        <Card className="mb-8 rounded-[24px] py-0">
          <CardContent className="p-4">
            <div className="flex min-h-[118px] flex-col justify-between gap-4">
              <div className="relative flex-1">
                <Icon
                  icon={BotIcon}
                  className="absolute left-3 top-3 size-4 text-muted-foreground"
                />
                <textarea
                  className="min-h-14 w-full resize-none bg-transparent px-3 py-2 pl-10 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                  placeholder="Search all bookmarks, ask a question, or describe what you want to find..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitAiSearch();
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="secondary" aria-label="Add">
                    <Icon icon={Add01Icon} className="size-4" />
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Icon icon={BotIcon} className="size-4" />
                    Inspiration
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">GPT-4o</Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Voice search"
                    onClick={startVoiceSearch}
                  >
                    <Icon icon={AiMicIcon} className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    aria-label="Search"
                    disabled={aiSearching}
                    onClick={() => void submitAiSearch()}
                  >
                    <Icon icon={Search01Icon} className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            {aiSearching ? (
              <p className="mt-3 text-sm text-muted-foreground">AI 正在思考…</p>
            ) : null}
            {aiAnswer ? (
              <div className="mt-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm whitespace-pre-wrap">
                {aiAnswer}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card size="sm" className="mb-8">
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={bulkBusy !== null || loading}
                type="button"
                variant="secondary"
                onClick={async () => {
                  setBulkHint(null);
                  setBulkBusy("update-tags");
                  try {
                    const result = await reanalyzeAllAppBookmarks(10);
                    const issues = getTagUpdateIssues(result);
                    setBulkHint(
                      issues ??
                        `已启动更新 ${result.processed} 条；已完成 ${result.active}/${result.total} 条，待获取 ${result.pending} 条。`,
                    );
                    await onRefresh();
                  } catch (err) {
                    setBulkHint(err instanceof Error ? err.message : "更新标签失败");
                  } finally {
                    setBulkBusy(null);
                  }
                }}
              >
                {bulkBusy === "update-tags" ? "更新中…" : "更新标签"}
              </Button>
            </div>
            {bulkHint ? <p className="text-xs text-muted-foreground">{bulkHint}</p> : null}
            <p className="text-xs text-muted-foreground">
              链接与标题来自 <strong className="text-foreground">chrome.bookmarks</strong>
              ；标签、文件夹建议、描述仅保存在本扩展的{" "}
              <strong className="text-foreground">chrome.storage.local</strong>
              ，通过书签 ID 与 Chrome 收藏对应，<strong className="text-foreground">不会</strong>
              修改 Chrome 里书签网页的名称。
            </p>
          </CardContent>
        </Card>

        {/* Bookmark grid */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              当前页面共 {bookmarks.length} 张卡片（全部 {allBookmarks.length} 条）
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {loading ? (
              <Card className="col-span-full">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Loading your Chrome bookmarks...
                </CardContent>
              </Card>
            ) : null}
            {!loading && error ? (
              <Card className="col-span-full">
                <CardContent className="py-6 text-center text-sm text-destructive">
                  {error}
                </CardContent>
              </Card>
            ) : null}
            {!loading && !error && bookmarks.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  No bookmarks found. Save a page from the popup to start.
                </CardContent>
              </Card>
            ) : null}
            {!loading && !error && bookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.bookmarkId} bookmark={bookmark} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function BookmarkCard({ bookmark }: { bookmark: BookmarkMetadata }) {
  const isFetchingTags = bookmark.status === "pending_review" && bookmark.tags.length === 0;
  const visibleTags = isFetchingTags ? ["正在获取"] : bookmark.tags.slice(0, 3);

  return (
    <a
      href={bookmark.url}
      rel="noreferrer"
      target="_blank"
      className="block min-w-0 rounded-2xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(event) => {
        event.preventDefault();
        openBookmarkUrl(bookmark.url);
      }}
    >
      <Card className="h-[390px] overflow-hidden py-0 transition-colors hover:bg-accent">
        <div className="h-[208px] overflow-hidden p-1">
          <SiteBookmarkThumbnail className="h-full rounded-xl" url={bookmark.url} variant="card" />
        </div>
        <CardHeader className="space-y-3 px-5 pt-5">
          <h3 className="line-clamp-1 text-base font-medium">{bookmark.title}</h3>
          <div className="flex gap-2 overflow-hidden whitespace-nowrap">
            {visibleTags.map((tag, idx) => (
              <Pill key={`${tag}-${idx}`}>{tag}</Pill>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {bookmark.description ||
              (isFetchingTags
                ? "正在通过 Jina Reader + Firecrawl/Crawl4AI 获取并交叉验证三个标签。"
                : "")}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon icon={Globe02Icon} className="size-3.5" />
            <span className="min-w-0 truncate underline-offset-4 hover:text-foreground hover:underline">
              {getShortUrl(bookmark.url)}
            </span>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

type TagUpdateResult = Awaited<ReturnType<typeof reanalyzeAllAppBookmarks>>;

function getTagUpdateIssues(result: TagUpdateResult) {
  if (!result.config?.hasAiKey) {
    return `后端已连接，但 AI Key 没有配置到扩展设置中。请到 Settings > AI API 开启"使用自己的 API Key"，填写 OpenRouter Key 后保存；当前模型：${result.config?.model ?? "unknown"}。`;
  }

  if (!result.config.hasMethodTwo) {
    return `后端已连接，方法一可执行，但方法二缺少配置：请在 Settings > AI API 填写 Firecrawl API Key 或 Crawl4AI Endpoint。严格双验证没有方法二时会一直显示\u201C正在获取\u201D。`;
  }

  if (result.sampleErrors.length > 0) {
    return `后端已连接，但打标仍失败：${result.sampleErrors[0]}。已完成 ${result.active}/${result.total} 条，待获取 ${result.pending} 条。`;
  }

  if (result.pending > 0) {
    return `已启动更新 ${result.processed} 条；已完成 ${result.active}/${result.total} 条，待获取 ${result.pending} 条。后台会继续分批处理。`;
  }

  return null;
}

createRoot(document.getElementById("root")!).render(<AppRoot />);
