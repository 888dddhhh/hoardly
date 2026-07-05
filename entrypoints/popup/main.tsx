import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FolderKanban,
  Loader2,
  Settings,
} from "lucide-react";
import "../../src/styles/globals.css";
import { SiteBookmarkThumbnail } from "../../src/components/site-bookmark-thumbnail";
import { Button } from "../../src/components/ui/button";
import { Card, CardContent } from "../../src/components/ui/card";
import { Icon } from "../../src/components/ui/icon";
import { Input } from "../../src/components/ui/input";
import { Separator } from "../../src/components/ui/separator";
import {
  getHostname,
  loadHoardlyLibrary,
  saveHoardlyLibrary,
  upsertCapturedCard,
} from "../../src/lib/hoardly-capture";
import {
  type BookmarkCreateInput,
  createAppBookmark,
  getActiveTabBookmarkInput,
  openBookmarkUrl,
  openExtensionPage,
} from "../../src/lib/bookmark-service";
import type { HoardlyCardType, HoardlyProject } from "../../src/types/hoardly";

const LAST_PROJECT_STORAGE_KEY = "hoardly:popup:last-project-id";
const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

function PopupApp() {
  const [currentTab, setCurrentTab] = useState<BookmarkCreateInput | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [includeThread, setIncludeThread] = useState(false);
  const [activeProjects] = useState<HoardlyProject[]>(() =>
    loadHoardlyLibrary().projects.filter((project) => project.status === "active"),
  );
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(LAST_PROJECT_STORAGE_KEY) ?? "";
  });

  const selectedProject = activeProjects.find((project) => project.id === selectedProjectId);
  const captureInput = currentTab?.url ? currentTab : { url: urlInput };
  const previewUrl = urlInput.trim() || currentTab?.url || "";
  const previewTitle = currentTab?.title || (previewUrl ? getHostname(previewUrl) : "当前页面不可采集");
  const showThreadOption = isThreadCapableUrl(previewUrl);

  useEffect(() => {
    let cancelled = false;

    async function loadPopupData() {
      try {
        setLoading(true);
        const activeTab = await getActiveTabBookmarkInput();
        if (cancelled) return;
        setCurrentTab(activeTab);
        if (activeTab?.url) setUrlInput(activeTab.url);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "无法读取当前标签页。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPopupData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      window.localStorage.removeItem(LAST_PROJECT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, selectedProjectId);
  }, [selectedProjectId]);

  const openHoardly = async (section?: "settings") => {
    const webAppUrl = env.VITE_HOARDLY_WEB_APP_URL?.trim();
    if (webAppUrl) {
      const url = new URL(webAppUrl);
      if (section) url.searchParams.set("section", section);
      openBookmarkUrl(url.toString());
      return;
    }

    await openExtensionPage(section === "settings" ? "/app.html?section=settings" : "/app.html");
  };

  const saveToHoardly = async (input: BookmarkCreateInput = captureInput) => {
    const url = input.url?.trim();
    if (!url) {
      setError("请粘贴链接或打开一个可采集网页。");
      return;
    }

    setError("");
    setNotice("");
    setSaving(true);

    try {
      const capturePayload = {
        includeThread: includeThread && showThreadOption,
        projectIds: selectedProjectId ? [selectedProjectId] : [],
        source: "extension",
        title: input.title || previewTitle,
        url,
      } as const;
      const captureResult = upsertCapturedCard(loadHoardlyLibrary(), capturePayload);
      const bookmark = await createAppBookmark({
        title: captureResult.card.titleOriginal,
        url: captureResult.card.url ?? url,
      });
      saveHoardlyLibrary(captureResult.library);
      const projectText = selectedProject ? ` · ${selectedProject.name}` : "";
      const threadText = includeThread && showThreadOption ? " · 含线程请求" : "";
      const statusText =
        captureResult.status === "duplicate"
          ? "已关联已有卡片"
          : captureResult.status === "restored"
            ? "已恢复已有卡片"
            : "已创建卡片";
      setNotice(
        `已保存 ${getHostname(bookmark.url)} · ${cardTypeLabel(captureResult.card.type)} · ${statusText}${projectText}${threadText}`,
      );
      setUrlInput(bookmark.url);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="dark w-[390px] bg-background p-4 text-foreground">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Icon icon={Bookmark} className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Hoardly</h1>
            <p className="truncate text-xs text-muted-foreground">保存到个人知识资产库</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="打开设置"
          onClick={() => void openHoardly("settings")}
        >
          <Icon icon={Settings} className="size-5" />
        </Button>
      </header>

      <section className="space-y-3">
        <Card>
          <CardContent className="space-y-3 p-3">
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <SiteBookmarkThumbnail url={previewUrl} variant="tile" />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  {loading ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Bookmark className="size-4 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{previewTitle}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {previewUrl ? getHostname(previewUrl) : "粘贴链接后保存"}
                </p>
              </div>
            </div>

            <Input
              className="h-10"
              placeholder="粘贴链接..."
              value={urlInput}
              onChange={(event) => {
                setUrlInput(event.target.value);
                setNotice("");
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveToHoardly({ url: urlInput });
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-3">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <FolderKanban className="size-4" />
                项目
              </p>
              <div className="relative">
                <select
                  className="h-10 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                >
                  <option value="">全部流，不加入项目</option>
                  {activeProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {selectedProject ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1.5 text-xs"
                onClick={() => setSelectedProjectId("")}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: selectedProject.color }}
                />
                上次项目：{selectedProject.name}
              </button>
            ) : null}

            {showThreadOption ? (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <span>一并收藏回复/线程</span>
                <input
                  checked={includeThread}
                  type="checkbox"
                  onChange={(event) => setIncludeThread(event.target.checked)}
                />
              </label>
            ) : null}
          </CardContent>
        </Card>

        <Button
          className="h-11 w-full gap-2"
          disabled={saving || loading || !previewUrl.trim()}
          onClick={() => void saveToHoardly(captureInput)}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          保存到 Hoardly
        </Button>

        {notice ? (
          <div className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="text-muted-foreground">{notice}</p>
            <Button className="mt-2 w-full gap-2" variant="outline" onClick={() => void openHoardly()}>
              在 Hoardly 查看
              <ExternalLink className="size-4" />
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </section>

      <Separator className="my-4" />

      <footer className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="gap-2" onClick={() => void openHoardly()}>
          打开 Hoardly
          <ExternalLink className="size-4" />
        </Button>
        <Button variant="ghost" className="gap-2" onClick={() => void openHoardly("settings")}>
          设置
          <Settings className="size-4" />
        </Button>
      </footer>
    </main>
  );
}

function isThreadCapableUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return /(^|\.)reddit\.com$|(^|\.)redd\.it$|(^|\.)x\.com$|(^|\.)twitter\.com$/.test(hostname);
  } catch {
    return false;
  }
}

function cardTypeLabel(type: HoardlyCardType) {
  const labels: Partial<Record<HoardlyCardType, string>> = {
    bilibili: "B站",
    douyin: "抖音",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    medium: "Medium",
    note: "笔记",
    reddit: "Reddit",
    threads: "Threads",
    tiktok: "TikTok",
    tweet: "X",
    web: "网页",
    wechat: "公众号",
    xhs: "小红书",
    youtube: "YouTube",
  };
  return labels[type] ?? "卡片";
}

createRoot(document.getElementById("root")!).render(<PopupApp />);
