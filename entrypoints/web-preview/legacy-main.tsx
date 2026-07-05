import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  CreditCard,
  DollarSign,
  Edit3,
  Crown,
  Ban,
  Folder,
  Gauge,
  Globe2,
  GripVertical,
  Link2,
  ListPlus,
  Loader2,
  Mic,
  Moon,
  Paperclip,
  ImagePlus,
  Lightbulb,
  Telescope,
  MoreHorizontal,
  Plus,
  Coffee,
  QrCode,
  Search,
  Shield,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trash2,
  UserCircle,
  UserMinus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import "../../src/styles/globals.css";
import "../../src/styles/web-preview.css";
import { Avatar, AvatarFallback, AvatarImage } from "../../src/components/ui/avatar";
import "../../src/styles/auth.css";
import { AuthPanel } from "../../src/components/auth-panel";
import { Button } from "../../src/components/ui/button";
import { runBookmarkAiSearch } from "../../src/lib/ai-client";
import {
  loadAiUserSettings,
  saveAiUserSettings,
  type AiUserProvider,
  type AiUserSettings,
} from "../../src/lib/ai-user-settings";
import { analyzeBookmarkLocally } from "../../src/lib/bookmark-analyzer";
import { classifyBookmarksWithAi } from "../../src/lib/bookmark-ai-classify";
import { checkBookmarkUrls } from "../../src/lib/bookmark-url-check";
import {
  fetchChromeBookmarksViaExtension,
  fetchChromeInvalidRecordsViaExtension,
  getChromeExtensionIdForBridge,
  setChromeExtensionIdForBridge,
} from "../../src/lib/extension-bookmark-bridge";
import type { InvalidBookmarkRecord } from "../../src/lib/invalid-links";
import { mockAccount, mockAdminMetrics, mockBookmarks } from "../../src/lib/mock-data";
import type { BookmarkMetadata } from "../../src/types/bookmark";

type CategoryMode = "tags" | "folders";
type ThemeMode = "dark" | "light";
type CategoryItem = { name: string; count: number };
type LocaleCode =
  | "en"
  | "zh-CN"
  | "zh-TW"
  | "es"
  | "fr"
  | "de"
  | "ja"
  | "ko"
  | "pt"
  | "ar";
type PreviewAiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: string;
};

const LANGUAGE_OPTIONS: Array<{ code: LocaleCode; label: string; nativeName: string }> = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "zh-CN", label: "Simplified Chinese", nativeName: "简体中文" },
  { code: "zh-TW", label: "Traditional Chinese", nativeName: "繁體中文" },
  { code: "es", label: "Spanish", nativeName: "Español" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "de", label: "German", nativeName: "Deutsch" },
  { code: "ja", label: "Japanese", nativeName: "日本語" },
  { code: "ko", label: "Korean", nativeName: "한국어" },
  { code: "pt", label: "Portuguese", nativeName: "Português" },
  { code: "ar", label: "Arabic", nativeName: "العربية" },
];

const I18N: Record<LocaleCode, Record<string, string>> = {
  en: {
    preferences: "Preferences",
    interfaceLanguage: "Interface language",
    currentPageCards: "Cards on this page",
    validTags: "Valid tags",
    invalidTags: "Invalid tags",
    profileSettings: "Profile / Settings",
    askPlaceholder: "Ask Hoardly to organize your bookmarks",
  },
  "zh-CN": {
    preferences: "偏好设定",
    interfaceLanguage: "界面语言",
    currentPageCards: "当前页面共",
    validTags: "有效标签",
    invalidTags: "失效标签",
    profileSettings: "我的头像 / 设置",
    askPlaceholder: "问 Hoardly 帮你整理书签",
  },
  "zh-TW": {
    preferences: "偏好設定",
    interfaceLanguage: "介面語言",
    currentPageCards: "目前頁面共",
    validTags: "有效標籤",
    invalidTags: "失效標籤",
    profileSettings: "我的頭像 / 設定",
    askPlaceholder: "問 Hoardly 幫你整理書籤",
  },
  es: {
    preferences: "Preferencias",
    interfaceLanguage: "Idioma de la interfaz",
    currentPageCards: "Tarjetas en esta página",
    validTags: "Etiquetas válidas",
    invalidTags: "Etiquetas no válidas",
    profileSettings: "Perfil / Ajustes",
    askPlaceholder: "Pide a Hoardly que organice tus marcadores",
  },
  fr: {
    preferences: "Préférences",
    interfaceLanguage: "Langue de l’interface",
    currentPageCards: "Cartes sur cette page",
    validTags: "Tags valides",
    invalidTags: "Tags invalides",
    profileSettings: "Profil / Réglages",
    askPlaceholder: "Demandez à Hoardly d’organiser vos favoris",
  },
  de: {
    preferences: "Einstellungen",
    interfaceLanguage: "Oberflächensprache",
    currentPageCards: "Karten auf dieser Seite",
    validTags: "Gültige Tags",
    invalidTags: "Ungültige Tags",
    profileSettings: "Profil / Einstellungen",
    askPlaceholder: "Bitte Hoardly, deine Lesezeichen zu organisieren",
  },
  ja: {
    preferences: "設定",
    interfaceLanguage: "表示言語",
    currentPageCards: "このページのカード数",
    validTags: "有効なタグ",
    invalidTags: "無効なタグ",
    profileSettings: "プロフィール / 設定",
    askPlaceholder: "Hoardly にブックマーク整理を依頼",
  },
  ko: {
    preferences: "환경설정",
    interfaceLanguage: "인터페이스 언어",
    currentPageCards: "현재 페이지 카드 수",
    validTags: "유효한 태그",
    invalidTags: "무효 태그",
    profileSettings: "프로필 / 설정",
    askPlaceholder: "Hoardly에게 북마크 정리를 요청",
  },
  pt: {
    preferences: "Preferências",
    interfaceLanguage: "Idioma da interface",
    currentPageCards: "Cartões nesta página",
    validTags: "Tags válidas",
    invalidTags: "Tags inválidas",
    profileSettings: "Perfil / Configurações",
    askPlaceholder: "Peça ao Hoardly para organizar seus favoritos",
  },
  ar: {
    preferences: "التفضيلات",
    interfaceLanguage: "لغة الواجهة",
    currentPageCards: "البطاقات في هذه الصفحة",
    validTags: "الوسوم الصالحة",
    invalidTags: "الوسوم غير الصالحة",
    profileSettings: "الملف الشخصي / الإعدادات",
    askPlaceholder: "اطلب من Hoardly تنظيم إشاراتك المرجعية",
  },
};

function t(locale: LocaleCode, key: keyof (typeof I18N)["en"]) {
  return I18N[locale]?.[key] ?? I18N.en[key];
}

function getInitialLocale(): LocaleCode {
  const stored = window.localStorage.getItem("hoardly:locale");
  return LANGUAGE_OPTIONS.some((language) => language.code === stored)
    ? (stored as LocaleCode)
    : "zh-CN";
}

type InvalidListItem = {
  id: string;
  title: string;
  url: string;
  description: string;
  tags: string[];
  originalFolder: string;
  reason: string;
  /** 从书签列表移入失效区时保留，用于恢复时写回同一 bookmarkId */
  sourceBookmarkId?: string;
};

const invalidItems: InvalidListItem[] = [
  {
    id: "invalid-1",
    title: "Old research link",
    url: "https://expired.example.com",
    description: "A previously saved research page that may no longer work.",
    tags: ["失效", "research"],
    originalFolder: "Research",
    reason: "HTTP 404",
  },
  {
    id: "invalid-2",
    title: "Archived trading report",
    url: "https://markets.example.com/report",
    description: "A market report that failed the latest availability check.",
    tags: ["失效", "finance"],
    originalFolder: "Finance",
    reason: "DNS failed",
  },
  {
    id: "invalid-3",
    title: "Removed AI tool page",
    url: "https://tools.example.com/old-ai",
    description: "An AI tool page that timed out during the daily invalid link review.",
    tags: ["失效", "ai"],
    originalFolder: "AI Tools",
    reason: "Timeout",
  },
  {
    id: "invalid-4",
    title: "Deprecated chart dashboard",
    url: "https://charts.example.com/legacy-dashboard",
    description: "A saved dashboard that no longer responds to daily availability checks.",
    tags: ["失效", "charts"],
    originalFolder: "Finance",
    reason: "HTTP 410",
  },
  {
    id: "invalid-5",
    title: "Old agent benchmark",
    url: "https://agents.example.com/benchmark-2024",
    description: "An outdated agent benchmark page that now redirects to an unavailable resource.",
    tags: ["失效", "agents"],
    originalFolder: "Automation",
    reason: "Redirect failed",
  },
  {
    id: "invalid-6",
    title: "Archived research paper",
    url: "https://papers.example.com/archive/ai-systems",
    description: "A research paper archive link that failed DNS resolution during review.",
    tags: ["失效", "research"],
    originalFolder: "Research",
    reason: "DNS failed",
  },
  {
    id: "invalid-7",
    title: "Removed trading notes",
    url: "https://notes.example.com/trading-ideas",
    description: "A saved trading note collection that now returns a server error.",
    tags: ["失效", "finance"],
    originalFolder: "Finance",
    reason: "HTTP 500",
  },
  {
    id: "invalid-8",
    title: "Unavailable AI prompt library",
    url: "https://prompts.example.com/library",
    description: "A prompt library bookmark that is no longer reachable.",
    tags: ["失效", "ai"],
    originalFolder: "AI Tools",
    reason: "Network error",
  },
];

function mapInvalidRecordsToPreviewItems(records: InvalidBookmarkRecord[]): InvalidListItem[] {
  return records.map((record) => ({
    id: `chrome-inv-${record.bookmarkId}`,
    sourceBookmarkId: record.bookmarkId,
    title: record.title,
    url: record.url,
    description: "来自扩展存储的失效链接记录",
    tags: ["失效"],
    originalFolder: record.originalFolder ?? "Unsorted",
    reason: record.reason,
  }));
}

function applyAiBookmarkCommand(
  prompt: string,
  controls: {
    emptyFolders: CategoryItem[];
    emptyTags: CategoryItem[];
    previewBookmarks: typeof mockBookmarks;
    setActiveSection: React.Dispatch<React.SetStateAction<"bookmarks" | "invalid" | "settings">>;
    setBookmarkSearch: (value: string) => void;
    setCategoryMode: (mode: CategoryMode) => void;
    setEmptyFolders: React.Dispatch<React.SetStateAction<CategoryItem[]>>;
    setEmptyTags: React.Dispatch<React.SetStateAction<CategoryItem[]>>;
    setSelectedFolder: (folder: string | null) => void;
    setSelectedTag: (tag: string | null) => void;
  },
) {
  const normalized = prompt.trim();
  const tagToCreate = extractCommandValue(normalized, /(?:创建|新建|添加).{0,6}(?:tag|标签)\s*[：: ]?(.+)/i);
  const folderToCreate = extractCommandValue(
    normalized,
    /(?:创建|新建|添加).{0,6}(?:folder|文件夹)\s*[：: ]?(.+)/i,
  );

  controls.setActiveSection("bookmarks");

  if (tagToCreate) {
    const existing = getTagItems(controls.previewBookmarks)
      .concat(controls.emptyTags)
      .map((item) => item.name);
    const nextName = getUniqueTagName(existing, tagToCreate);
    controls.setCategoryMode("tags");
    controls.setSelectedFolder(null);
    controls.setSelectedTag(nextName);
    controls.setBookmarkSearch("");
    controls.setEmptyTags((current) =>
      current.some((item) => item.name === nextName)
        ? current
        : [...current, { name: nextName, count: 0 }],
    );
    return `已创建 Tag：#${nextName}，并切换到该 Tag。`;
  }

  if (folderToCreate) {
    const existing = getFolderItems(controls.previewBookmarks)
      .concat(controls.emptyFolders)
      .map((item) => item.name);
    const nextName = getUniqueTagName(existing, folderToCreate);
    controls.setCategoryMode("folders");
    controls.setSelectedTag(null);
    controls.setSelectedFolder(nextName);
    controls.setBookmarkSearch("");
    controls.setEmptyFolders((current) =>
      current.some((item) => item.name === nextName)
        ? current
        : [...current, { name: nextName, count: 0 }],
    );
    return `已创建文件夹：${nextName}，并切换到该文件夹。`;
  }

  const searchTerm = extractSearchTerm(normalized);
  if (!searchTerm) return null;

  const tag = getTagItems(controls.previewBookmarks)
    .concat(controls.emptyTags)
    .find((item) => item.name.toLowerCase() === searchTerm.toLowerCase());
  if (tag && /tag|标签|#/.test(normalized)) {
    controls.setCategoryMode("tags");
    controls.setSelectedTag(tag.name);
    controls.setSelectedFolder(null);
    controls.setBookmarkSearch("");
    return `已切换到 Tag：#${tag.name}。`;
  }

  const folder = getFolderItems(controls.previewBookmarks)
    .concat(controls.emptyFolders)
    .find((item) => item.name.toLowerCase() === searchTerm.toLowerCase());
  if (folder && /folder|文件夹/.test(normalized)) {
    controls.setCategoryMode("folders");
    controls.setSelectedFolder(folder.name);
    controls.setSelectedTag(null);
    controls.setBookmarkSearch("");
    return `已切换到文件夹：${folder.name}。`;
  }

  controls.setSelectedTag(null);
  controls.setSelectedFolder(null);
  controls.setBookmarkSearch(searchTerm);
  return `已在当前书签中搜索：${searchTerm}。`;
}

function extractCommandValue(value: string, pattern: RegExp) {
  const match = value.match(pattern)?.[1]?.trim();
  if (!match) return null;
  return cleanCommandValue(match);
}

function extractSearchTerm(value: string) {
  const hashTag = value.match(/#([\w-]+)/)?.[1];
  if (hashTag) return hashTag;

  const known = ["finance", "research", "charts", "agents", "ai", "失效"].find((term) =>
    value.toLowerCase().includes(term.toLowerCase()),
  );
  if (known) return known;

  const direct = value.match(/(?:搜索|查找|找一下|找|search)\s*[：: ]?(.+)/i)?.[1];
  if (direct) return cleanCommandValue(direct);

  return null;
}

function cleanCommandValue(value: string) {
  return value
    .replace(/^(tag|标签|folder|文件夹|网页|书签|链接)\s*[：: ]?/i, "")
    .replace(/[。.!！?？,，].*$/, "")
    .trim();
}

function WebPreviewApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [locale, setLocale] = useState<LocaleCode>(() => getInitialLocale());
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [activeSection, setActiveSection] = useState<"bookmarks" | "invalid" | "settings">(
    "bookmarks",
  );
  const [previewBookmarks, setPreviewBookmarks] = useState(mockBookmarks);
  const [previewInvalidItems, setPreviewInvalidItems] = useState<InvalidListItem[]>(invalidItems);
  const [bookmarkToolBusy, setBookmarkToolBusy] = useState<null | "ai-tags" | "check-urls" | "local">(
    null,
  );
  const [bookmarkToolMessage, setBookmarkToolMessage] = useState<string | null>(null);
  const [bookmarkDataSource, setBookmarkDataSource] = useState<"mock" | "chrome">("mock");
  const [extensionIdDraft, setExtensionIdDraft] = useState(() =>
    typeof window !== "undefined" ? getChromeExtensionIdForBridge() : "",
  );
  const [chromeBridgeMessage, setChromeBridgeMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(mockAccount.displayName);
  const [categoryMode, setCategoryMode] = useState<CategoryMode>("tags");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [emptyTags, setEmptyTags] = useState<CategoryItem[]>([]);
  const [emptyFolders, setEmptyFolders] = useState<CategoryItem[]>([]);
  const [bookmarkSearch, setBookmarkSearch] = useState("");
  const [query, setQuery] = useState("");
  const [cardMenuFor, setCardMenuFor] = useState<string | null>(null);
  const [cardRenameId, setCardRenameId] = useState<string | null>(null);
  const [cardRenameValue, setCardRenameValue] = useState("");
  const [chatExpanded, setChatExpanded] = useState(false);
  const [aiMessages, setAiMessages] = useState<PreviewAiMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const isComplexQuery = isComplexAiQuery(query);

  const loadChromeBookmarks = async (rawId: string) => {
    const id = rawId.trim();
    setChromeBridgeMessage(null);
    if (!id) {
      setChromeBridgeMessage("请填写 Chrome 扩展 ID（chrome://extensions → 开发者模式 → 复制）。");
      return;
    }
    setChromeExtensionIdForBridge(id);
    const book = await fetchChromeBookmarksViaExtension(id);
    if (!book.ok) {
      setBookmarkDataSource("mock");
      setChromeBridgeMessage(book.error);
      return;
    }
    setPreviewBookmarks(book.data);
    setBookmarkDataSource("chrome");
    setChromeBridgeMessage(`已从本机 Chrome 加载 ${book.data.length} 条书签。`);
    const inv = await fetchChromeInvalidRecordsViaExtension(id);
    if (inv.ok && inv.data.length > 0) {
      setPreviewInvalidItems(mapInvalidRecordsToPreviewItems(inv.data));
    } else if (inv.ok) {
      setPreviewInvalidItems([]);
    }
  };

  useEffect(() => {
    const id = getChromeExtensionIdForBridge();
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const book = await fetchChromeBookmarksViaExtension(id);
      if (cancelled) return;
      if (!book.ok) {
        setChromeBridgeMessage(book.error);
        return;
      }
      setPreviewBookmarks(book.data);
      setBookmarkDataSource("chrome");
      setChromeBridgeMessage(`已自动从 Chrome 加载 ${book.data.length} 条书签。`);
      const inv = await fetchChromeInvalidRecordsViaExtension(id);
      if (cancelled) return;
      if (inv.ok && inv.data.length > 0) {
        setPreviewInvalidItems(mapInvalidRecordsToPreviewItems(inv.data));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const restoreInvalidItem = (item: InvalidListItem) => {
    const bookmarkId = item.sourceBookmarkId ?? `restored-${item.id}-${Date.now()}`;
    setPreviewBookmarks((current) => [
      {
        bookmarkId,
        confidence: 0.72,
        description: item.description,
        folderSuggestion: item.originalFolder,
        sourcePlatform: getHostname(item.url),
        status: "active",
        tags: item.tags.filter((tag) => tag !== "失效"),
        title: item.title,
        url: item.url,
      },
      ...current,
    ]);
    setPreviewInvalidItems((current) => current.filter((invalid) => invalid.id !== item.id));
  };

  const deleteInvalidItem = (id: string) => {
    setPreviewInvalidItems((current) => current.filter((item) => item.id !== id));
  };

  const restoreAllInvalidItems = () => {
    previewInvalidItems.forEach((item) => restoreInvalidItem(item));
  };

  const beginRenameBookmarkCard = (bookmark: (typeof mockBookmarks)[number]) => {
    setCardRenameId(bookmark.bookmarkId);
    setCardRenameValue(bookmark.title);
    setCardMenuFor(null);
  };

  const commitRenameBookmarkCard = () => {
    const nextTitle = cardRenameValue.trim();
    const bookmarkId = cardRenameId;
    setCardRenameId(null);
    setCardRenameValue("");
    if (!bookmarkId || !nextTitle) return;

    setPreviewBookmarks((current) =>
      current.map((bookmark) =>
        bookmark.bookmarkId === bookmarkId ? { ...bookmark, title: nextTitle } : bookmark,
      ),
    );
  };

  const deleteBookmarkCard = (bookmarkId: string) => {
    setPreviewBookmarks((current) => current.filter((bookmark) => bookmark.bookmarkId !== bookmarkId));
    setCardMenuFor(null);
  };

  useEffect(() => {
    if (isComplexQuery) setChatExpanded(true);
  }, [isComplexQuery]);

  useEffect(() => {
    window.localStorage.setItem("hoardly:locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const categoryItems = useMemo(() => {
    return categoryMode === "tags"
      ? getTagItems(previewBookmarks)
      : getFolderItems(previewBookmarks);
  }, [categoryMode, previewBookmarks]);

  const bookmarks = useMemo(() => {
    const keyword = (bookmarkSearch || (!isComplexQuery ? query : "")).trim().toLowerCase();
    return previewBookmarks.filter((bookmark) => {
      const folder = bookmark.folderSuggestion ?? "Unsorted";
      const matchesTag =
        categoryMode === "tags" && selectedTag ? bookmark.tags.includes(selectedTag) : true;
      const matchesFolder =
        categoryMode === "folders" && selectedFolder ? folder === selectedFolder : true;
      const searchable = [
        bookmark.title,
        bookmark.url,
        bookmark.description ?? "",
        bookmark.folderSuggestion ?? "",
        ...bookmark.tags,
      ]
        .join(" ")
        .toLowerCase();
      const matchesKeyword = keyword ? searchable.includes(keyword) : true;
      return matchesTag && matchesFolder && matchesKeyword;
    });
  }, [bookmarkSearch, categoryMode, isComplexQuery, previewBookmarks, query, selectedFolder, selectedTag]);

  const submitAiQuery = async () => {
    const prompt = query.trim();
    if (!prompt || aiLoading) return;

    setChatExpanded(true);
    setAiError(null);
    setAiLoading(true);
    const commandResult = applyAiBookmarkCommand(prompt, {
      emptyFolders,
      emptyTags,
      previewBookmarks,
      setActiveSection,
      setBookmarkSearch,
      setCategoryMode,
      setEmptyFolders,
      setEmptyTags,
      setSelectedFolder,
      setSelectedTag,
    });
    setAiMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: prompt,
      },
    ]);

    try {
      const result = await runBookmarkAiSearch({
        query: prompt,
        bookmarks: previewBookmarks,
      });
      setAiMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: commandResult ? `${commandResult}\n\n${result.answer}` : result.answer,
          meta: `${result.provider} / ${result.model}`,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 请求失败，请稍后重试。";
      setAiError(message);
      setAiMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: message,
          meta: "Provider setup required",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const runLocalTagRules = () => {
    setBookmarkToolMessage(null);
    setBookmarkToolBusy("local");
    try {
      setPreviewBookmarks((prev) =>
        prev.map((b) =>
          analyzeBookmarkLocally({
            bookmarkId: b.bookmarkId,
            title: b.title,
            url: b.url,
          }),
        ),
      );
      setBookmarkToolMessage("已使用本地规则更新标签与文件夹建议（无需 API）。");
    } finally {
      setBookmarkToolBusy(null);
    }
  };

  const runAiTagJob = async () => {
    setBookmarkToolMessage(null);
    setBookmarkToolBusy("ai-tags");
    try {
      const next = await classifyBookmarksWithAi(previewBookmarks);
      setPreviewBookmarks(next);
      setBookmarkToolMessage("已使用 AI 更新当前列表中的标签与文件夹建议。");
    } catch (error) {
      setBookmarkToolMessage(
        error instanceof Error ? error.message : "AI 打标签失败，请检查设置中的 API。",
      );
    } finally {
      setBookmarkToolBusy(null);
    }
  };

  const runInvalidLinkCheck = async () => {
    setBookmarkToolMessage(null);
    setBookmarkToolBusy("check-urls");
    try {
      const urls = previewBookmarks.map((b) => b.url);
      const results = await checkBookmarkUrls(urls.slice(0, 30));
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        setBookmarkToolMessage("已检测前 30 条链接：未发现明显不可访问项（仍可能有误报）。");
        return;
      }
      const failedUrls = new Set(failed.map((f) => f.url));
      const toMove = previewBookmarks.filter((b) => failedUrls.has(b.url));
      const newInvalid: InvalidListItem[] = toMove.map((bm, index) => ({
        id: `invalid-${bm.bookmarkId}-${Date.now()}-${index}`,
        sourceBookmarkId: bm.bookmarkId,
        title: bm.title,
        url: bm.url,
        description: bm.description ?? "由链接可用性检测自动移入。",
        tags: Array.from(new Set(["失效", ...bm.tags])),
        originalFolder: bm.folderSuggestion ?? "Unsorted",
        reason: failed.find((f) => f.url === bm.url)?.reason ?? "不可访问",
      }));
      setPreviewInvalidItems((prev) => [...prev, ...newInvalid]);
      setPreviewBookmarks((prev) => prev.filter((b) => !failedUrls.has(b.url)));
      setBookmarkToolMessage(`已将 ${newInvalid.length} 条疑似失效书签移到「失效标签」视图。`);
      setActiveSection("invalid");
    } catch (error) {
      setBookmarkToolMessage(
        error instanceof Error ? error.message : "链接检测失败。预览环境请使用 npm run dev:h5。",
      );
    } finally {
      setBookmarkToolBusy(null);
    }
  };

  if (!authenticated) {
    return (
      <main className={`auth-page ${theme}`}>
        <AuthPanel onAuthenticated={() => setAuthenticated(true)} />
      </main>
    );
  }

  return (
    <main className={`preview-shell ${theme}`}>
      <aside className="icon-rail">
        <button
          className="rail-button logo-button"
          title="Hoardly Logo"
          onClick={() => setActiveSection("bookmarks")}
        >
          <img alt="Hoardly" src="/hoardly-logo.png" />
        </button>

        <div className="rail-center">
          <button
            className={`rail-button ${activeSection === "bookmarks" ? "active" : ""}`}
            title={t(locale, "validTags")}
            onClick={() => setActiveSection("bookmarks")}
          >
            <TagMark active={activeSection === "bookmarks"} />
          </button>
          <button
            className={`rail-button ${activeSection === "invalid" ? "active" : ""}`}
            title={t(locale, "invalidTags")}
            onClick={() => setActiveSection("invalid")}
          >
            <TagMark active={activeSection === "invalid"} />
          </button>
        </div>

        <div className="rail-bottom">
          <button
            className="rail-button"
            title={theme === "dark" ? "暗黑模式：点击切换亮色模式" : "亮色模式：点击切换暗黑模式"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            className={`rail-button ${activeSection === "settings" ? "active" : ""}`}
            title={`${t(locale, "profileSettings")}：${mockAccount.googleEmail}`}
            onClick={() => setActiveSection("settings")}
          >
            <img alt="Avril Lavigne" className="rail-avatar" src="/avril-avatar.png" />
          </button>
        </div>
      </aside>

      {activeSection === "bookmarks" ? (
        <>
          <CategoryPanel
            bookmarks={previewBookmarks}
            categoryMode={categoryMode}
            emptyFolders={emptyFolders}
            emptyTags={emptyTags}
            items={categoryItems}
            selectedFolder={selectedFolder}
            selectedTag={selectedTag}
            setCategoryMode={setCategoryMode}
            setBookmarks={setPreviewBookmarks}
            setEmptyFolders={setEmptyFolders}
            setEmptyTags={setEmptyTags}
            setSelectedFolder={setSelectedFolder}
            setSelectedTag={setSelectedTag}
          />
          <section className="content-panel">
            <div className="chrome-bookmark-bridge mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 text-sm">
              <div className="font-medium text-foreground">
                {bookmarkDataSource === "chrome"
                  ? "当前数据：本机 Chrome 书签（经扩展拉取）"
                  : "当前数据：演示书签（非浏览器真实收藏）"}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                部署在网站上的页面无法直接访问{" "}
                <code className="text-foreground">chrome.bookmarks</code>。请安装本仓库构建的
                Hoardly 扩展，在{" "}
                <code className="text-foreground">manifest.json</code> 已配置{" "}
                <code className="text-foreground">externally_connectable</code>{" "}
                匹配本站域名后，在下方填入扩展 ID 并加载，即可替换为真实书签。
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="min-w-[200px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="扩展 ID，例如abcdefghijklmnop"
                  spellCheck={false}
                  value={extensionIdDraft}
                  onChange={(event) => setExtensionIdDraft(event.target.value)}
                />
                <Button
                  className="shrink-0"
                  type="button"
                  variant="secondary"
                  onClick={() => void loadChromeBookmarks(extensionIdDraft)}
                >
                  从 Chrome 加载
                </Button>
              </div>
              {chromeBridgeMessage ? (
                <p className="text-xs text-muted-foreground">{chromeBridgeMessage}</p>
              ) : null}
            </div>
            <div className="bookmark-core-toolbar">
              <span className="bookmark-core-toolbar-title">书签与 AI</span>
              <button
                type="button"
                className="bookmark-core-tool"
                disabled={bookmarkToolBusy !== null}
                onClick={runLocalTagRules}
              >
                {bookmarkToolBusy === "local" ? "处理中…" : "本地规则分类"}
              </button>
              <button
                type="button"
                className="bookmark-core-tool primary"
                disabled={bookmarkToolBusy !== null}
                onClick={runAiTagJob}
              >
                {bookmarkToolBusy === "ai-tags" ? "AI 处理中…" : "AI 智能打标签"}
              </button>
              <button
                type="button"
                className="bookmark-core-tool"
                disabled={bookmarkToolBusy !== null}
                onClick={runInvalidLinkCheck}
              >
                {bookmarkToolBusy === "check-urls" ? "检测中…" : "检测失效链接"}
              </button>
              {bookmarkToolMessage ? (
                <span className="bookmark-core-toolbar-msg">{bookmarkToolMessage}</span>
              ) : null}
            </div>
            <AiSearchBox
              loading={aiLoading}
              onSubmit={submitAiQuery}
              placeholder={t(locale, "askPlaceholder")}
              query={query}
              setQuery={setQuery}
            />
            {chatExpanded || aiMessages.length > 0 || isComplexQuery ? (
              <AiConversationPanel
                error={aiError}
                expanded={chatExpanded}
                loading={aiLoading}
                messages={aiMessages}
                query={query}
                setExpanded={setChatExpanded}
              />
            ) : null}
            <div className="result-count">
              {t(locale, "currentPageCards")} {bookmarks.length} 张卡片
            </div>
            <div className="bookmark-grid">
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  bookmark={bookmark}
                  editingId={cardRenameId}
                  editingValue={cardRenameValue}
                  key={bookmark.bookmarkId}
                  menuFor={cardMenuFor}
                  onCancelRename={() => setCardRenameId(null)}
                  onCommitRename={commitRenameBookmarkCard}
                  onDelete={() => deleteBookmarkCard(bookmark.bookmarkId)}
                  onMenuChange={setCardMenuFor}
                  onRename={() => beginRenameBookmarkCard(bookmark)}
                  onRenameValueChange={setCardRenameValue}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}

      {activeSection === "invalid" ? (
        <section className="content-panel single-panel">
          <AiSearchBox
            loading={aiLoading}
            onSubmit={submitAiQuery}
            placeholder={t(locale, "askPlaceholder")}
            query={query}
            setQuery={setQuery}
          />
          <div className="invalid-actions">
            <span>失效标签共 {previewInvalidItems.length} 个待确认链接</span>
            <div>
              <button onClick={restoreAllInvalidItems}>
                <CheckCircle2 size={14} />
                整体恢复
              </button>
              <button onClick={() => setPreviewInvalidItems([])}>
                <Trash2 size={14} />
                整体删除
              </button>
            </div>
          </div>
          <div className="bookmark-grid invalid-bookmark-grid">
            {previewInvalidItems.map((item) => (
              <InvalidBookmarkCard
                item={item}
                key={item.id}
                onDelete={() => deleteInvalidItem(item.id)}
                onRestore={() => restoreInvalidItem(item)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {activeSection === "settings" ? (
        <SettingsView
          displayName={displayName}
          locale={locale}
          setDisplayName={setDisplayName}
          setAuthenticated={setAuthenticated}
          setLocale={setLocale}
        />
      ) : null}
    </main>
  );
}

function CategoryPanel({
  bookmarks,
  categoryMode,
  emptyFolders,
  emptyTags,
  items,
  selectedFolder,
  selectedTag,
  setCategoryMode,
  setBookmarks,
  setEmptyFolders,
  setEmptyTags,
  setSelectedFolder,
  setSelectedTag,
}: {
  bookmarks: typeof mockBookmarks;
  categoryMode: CategoryMode;
  emptyFolders: CategoryItem[];
  emptyTags: CategoryItem[];
  items: CategoryItem[];
  selectedFolder: string | null;
  selectedTag: string | null;
  setCategoryMode: (mode: CategoryMode) => void;
  setBookmarks: React.Dispatch<React.SetStateAction<typeof mockBookmarks>>;
  setEmptyFolders: React.Dispatch<React.SetStateAction<CategoryItem[]>>;
  setEmptyTags: React.Dispatch<React.SetStateAction<CategoryItem[]>>;
  setSelectedFolder: (folder: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [tagOrder, setTagOrder] = useState<string[]>([]);
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [dragOverName, setDragOverName] = useState<string | null>(null);
  const [draggingLinkId, setDraggingLinkId] = useState<string | null>(null);
  const [dragOverLinkId, setDragOverLinkId] = useState<string | null>(null);
  const [favoriteSearchOpen, setFavoriteSearchOpen] = useState(false);
  const [favoriteSearch, setFavoriteSearch] = useState("");
  const [allTagSearchOpen, setAllTagSearchOpen] = useState(false);
  const [allTagSearch, setAllTagSearch] = useState("");
  const [editingTagKey, setEditingTagKey] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState<string | null>(null);
  const [editingTagValue, setEditingTagValue] = useState("");
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkValue, setEditingLinkValue] = useState("");

  const currentOrder = categoryMode === "tags" ? tagOrder : folderOrder;
  const availableItems =
    categoryMode === "tags"
      ? mergeCategoryItems(items, emptyTags)
      : mergeCategoryItems(items, emptyFolders);
  const orderedItems = orderItems(availableItems, currentOrder);
  const visibleItems = orderedItems;
  const favoriteTagNames = ["ai", "agents", "finance"];
  const favoriteTags = visibleItems
    .filter((item) => favoriteTagNames.includes(item.name.toLowerCase()))
    .filter((item) =>
      item.name.toLowerCase().includes(favoriteSearch.trim().toLowerCase()),
    );
  const allTags = visibleItems.filter((item) =>
    item.name.toLowerCase().includes(allTagSearch.trim().toLowerCase()),
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (categoryMode === "tags" && event.key === "/" && !isTyping) {
        event.preventDefault();
        setAllTagSearchOpen(true);
      }

      if (event.key === "Escape") {
        setMenuFor(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [categoryMode]);

  const moveCategory = (targetName: string) => {
    if (!draggingName || draggingName === targetName) return;

    const names = orderedItems.map((item) => item.name);
    const fromIndex = names.indexOf(draggingName);
    const toIndex = names.indexOf(targetName);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextNames = [...names];
    const [moved] = nextNames.splice(fromIndex, 1);
    nextNames.splice(toIndex, 0, moved);

    if (categoryMode === "tags") setTagOrder(nextNames);
    else setFolderOrder(nextNames);
  };

  const beginRenameCategory = (name: string, key: string) => {
    setEditingTagKey(key);
    setEditingTagName(name);
    setEditingTagValue(name);
  };

  const commitRenameCategory = () => {
    if (!editingTagName) return;
    const oldName = editingTagName;
    const nextName = editingTagValue.trim();
    setEditingTagKey(null);
    setEditingTagName(null);
    setEditingTagValue("");
    if (!nextName || nextName === oldName) return;

    if (categoryMode === "tags") {
      setBookmarks((current) =>
        current.map((bookmark) => ({
          ...bookmark,
          tags: bookmark.tags.map((tag) => (tag === oldName ? nextName : tag)),
        })),
      );
      setEmptyTags((current) =>
        current.map((tag) => (tag.name === oldName ? { ...tag, name: nextName } : tag)),
      );
      setTagOrder((current) =>
        current.map((tag) => (tag === oldName ? nextName : tag)),
      );
      if (selectedTag === oldName) setSelectedTag(nextName);
    } else {
      setBookmarks((current) =>
        current.map((bookmark) => ({
          ...bookmark,
          folderSuggestion:
            (bookmark.folderSuggestion ?? "Unsorted") === oldName
              ? nextName
              : bookmark.folderSuggestion,
        })),
      );
      setEmptyFolders((current) =>
        current.map((folder) =>
          folder.name === oldName ? { ...folder, name: nextName } : folder,
        ),
      );
      setFolderOrder((current) =>
        current.map((folder) => (folder === oldName ? nextName : folder)),
      );
      if (selectedFolder === oldName) setSelectedFolder(nextName);
    }
  };

  const cancelRenameCategory = () => {
    setEditingTagKey(null);
    setEditingTagName(null);
    setEditingTagValue("");
  };

  const createCategoryNear = (name: string, position: "before" | "after") => {
    const isTagMode = categoryMode === "tags";
    const extras = isTagMode ? emptyTags : emptyFolders;
    const order = isTagMode ? tagOrder : folderOrder;
    const baseName = isTagMode ? "new-tag" : "New Folder";
    const nextName = getUniqueTagName(
      mergeCategoryItems(items, extras).map((item) => item.name),
      baseName,
    );

    if (isTagMode) {
      setEmptyTags((current) =>
        current.some((tag) => tag.name === nextName)
          ? current
          : [...current, { name: nextName, count: 0 }],
      );
    } else {
      setEmptyFolders((current) =>
        current.some((folder) => folder.name === nextName)
          ? current
          : [...current, { name: nextName, count: 0 }],
      );
    }

    const names = orderItems(mergeCategoryItems(items, extras), order).map((item) => item.name);
    const targetIndex = names.indexOf(name);
    const insertIndex =
      targetIndex === -1 ? names.length : position === "before" ? targetIndex : targetIndex + 1;
    const nextOrder = names.filter((itemName) => itemName !== nextName);
    nextOrder.splice(insertIndex, 0, nextName);
    if (isTagMode) setTagOrder(nextOrder);
    else setFolderOrder(nextOrder);
    setEditingTagKey(`${isTagMode ? "all" : "folder"}:${nextName}`);
    setEditingTagName(nextName);
    setEditingTagValue(nextName);
  };

  const deleteCategoryOnly = (name: string) => {
    if (categoryMode === "tags") {
      setBookmarks((current) =>
        current.map((bookmark) => ({
          ...bookmark,
          tags: bookmark.tags.filter((tag) => tag !== name),
        })),
      );
      setEmptyTags((current) => current.filter((tag) => tag.name !== name));
      setTagOrder((current) => current.filter((tag) => tag !== name));
      if (selectedTag === name) setSelectedTag(null);
    } else {
      setBookmarks((current) =>
        current.map((bookmark) => ({
          ...bookmark,
          folderSuggestion:
            (bookmark.folderSuggestion ?? "Unsorted") === name
              ? "Unsorted"
              : bookmark.folderSuggestion,
        })),
      );
      setEmptyFolders((current) => current.filter((folder) => folder.name !== name));
      setFolderOrder((current) => current.filter((folder) => folder !== name));
      if (selectedFolder === name) setSelectedFolder(null);
    }

    if (editingTagName === name) cancelRenameCategory();
  };

  const deleteCategoryAndLinks = (name: string) => {
    if (categoryMode === "tags") {
      setBookmarks((current) =>
        current.filter((bookmark) => !bookmark.tags.includes(name)),
      );
      setEmptyTags((current) => current.filter((tag) => tag.name !== name));
      setTagOrder((current) => current.filter((tag) => tag !== name));
      if (selectedTag === name) setSelectedTag(null);
    } else {
      setBookmarks((current) =>
        current.filter((bookmark) => (bookmark.folderSuggestion ?? "Unsorted") !== name),
      );
      setEmptyFolders((current) => current.filter((folder) => folder.name !== name));
      setFolderOrder((current) => current.filter((folder) => folder !== name));
      if (selectedFolder === name) setSelectedFolder(null);
    }

    if (editingTagName === name) cancelRenameCategory();
  };

  const moveFolderLink = (targetBookmarkId: string) => {
    if (!draggingLinkId || draggingLinkId === targetBookmarkId) return;

    setBookmarks((current) => {
      const fromIndex = current.findIndex((bookmark) => bookmark.bookmarkId === draggingLinkId);
      const toIndex = current.findIndex((bookmark) => bookmark.bookmarkId === targetBookmarkId);
      if (fromIndex < 0 || toIndex < 0) return current;

      const sourceFolder = current[fromIndex].folderSuggestion ?? "Unsorted";
      const targetFolder = current[toIndex].folderSuggestion ?? "Unsorted";
      if (sourceFolder !== targetFolder) return current;

      const nextBookmarks = [...current];
      const [moved] = nextBookmarks.splice(fromIndex, 1);
      const nextTargetIndex = nextBookmarks.findIndex(
        (bookmark) => bookmark.bookmarkId === targetBookmarkId,
      );
      nextBookmarks.splice(nextTargetIndex, 0, moved);
      return nextBookmarks;
    });
  };

  const beginRenameLink = (bookmark: (typeof mockBookmarks)[number]) => {
    setEditingLinkId(bookmark.bookmarkId);
    setEditingLinkValue(bookmark.title);
  };

  const commitRenameLink = () => {
    const nextTitle = editingLinkValue.trim();
    const linkId = editingLinkId;
    setEditingLinkId(null);
    setEditingLinkValue("");
    if (!linkId || !nextTitle) return;

    setBookmarks((current) =>
      current.map((bookmark) =>
        bookmark.bookmarkId === linkId ? { ...bookmark, title: nextTitle } : bookmark,
      ),
    );
  };

  const cancelRenameLink = () => {
    setEditingLinkId(null);
    setEditingLinkValue("");
  };

  const deleteLink = (bookmarkId: string) => {
    setBookmarks((current) => current.filter((bookmark) => bookmark.bookmarkId !== bookmarkId));
    if (editingLinkId === bookmarkId) cancelRenameLink();
  };

  return (
    <aside className="category-panel" onClick={() => setMenuFor(null)}>
      <div className="category-tabs">
        <button
          className={categoryMode === "tags" ? "active" : ""}
          onClick={() => setCategoryMode("tags")}
        >
          Tag
        </button>
        <button
          className={categoryMode === "folders" ? "active" : ""}
          onClick={() => setCategoryMode("folders")}
        >
          Folders
        </button>
      </div>

      {categoryMode === "tags" ? (
        <>
          <CategorySection
            count={favoriteTags.length}
            searchOpen={favoriteSearchOpen}
            searchValue={favoriteSearch}
            title="Favorite"
            onCloseSearch={() => {
              setFavoriteSearch("");
              setFavoriteSearchOpen(false);
            }}
            onSearchChange={setFavoriteSearch}
            onToggleSearch={() => setFavoriteSearchOpen((open) => !open)}
          >
            {favoriteTags.map((item) =>
              renderCategoryItem(item, {
                categoryMode,
                draggingName,
                dragOverName,
                menuFor,
                moveCategory,
                setDraggingName,
                setDragOverName,
                setMenuFor,
                leadingIcon: <Star className="favorite-star" fill="currentColor" size={15} />,
                displayName: `#${item.name}`,
                editingKey: editingTagKey,
                menuKey: `favorite:${item.name}`,
                editingName: editingTagName,
                editingValue: editingTagValue,
                onCancelEdit: cancelRenameCategory,
                onCommitEdit: commitRenameCategory,
                onSelect: () => setSelectedTag(item.name),
                onCreateAfter: () => createCategoryNear(item.name, "after"),
                onCreateBefore: () => createCategoryNear(item.name, "before"),
                onDeleteTag: () => deleteCategoryOnly(item.name),
                onDeleteTagAndLinks: () => deleteCategoryAndLinks(item.name),
                onEditValueChange: setEditingTagValue,
                onRename: () => beginRenameCategory(item.name, `favorite:${item.name}`),
                selected: selectedTag === item.name,
              }),
            )}
          </CategorySection>
          <CategorySection
            count={allTags.length}
            searchOpen={allTagSearchOpen}
            searchValue={allTagSearch}
            title="All Tag"
            onCloseSearch={() => {
              setAllTagSearch("");
              setAllTagSearchOpen(false);
            }}
            onSearchChange={setAllTagSearch}
            onToggleSearch={() => setAllTagSearchOpen((open) => !open)}
          >
            {allTags.map((item) =>
              renderCategoryItem(item, {
                categoryMode,
                draggingName,
                dragOverName,
                menuFor,
                moveCategory,
                setDraggingName,
                setDragOverName,
                setMenuFor,
                leadingIcon: favoriteTagNames.includes(item.name.toLowerCase()) ? (
                  <Star className="favorite-star" fill="currentColor" size={15} />
                ) : (
                  <Star size={15} />
                ),
                displayName: `#${item.name}`,
                editingKey: editingTagKey,
                menuKey: `all:${item.name}`,
                editingName: editingTagName,
                editingValue: editingTagValue,
                onCancelEdit: cancelRenameCategory,
                onCommitEdit: commitRenameCategory,
                onSelect: () => setSelectedTag(item.name),
                onCreateAfter: () => createCategoryNear(item.name, "after"),
                onCreateBefore: () => createCategoryNear(item.name, "before"),
                onDeleteTag: () => deleteCategoryOnly(item.name),
                onDeleteTagAndLinks: () => deleteCategoryAndLinks(item.name),
                onEditValueChange: setEditingTagValue,
                onRename: () => beginRenameCategory(item.name, `all:${item.name}`),
                selected: selectedTag === item.name,
              }),
            )}
          </CategorySection>
        </>
      ) : (
        <div className="category-list">
          {visibleItems.map((item) => {
            const links = bookmarks.filter(
              (bookmark) => (bookmark.folderSuggestion ?? "Unsorted") === item.name,
            );

            return (
              <React.Fragment key={item.name}>
                {renderCategoryItem(item, {
                  categoryMode,
                  draggingName,
                  dragOverName,
                  menuFor,
                  moveCategory,
                  setDraggingName,
                  setDragOverName,
                  setMenuFor,
                  leadingIcon: <Folder size={15} />,
                  editingKey: editingTagKey,
                  editingName: editingTagName,
                  editingValue: editingTagValue,
                  menuKey: `folder:${item.name}`,
                  onCancelEdit: cancelRenameCategory,
                  onCommitEdit: commitRenameCategory,
                  onCreateAfter: () => createCategoryNear(item.name, "after"),
                  onCreateBefore: () => createCategoryNear(item.name, "before"),
                  onDeleteTag: () => deleteCategoryOnly(item.name),
                  onDeleteTagAndLinks: () => deleteCategoryAndLinks(item.name),
                  onEditValueChange: setEditingTagValue,
                  onRename: () => beginRenameCategory(item.name, `folder:${item.name}`),
                  onSelect: () =>
                    setSelectedFolder(selectedFolder === item.name ? null : item.name),
                  selected: selectedFolder === item.name,
                })}
                {selectedFolder === item.name ? (
                  <div className="folder-link-children">
                    {links.map((bookmark) => (
                      <div
                        className={`folder-link-item ${
                          draggingLinkId === bookmark.bookmarkId ? "dragging" : ""
                        } ${dragOverLinkId === bookmark.bookmarkId ? "drag-over" : ""}`}
                        draggable
                        key={bookmark.bookmarkId}
                        onClick={(event) => event.stopPropagation()}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const menuKey = `link:${bookmark.bookmarkId}`;
                          setMenuFor(menuFor === menuKey ? null : menuKey);
                        }}
                        onDragEnd={() => {
                          setDraggingLinkId(null);
                          setDragOverLinkId(null);
                        }}
                        onDragEnter={() => setDragOverLinkId(bookmark.bookmarkId)}
                        onDragOver={(event) => event.preventDefault()}
                        onDragStart={() => setDraggingLinkId(bookmark.bookmarkId)}
                        onDrop={() => {
                          moveFolderLink(bookmark.bookmarkId);
                          setDraggingLinkId(null);
                          setDragOverLinkId(null);
                        }}
                        title={bookmark.title}
                      >
                        <span className="drag-handle">
                          <GripVertical size={14} />
                        </span>
                        <Link2 className="folder-link-icon" size={16} />
                        {editingLinkId === bookmark.bookmarkId ? (
                          <input
                            autoFocus
                            className="tag-inline-edit folder-link-edit"
                            value={editingLinkValue}
                            onBlur={commitRenameLink}
                            onChange={(event) => setEditingLinkValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") commitRenameLink();
                              if (event.key === "Escape") cancelRenameLink();
                            }}
                          />
                        ) : (
                          <span
                            className="folder-link-title"
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              beginRenameLink(bookmark);
                            }}
                          >
                            {bookmark.title}
                          </span>
                        )}
                        {menuFor === `link:${bookmark.bookmarkId}` ? (
                          <LinkContextMenu
                            bookmark={bookmark}
                            onClose={() => setMenuFor(null)}
                            onDelete={() => deleteLink(bookmark.bookmarkId)}
                            onRename={() => beginRenameLink(bookmark)}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </aside>
  );
}

type SettingsSection =
  | "preferences"
  | "profile"
  | "security"
  | "connected"
  | "agent"
  | "payment"
  | "admin";

const settingsNavItems: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  {
    id: "preferences",
    label: "偏好设定",
    icon: Globe2,
  },
  {
    id: "profile",
    label: "个人信息",
    icon: UserCircle,
  },
  {
    id: "security",
    label: "安全设定",
    icon: Shield,
  },
  {
    id: "connected",
    label: "连接账户",
    icon: Wallet,
  },
  {
    id: "agent",
    label: "AI 个性化",
    icon: Bot,
  },
  {
    id: "payment",
    label: "支付信息",
    icon: CreditCard,
  },
  {
    id: "admin",
    label: "我的后台",
    icon: Gauge,
  },
];

function SettingsView({
  displayName,
  locale,
  setAuthenticated,
  setDisplayName,
  setLocale,
}: {
  displayName: string;
  locale: LocaleCode;
  setAuthenticated: (authenticated: boolean) => void;
  setDisplayName: (name: string) => void;
  setLocale: (locale: LocaleCode) => void;
}) {
  const [activeSettings, setActiveSettings] = useState<SettingsSection>("preferences");
  const settingsContentRef = useRef<HTMLElement | null>(null);
  const translatedNavItems = settingsNavItems.map((item) =>
    item.id === "preferences" ? { ...item, label: t(locale, "preferences") } : item,
  );

  const scrollToSection = (section: SettingsSection) => {
    setActiveSettings(section);
    if (section === "admin") return;

    const container = settingsContentRef.current;
    const target = document.getElementById(`settings-${section}`);
    if (!container || !target) return;

    container.scrollTo({
      top: target.offsetTop - container.offsetTop,
      behavior: "smooth",
    });
  };

  return (
    <>
      <aside className="settings-nav-panel">
        <div className="settings-nav-list">
          {translatedNavItems.map((section) => {
            const Icon = section.icon;
            return (
              <React.Fragment key={section.id}>
                {section.id === "admin" ? <div className="settings-nav-separator" /> : null}
                <button
                  className={activeSettings === section.id ? "active" : ""}
                  onClick={() => scrollToSection(section.id)}
                >
                  <Icon size={16} />
                  <span>{section.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </aside>

      <section className="settings-content-panel" ref={settingsContentRef}>
        {activeSettings === "admin" ? (
          <AdminSettings />
        ) : (
          <>
            <SettingsAccountHeader displayName={displayName} />
            <PreferenceSettings locale={locale} setLocale={setLocale} />
            <ProfileSettings displayName={displayName} setDisplayName={setDisplayName} />
            <SecuritySettings setAuthenticated={setAuthenticated} />
            <ConnectedAccountSettings />
            <AgentPersonalizationSettings />
            <PaymentSettings />
          </>
        )}
      </section>
    </>
  );
}

function SettingsAccountHeader({ displayName }: { displayName: string }) {
  return (
    <div className="settings-account-header">
      <img alt="User avatar" src="/avril-avatar.png" />
      <div>
        <p>{displayName}</p>
        <span>{mockAccount.googleEmail}</span>
      </div>
    </div>
  );
}

function SettingsCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="settings-card" id={id}>
      <div>
        <h3>{title}</h3>
      </div>
      <div className="settings-card-body">{children}</div>
    </article>
  );
}

function SettingRow({
  label,
  value,
  editable,
  onValueChange,
  options,
  type = "text",
}: {
  label: string;
  value: string;
  editable?: boolean;
  onValueChange?: (value: string) => void;
  options?: string[];
  type?: "text" | "select" | "time" | "password";
}) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <div className="setting-control">
        {editable ? (
          type === "select" ? (
            <SettingsSelect
              options={options ?? [value]}
              value={value}
              onValueChange={onValueChange}
            />
          ) : type === "time" ? (
            <SettingsTimePicker value={value} onValueChange={onValueChange} />
          ) : (
            <SettingsInput
              inputType={type === "password" ? "password" : "text"}
              value={value}
              onValueChange={onValueChange}
            />
          )
        ) : (
          <strong>{value}</strong>
        )}
      </div>
    </div>
  );
}

function SettingsInput({
  inputType = "text",
  value,
  onValueChange,
}: {
  inputType?: "text" | "time" | "password";
  value: string;
  onValueChange?: (value: string) => void;
}) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <input
      className="settings-input"
      step={inputType === "time" ? 60 : undefined}
      type={inputType === "password" ? "password" : inputType}
      autoComplete={inputType === "password" ? "off" : undefined}
      value={inputValue}
      onBlur={() => onValueChange?.(inputValue)}
      onChange={(event) => setInputValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onValueChange?.(inputValue);
      }}
    />
  );
}

function SettingsTimePicker({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange?: (value: string) => void;
}) {
  const [hour = "09", minute = "00"] = value.split(":");
  const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

  const update = (nextHour: string, nextMinute: string) => {
    onValueChange?.(`${nextHour}:${nextMinute}`);
  };

  return (
    <div className="settings-time-picker">
      <select value={hour} onChange={(event) => update(event.target.value, minute)}>
        {hours.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <span>:</span>
      <select value={minute} onChange={(event) => update(hour, event.target.value)}>
        {minutes.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}

function SettingsSelect({
  options,
  value,
  onValueChange,
}: {
  options: string[];
  value: string;
  onValueChange?: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const normalizedOptions = Array.from(new Set(options.includes(value) ? options : [value, ...options]));

  return (
    <div className="settings-dropdown">
      <button
        aria-expanded={open}
        className="settings-dropdown-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selectedValue}</span>
        <ChevronDown className={open ? "dropdown-chevron open" : "dropdown-chevron"} size={14} />
      </button>
      {open ? (
        <div className="settings-dropdown-menu">
          {normalizedOptions.map((option) => (
            <button
              className={selectedValue === option ? "selected" : ""}
              key={option}
              onClick={() => {
                setSelectedValue(option);
                onValueChange?.(option);
                setOpen(false);
              }}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileSettings({
  displayName,
  setDisplayName,
}: {
  displayName: string;
  setDisplayName: (name: string) => void;
}) {
  return (
    <SettingsCard id="settings-profile" title="个人信息">
      <SettingRow editable label="用户名" value={displayName} onValueChange={setDisplayName} />
      <SettingRow label="绑定邮箱" value={mockAccount.googleEmail} />
      <SettingRow label="账户状态" value="Google 已绑定" />
    </SettingsCard>
  );
}

function SecuritySettings({
  setAuthenticated,
}: {
  setAuthenticated: (authenticated: boolean) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteAccount = () => {
    setConfirmOpen(false);
    setAuthenticated(false);
  };

  return (
    <SettingsCard id="settings-security" title="安全设定">
        <SettingRow label="登录方式" value="Google only" />
        <EmailSecuritySettings />
        <div className="danger-setting">
          <div>
            <strong>注销账户</strong>
            <span>注销后账户释放，之后可重新注册。</span>
          </div>
          <button onClick={() => setConfirmOpen(true)}>注销账户</button>
        </div>
        {confirmOpen ? (
          <div className="confirm-overlay">
            <div className="confirm-dialog">
              <strong>确认注销账户？</strong>
              <p>注销后，你将立即退出登录。账户数据会按产品规则释放，之后可以重新注册。</p>
              <div>
                <button onClick={() => setConfirmOpen(false)}>取消</button>
                <button className="danger" onClick={deleteAccount}>确认注销</button>
              </div>
            </div>
          </div>
        ) : null}
      </SettingsCard>
  );
}

function EmailSecuritySettings() {
  const [primaryEmail, setPrimaryEmail] = useState(mockAccount.googleEmail);
  const [backupEmail, setBackupEmail] = useState("backup.avril@gmail.com");
  const [phone, setPhone] = useState("+1 555 010 2026");
  const [backupEmailVerified, setBackupEmailVerified] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verificationTarget, setVerificationTarget] = useState<null | "backupEmail" | "phone" | "primaryEmail">(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPrimaryEmail, setNewPrimaryEmail] = useState("new.avril@gmail.com");
  const [notice, setNotice] = useState("更改邮箱前需要验证当前身份，并验证新邮箱。");
  const canUnbindPrimary = backupEmailVerified || phoneVerified;

  const changePrimaryEmail = () => {
    setVerificationTarget("primaryEmail");
    setVerificationCode("");
    setNotice("已向新邮箱发送 6 位验证码。验证完成前，当前邮箱仍可用于登录。");
  };

  const startVerify = (target: "backupEmail" | "phone") => {
    setVerificationTarget(target);
    setVerificationCode("");
    setNotice(target === "phone" ? "已向手机发送 6 位短信验证码。" : "已向备用邮箱发送 6 位验证码。");
  };

  const confirmVerification = () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      setNotice("请输入 6 位数字验证码。");
      return;
    }

    if (verificationTarget === "backupEmail") {
      setBackupEmailVerified(true);
      setNotice("备用邮箱已验证，可以作为账户恢复方式。");
    }
    if (verificationTarget === "phone") {
      setPhoneVerified(true);
      setNotice("手机号已验证，可以作为账户恢复方式。");
    }
    if (verificationTarget === "primaryEmail") {
      setPrimaryEmail(newPrimaryEmail);
      setNotice("邮箱更改成功。旧邮箱已解除主登录方式，新邮箱已生效。");
    }

    setVerificationTarget(null);
    setVerificationCode("");
  };

  const unbindPrimaryEmail = () => {
    if (!canUnbindPrimary) {
      setNotice("无法解绑当前邮箱：请先绑定并验证手机或备用邮箱，确保至少保留一种登录/恢复方式。");
      return;
    }

    setPrimaryEmail("待更换：新邮箱验证后生效");
    setNotice("当前邮箱进入待解绑状态。新验证方式确认前不会彻底移除。");
  };

  return (
    <div className="email-security">
      <div className="email-security-header">
        <div>
          <strong>邮箱与验证方式</strong>
          <span>至少保留一种可用验证方式，避免无法登录。</span>
        </div>
      </div>

      <div className="email-security-grid">
        <div>
          <span>主邮箱</span>
          <strong>{primaryEmail}</strong>
          <small>已验证 · 当前登录方式</small>
        </div>
        <div>
          <span>备用邮箱</span>
          <strong>{backupEmail}</strong>
          <small>{backupEmailVerified ? "已验证" : "未验证"}</small>
        </div>
        <div>
          <span>手机号</span>
          <strong>{phone}</strong>
          <small>{phoneVerified ? "已验证" : "未验证"}</small>
        </div>
      </div>

      <div className="email-security-actions">
        <button onClick={changePrimaryEmail}>更改邮箱</button>
        <button onClick={() => startVerify("backupEmail")}>验证备用邮箱</button>
        <button onClick={() => startVerify("phone")}>验证手机</button>
        <button className="danger" onClick={unbindPrimaryEmail}>解绑当前邮箱</button>
      </div>

      {verificationTarget ? (
        <div className="verification-code-panel">
          {verificationTarget === "primaryEmail" ? (
            <label>
              <span>新邮箱</span>
              <input
                value={newPrimaryEmail}
                onChange={(event) => setNewPrimaryEmail(event.target.value)}
              />
            </label>
          ) : null}
          <label>
            <span>六位验证码</span>
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
          <div>
            <button onClick={() => setVerificationTarget(null)}>取消</button>
            <button onClick={confirmVerification}>确认验证码</button>
          </div>
        </div>
      ) : null}

      <div className="verification-provider-note">
        <strong>可接入平台</strong>
        <span>推荐 Twilio Verify：同时支持 SMS 和 Email OTP。也可以按项目栈选择 Auth0 Email OTP 或 Firebase Phone Auth。</span>
      </div>

      <p className={canUnbindPrimary ? "email-security-notice" : "email-security-notice warning"}>
        {notice}
      </p>
    </div>
  );
}

function PaymentSettings() {
  const [paymentType, setPaymentType] = useState("crypto");
  const cryptoDepositAddress = "0xA1b2C3d4E5f6HoardlyPolygonWallet";
  const [cards, setCards] = useState([
    { id: "card-1", brand: "Visa", last4: "4242", expiry: "12/28", role: "primary" },
    { id: "card-2", brand: "Mastercard", last4: "8821", expiry: "09/27", role: "backup" },
  ]);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({
    cardholder: "Avril Lavigne",
    cardNumber: "",
    cvv: "",
    expiry: "",
    postalCode: "",
  });

  const addCard = () => {
    setEditingCardId("new");
    setCardForm({
      cardholder: "",
      cardNumber: "",
      cvv: "",
      expiry: "",
      postalCode: "",
    });
  };

  const saveCard = () => {
    const last4 = cardForm.cardNumber.replace(/\D/g, "").slice(-4) || "0000";
    const brand = getCardBrand(cardForm.cardNumber);
    if (editingCardId && editingCardId !== "new") {
      setCards((current) =>
        current.map((card) =>
          card.id === editingCardId
            ? { ...card, brand, expiry: cardForm.expiry || card.expiry, last4 }
            : card,
        ),
      );
      setEditingCardId(null);
      return;
    }

    const id = `card-${Date.now()}`;
    setCards((current) => [
      ...current,
      {
        id,
        brand,
        last4,
        expiry: cardForm.expiry || "01/29",
        role: current.length === 0 ? "primary" : "backup",
      },
    ]);
    setEditingCardId(null);
  };

  const editCard = (card: (typeof cards)[number]) => {
    setEditingCardId(card.id);
    setCardForm({
      cardholder: "Avril Lavigne",
      cardNumber: `•••• •••• •••• ${card.last4}`,
      cvv: "",
      expiry: card.expiry,
      postalCode: "",
    });
  };

  const removeCard = (id: string) => {
    setCards((current) => {
      const next = current.filter((card) => card.id !== id);
      if (!next.some((card) => card.role === "primary") && next[0]) {
        return next.map((card, index) => ({
          ...card,
          role: index === 0 ? "primary" : "backup",
        }));
      }
      return next;
    });
  };

  const setPrimaryCard = (id: string) => {
    setCards((current) =>
      current.map((card) => ({
        ...card,
        role: card.id === id ? "primary" : "backup",
      })),
    );
  };

  return (
    <SettingsCard id="settings-payment" title="支付信息">
        <SettingRow label="当前套餐" value="Free · 20 bookmarks" />
        <SettingRow label="月付" value="$5 / month" />
        <SettingRow label="终身版" value="$120 once" />
        <div className="payment-methods">
          <div className="payment-methods-header">
            <div>
              <strong>支付方式管理</strong>
              <span>先选择类型，再管理对应支付渠道。加密货币目前支持 Polygon · USDT / USDC。</span>
            </div>
          </div>

          <div className="payment-type-tabs">
            {[
              ["crypto", "加密货币"],
              ["card", "信用卡"],
              ["wallet", "第三方支付"],
            ].map(([value, label]) => (
              <button
                className={paymentType === value ? "active" : ""}
                key={value}
                onClick={() => setPaymentType(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {paymentType === "crypto" ? (
            <div className="crypto-payment-panel">
              <div className="crypto-highlight">
                <Wallet size={22} />
                <div>
                  <strong>Polygon 收款</strong>
                  <span>一条链内划转，支持 USDT / USDC，确认后自动开通订阅。</span>
                </div>
              </div>
              <div className="crypto-asset-grid">
                {["USDT", "USDC"].map((asset) => (
                  <button key={asset}>
                    <strong>{asset}</strong>
                    <span>Polygon PoS</span>
                  </button>
                ))}
              </div>
              <div className="crypto-deposit-card">
                <div className="crypto-qr-box">
                  <QrCode size={74} />
                  <span>扫描充值</span>
                </div>
                <div className="crypto-deposit-info">
                  <strong>充值地址</strong>
                  <span>仅支持 Polygon PoS 网络的 USDT / USDC，请勿转入其他链资产。</span>
                  <code>{cryptoDepositAddress}</code>
                  <div>
                    <button onClick={() => void navigator.clipboard.writeText(cryptoDepositAddress)}>
                      <Copy size={14} />
                      复制地址
                    </button>
                    <button>
                      <QrCode size={14} />
                      查看二维码
                    </button>
                  </div>
                </div>
              </div>
              <SettingRow label="确认区块" value="20 confirmations" />
            </div>
          ) : null}

          {paymentType === "card" ? (
            <>
              <div className="payment-methods-header compact">
                <span>可以添加多张卡，并选择一张作为当前主要支付方式。</span>
                <button onClick={addCard}>添加信用卡</button>
              </div>
              {editingCardId ? (
                <CreditCardForm
                  form={cardForm}
                  onCancel={() => setEditingCardId(null)}
                  onChange={setCardForm}
                  onSave={saveCard}
                />
              ) : null}
              <div className="payment-card-list">
                {cards.map((card) => (
                  <div className={card.role === "primary" ? "payment-card primary" : "payment-card"} key={card.id}>
                    <div>
                      <CreditCard size={18} />
                      <div>
                        <strong>{card.brand} ···· {card.last4}</strong>
                        <span>有效期 {card.expiry}</span>
                      </div>
                    </div>
                    <div className="payment-card-actions">
                      <span>{card.role === "primary" ? "主要" : "备用"}</span>
                      <button onClick={() => editCard(card)}>修改</button>
                      {card.role !== "primary" ? (
                        <button onClick={() => setPrimaryCard(card.id)}>设为主要</button>
                      ) : null}
                      <button className="danger" onClick={() => removeCard(card.id)}>删除</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {paymentType === "wallet" ? (
            <div className="wallet-payment-grid">
              {["微信支付", "支付宝", "Google Pay", "Apple Pay", "PayPal"].map((method) => (
                <button key={method}>
                  <Wallet size={16} />
                  <strong>{method}</strong>
                  <span>可接入</span>
                </button>
              ))}
            </div>
          ) : null}

          <DonationSettings />
        </div>
      </SettingsCard>
  );
}

function DonationSettings() {
  return (
    <div className="donation-panel">
      <div className="donation-header">
        <Coffee size={22} />
        <div>
          <strong>请喝杯咖啡</strong>
          <span>支持 Hoardly 的持续开发，可以选择支付机构、扫码或加密货币转账。</span>
        </div>
      </div>
      <div className="donation-method-grid">
        {["微信支付", "支付宝", "Google Pay", "Apple Pay", "PayPal"].map((method) => (
          <button key={method}>{method}</button>
        ))}
      </div>
      <div className="donation-content">
        <div className="donation-qr">
          <QrCode size={72} />
          <span>扫码打赏</span>
        </div>
        <div className="donation-crypto">
          <strong>加密货币地址</strong>
          <span>Polygon · USDT / USDC</span>
          <code>0xA1...HoardlyCoffee</code>
        </div>
      </div>
    </div>
  );
}

function CreditCardForm({
  form,
  onCancel,
  onChange,
  onSave,
}: {
  form: {
    cardholder: string;
    cardNumber: string;
    cvv: string;
    expiry: string;
    postalCode: string;
  };
  onCancel: () => void;
  onChange: (form: {
    cardholder: string;
    cardNumber: string;
    cvv: string;
    expiry: string;
    postalCode: string;
  }) => void;
  onSave: () => void;
}) {
  const update = (key: keyof typeof form, value: string) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <div className="credit-card-form">
      <label>
        <span>持卡人姓名</span>
        <input
          placeholder="Avril Lavigne"
          value={form.cardholder}
          onChange={(event) => update("cardholder", event.target.value)}
        />
      </label>
      <label className="wide">
        <span>卡号</span>
        <input
          inputMode="numeric"
          placeholder="1234 1234 1234 1234"
          value={form.cardNumber}
          onChange={(event) => update("cardNumber", event.target.value)}
        />
      </label>
      <label>
        <span>有效期</span>
        <input
          inputMode="numeric"
          placeholder="MM/YY"
          value={form.expiry}
          onChange={(event) => update("expiry", event.target.value)}
        />
      </label>
      <label>
        <span>CVV</span>
        <input
          inputMode="numeric"
          placeholder="123"
          value={form.cvv}
          onChange={(event) => update("cvv", event.target.value)}
        />
      </label>
      <label>
        <span>账单邮编</span>
        <input
          inputMode="numeric"
          placeholder="10001"
          value={form.postalCode}
          onChange={(event) => update("postalCode", event.target.value)}
        />
      </label>
      <div className="credit-card-form-actions">
        <button onClick={onCancel}>取消</button>
        <button onClick={onSave}>保存信用卡</button>
      </div>
    </div>
  );
}

function getCardBrand(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, "");
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";
  return "Visa";
}

function PreferenceSettings({
  locale,
  setLocale,
}: {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
}) {
  const activeLanguage = LANGUAGE_OPTIONS.find((language) => language.code === locale);

  return (
    <SettingsCard id="settings-preferences" title={t(locale, "preferences")}>
        <SettingRow
          editable
          label={t(locale, "interfaceLanguage")}
          options={LANGUAGE_OPTIONS.map((language) => language.nativeName)}
          type="select"
          value={activeLanguage?.nativeName ?? "简体中文"}
          onValueChange={(value) => {
            const next = LANGUAGE_OPTIONS.find((language) => language.nativeName === value);
            if (next) setLocale(next.code);
          }}
        />
        <SettingRow
          editable
          label="主题"
          options={["Dark", "Light", "System"]}
          type="select"
          value="Dark"
        />
        <SettingRow
          editable
          label="复查频次"
          options={["每一天", "每三天", "每七天", "每一个月"]}
          type="select"
          value="每一天"
        />
        <SettingRow editable label="复查时间" type="time" value="09:00" />
        <SettingRow label="复查内容" value="失效链接检测 / Tag 修正 / 分类整理" />
        <SettingRow
          editable
          label="自动移动文件夹"
          options={["Confirm first", "Automatic", "Off"]}
          type="select"
          value="Confirm first"
        />
      </SettingsCard>
  );
}

function ConnectedAccountSettings() {
  return (
    <SettingsCard id="settings-connected" title="连接账户">
      <SettingRow label="Google 账户" value={mockAccount.googleEmail} />
      <SettingRow label="登录方式" value="Google only" />
      <SettingRow label="钱包连接" value="未启用" />
    </SettingsCard>
  );
}

const AI_PROVIDER_LABELS: Array<{ id: AiUserProvider; label: string }> = [
  { id: "openrouter", label: "OpenRouter" },
  { id: "groq", label: "Groq" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "openai", label: "OpenAI" },
];

function AgentPersonalizationSettings() {
  const [ai, setAi] = useState<AiUserSettings>(() => loadAiUserSettings());
  const [testHint, setTestHint] = useState<string | null>(null);

  const persist = (patch: Partial<AiUserSettings>) => {
    const next = saveAiUserSettings(patch);
    setAi(next);
    return next;
  };

  const runAiConnectionTest = async () => {
    setTestHint(null);
    try {
      const result = await runBookmarkAiSearch({ query: "你是什么模型？", bookmarks: [] });
      setTestHint(`连接成功：${result.provider} / ${result.model}`);
    } catch (error) {
      setTestHint(error instanceof Error ? error.message : "连接失败");
    }
  };

  return (
    <SettingsCard id="settings-agent" title="AI 个性化">
      <div className="agent-provider-grid">
        <button
          className={!ai.useCustomApi ? "active" : ""}
          type="button"
          onClick={() => persist({ useCustomApi: false })}
        >
          <Bot size={18} />
          <strong>Hoardly 系统 API</strong>
          <span>使用本地 Vite 代理与 .env 中的 Key（开发环境）。未配置时请改用右侧自定义 Key。</span>
        </button>
        <button
          className={ai.useCustomApi ? "active" : ""}
          type="button"
          onClick={() => persist({ useCustomApi: true })}
        >
          <KeyRoundIcon />
          <strong>使用自己的 API</strong>
          <span>在下方填写 Key 与模型；请求从浏览器直连供应商（适合预览与自托管）。</span>
        </button>
      </div>
      <SettingRow
        editable
        label="供应商"
        type="select"
        value={AI_PROVIDER_LABELS.find((item) => item.id === ai.provider)?.label ?? "OpenRouter"}
        options={AI_PROVIDER_LABELS.map((item) => item.label)}
        onValueChange={(value) => {
          const match = AI_PROVIDER_LABELS.find((item) => item.label === value);
          if (!match) return;
          persist({ provider: match.id });
        }}
      />
      <SettingRow
        editable
        label="Base URL"
        value={ai.baseUrl}
        onValueChange={(value) => {
          persist({ baseUrl: value });
        }}
      />
      <SettingRow
        editable
        label="模型名称"
        value={ai.model}
        onValueChange={(value) => {
          persist({ model: value });
        }}
      />
      <SettingRow
        editable
        label="用户 API Key"
        type="password"
        value={ai.apiKey}
        onValueChange={(value) => {
          persist({ apiKey: value });
        }}
      />
      <SettingRow editable label="月调用上限" value="300 / month" />
      <SettingRow
        editable
        label="默认摘要语言"
        type="select"
        value="跟随界面语言"
        options={["跟随界面语言", "中文", "English"]}
      />
      <div className="agent-api-hint">
        <div>
          <strong>自定义 API 说明</strong>
          <span>
            开启「使用自己的 API」并填写 Key 后，AI 搜索、打标签、对话均走直连；OpenRouter 需可访问
            openrouter.ai。
          </span>
          {testHint ? <p className="agent-test-hint">{testHint}</p> : null}
        </div>
        <button type="button" onClick={() => void runAiConnectionTest()}>
          测试连接
        </button>
      </div>
    </SettingsCard>
  );
}

type ReportRange = "week" | "30d" | "halfYear" | "year";
type ReportMetric = "revenue" | "subscribers" | "activeUsers" | "aiCalls" | "invalidLinks" | "errorRate";
type AdminPageType = "dashboard" | "users" | "benefits" | "permissions" | "payments";
type ReportPoint = {
  activeUsers: number;
  aiCalls: number;
  errorRate: number;
  invalidLinks: number;
  label: string;
  revenue: number;
  subscribers: number;
};

const ADMIN_REPORT_DATA: Record<ReportRange, ReportPoint[]> = {
  week: [
    { label: "Mon", revenue: 18, subscribers: 5, activeUsers: 42, aiCalls: 120, invalidLinks: 3, errorRate: 1.1 },
    { label: "Tue", revenue: 28, subscribers: 7, activeUsers: 48, aiCalls: 168, invalidLinks: 4, errorRate: 1.4 },
    { label: "Wed", revenue: 22, subscribers: 8, activeUsers: 45, aiCalls: 142, invalidLinks: 5, errorRate: 1.2 },
    { label: "Thu", revenue: 42, subscribers: 10, activeUsers: 66, aiCalls: 238, invalidLinks: 7, errorRate: 1.7 },
    { label: "Fri", revenue: 55, subscribers: 11, activeUsers: 84, aiCalls: 326, invalidLinks: 9, errorRate: 2.0 },
    { label: "Sat", revenue: 48, subscribers: 12, activeUsers: 73, aiCalls: 288, invalidLinks: 8, errorRate: 1.8 },
    { label: "Sun", revenue: 64, subscribers: 14, activeUsers: 91, aiCalls: 360, invalidLinks: 11, errorRate: 2.1 },
  ],
  "30d": [
    { label: "D1", revenue: 120, subscribers: 18, activeUsers: 96, aiCalls: 720, invalidLinks: 14, errorRate: 1.6 },
    { label: "D7", revenue: 185, subscribers: 24, activeUsers: 124, aiCalls: 920, invalidLinks: 18, errorRate: 1.9 },
    { label: "D14", revenue: 232, subscribers: 31, activeUsers: 148, aiCalls: 1160, invalidLinks: 22, errorRate: 1.5 },
    { label: "D21", revenue: 278, subscribers: 38, activeUsers: 171, aiCalls: 1390, invalidLinks: 28, errorRate: 2.2 },
    { label: "D30", revenue: 336, subscribers: 46, activeUsers: 204, aiCalls: 1680, invalidLinks: 32, errorRate: 2.0 },
  ],
  halfYear: [
    { label: "M1", revenue: 320, subscribers: 42, activeUsers: 210, aiCalls: 2100, invalidLinks: 41, errorRate: 1.4 },
    { label: "M2", revenue: 410, subscribers: 56, activeUsers: 244, aiCalls: 2600, invalidLinks: 58, errorRate: 1.7 },
    { label: "M3", revenue: 520, subscribers: 74, activeUsers: 289, aiCalls: 3100, invalidLinks: 63, errorRate: 1.9 },
    { label: "M4", revenue: 690, subscribers: 92, activeUsers: 330, aiCalls: 4300, invalidLinks: 74, errorRate: 1.8 },
    { label: "M5", revenue: 760, subscribers: 116, activeUsers: 384, aiCalls: 4800, invalidLinks: 80, errorRate: 2.0 },
    { label: "M6", revenue: 940, subscribers: 148, activeUsers: 440, aiCalls: 5600, invalidLinks: 92, errorRate: 1.6 },
  ],
  year: [
    { label: "Jan", revenue: 320, subscribers: 42, activeUsers: 210, aiCalls: 2100, invalidLinks: 41, errorRate: 1.4 },
    { label: "Feb", revenue: 410, subscribers: 56, activeUsers: 244, aiCalls: 2600, invalidLinks: 58, errorRate: 1.7 },
    { label: "Mar", revenue: 520, subscribers: 74, activeUsers: 289, aiCalls: 3100, invalidLinks: 63, errorRate: 1.9 },
    { label: "Apr", revenue: 690, subscribers: 92, activeUsers: 330, aiCalls: 4300, invalidLinks: 74, errorRate: 1.8 },
    { label: "May", revenue: 760, subscribers: 116, activeUsers: 384, aiCalls: 4800, invalidLinks: 80, errorRate: 2.0 },
    { label: "Jun", revenue: 940, subscribers: 148, activeUsers: 440, aiCalls: 5600, invalidLinks: 92, errorRate: 1.6 },
    { label: "Jul", revenue: 1120, subscribers: 176, activeUsers: 498, aiCalls: 6700, invalidLinks: 103, errorRate: 1.5 },
    { label: "Aug", revenue: 1280, subscribers: 204, activeUsers: 540, aiCalls: 7200, invalidLinks: 119, errorRate: 1.8 },
    { label: "Sep", revenue: 1410, subscribers: 238, activeUsers: 610, aiCalls: 7900, invalidLinks: 130, errorRate: 1.4 },
    { label: "Oct", revenue: 1580, subscribers: 281, activeUsers: 690, aiCalls: 8600, invalidLinks: 148, errorRate: 1.7 },
    { label: "Nov", revenue: 1710, subscribers: 324, activeUsers: 760, aiCalls: 9400, invalidLinks: 166, errorRate: 1.9 },
    { label: "Dec", revenue: 1920, subscribers: 372, activeUsers: 840, aiCalls: 10300, invalidLinks: 183, errorRate: 2.1 },
  ],
};

const ADMIN_USERS = [
  { id: "u_001", name: "Avril Lavigne", email: "avril@gmail.com", plan: "Free", status: "active", revenue: "$0", bookmarks: 75 },
  { id: "u_002", name: "Mia Goth", email: "mia@example.com", plan: "Monthly", status: "active", revenue: "$5", bookmarks: 214 },
  { id: "u_003", name: "Hayley Williams", email: "hayley@example.com", plan: "Lifetime", status: "active", revenue: "$120", bookmarks: 812 },
  { id: "u_004", name: "Demo User", email: "demo@example.com", plan: "Monthly", status: "review", revenue: "$5", bookmarks: 129 },
];

function AdminSettings() {
  const [adminPage, setAdminPage] = useState<AdminPageType>("dashboard");
  const [range, setRange] = useState<ReportRange>("week");
  const [activeMetric, setActiveMetric] = useState<ReportMetric>("revenue");
  const [users, setUsers] = useState(ADMIN_USERS);
  const report = ADMIN_REPORT_DATA[range];
  const latest = report[report.length - 1];
  const metricCards: Array<{
    icon: React.ReactNode;
    key: ReportMetric;
    label: string;
    note: string;
    value: string;
  }> = [
    { icon: <DollarSign size={18} />, key: "revenue", label: "区间收入", value: `$${latest.revenue}`, note: "Stripe / Crypto" },
    { icon: <Users size={18} />, key: "subscribers", label: "订阅人数", value: String(latest.subscribers), note: "当前区间累计" },
    { icon: <Users size={18} />, key: "activeUsers", label: "活跃用户", value: String(latest.activeUsers), note: "当前区间活跃" },
    { icon: <Activity size={18} />, key: "aiCalls", label: "AI 调用量", value: String(latest.aiCalls), note: "当前区间调用" },
    { icon: <AlertTriangle size={18} />, key: "invalidLinks", label: "失效链接", value: String(latest.invalidLinks), note: "当前区间检测" },
    { icon: <Gauge size={18} />, key: "errorRate", label: "错误率", value: `${latest.errorRate.toFixed(1)}%`, note: "API / Jobs 失败率" },
  ];

  return (
    <section className="admin-page">
      <div className="admin-page-header">
        <div>
          <h3>我的后台</h3>
          <p>独立维护用户、订阅权益、报表、权限和支付配置。</p>
        </div>
      </div>

      <div className="admin-type-tabs">
        {[
          ["dashboard", "Dashboard"],
          ["users", "订阅用户管理"],
          ["benefits", "会员权益"],
          ["permissions", "权限配置"],
          ["payments", "支付配置"],
        ].map(([value, label]) => (
          <button
            className={adminPage === value ? "active" : ""}
            key={value}
            onClick={() => setAdminPage(value as AdminPageType)}
          >
            {label}
          </button>
        ))}
      </div>

      {adminPage === "dashboard" ? (
        <>
          <div className="admin-report-header">
            <div>
              <strong>运营报表</strong>
              <span>查看订阅人数、收入、AI 调用量等关键指标。</span>
            </div>
        <div className="admin-range-switch">
          {[
            ["week", "一周"],
            ["30d", "30天"],
            ["halfYear", "半年"],
            ["year", "一年"],
          ].map(([value, label]) => (
            <button
              className={range === value ? "active" : ""}
              key={value}
              onClick={() => setRange(value as ReportRange)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
          <div className="admin-dashboard-grid">
            {metricCards.map((metric) => (
              <AdminMetricCard
                active={activeMetric === metric.key}
                icon={metric.icon}
                key={metric.key}
                label={metric.label}
                note={metric.note}
                value={metric.value}
                onClick={() => setActiveMetric(metric.key)}
              />
            ))}
          </div>
          <AdminLineChart data={report} metric={activeMetric} range={range} />
        </>
      ) : null}

      {adminPage === "users" ? (
        <AdminUserTable
        users={users}
        onChangePlan={(id, plan) =>
          setUsers((current) =>
            current.map((user) => (user.id === id ? { ...user, plan } : user)),
          )
        }
        onRemove={(id) => setUsers((current) => current.filter((user) => user.id !== id))}
        onToggleStatus={(id) =>
          setUsers((current) =>
            current.map((user) =>
              user.id === id
                ? { ...user, status: user.status === "disabled" ? "active" : "disabled" }
                : user,
            ),
          )
        }
      />
      ) : null}

      {adminPage === "benefits" ? <AdminBenefitsPanel /> : null}
      {adminPage === "permissions" ? <AdminPermissionsPanel /> : null}
      {adminPage === "payments" ? <AdminPaymentConfigPanel /> : null}
    </section>
  );
}

function AdminUserTable({
  onChangePlan,
  onRemove,
  onToggleStatus,
  users,
}: {
  onChangePlan: (id: string, plan: string) => void;
  onRemove: (id: string) => void;
  onToggleStatus: (id: string) => void;
  users: typeof ADMIN_USERS;
}) {
  return (
    <div className="admin-user-table">
      <div className="admin-user-table-header">
        <div>
          <strong>用户管理</strong>
          <span>维护用户状态、订阅、书签数量和收入贡献。</span>
        </div>
      </div>
      <div className="admin-user-table-grid">
        <div className="admin-user-row header">
          <span>用户</span>
          <span>套餐</span>
          <span>状态</span>
          <span>收入</span>
          <span>书签</span>
          <span>操作</span>
        </div>
        {users.map((user) => (
          <div className="admin-user-row" key={user.id}>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            <span>{user.plan}</span>
            <span className={`user-status ${user.status}`}>{user.status}</span>
            <span>{user.revenue}</span>
            <span>{user.bookmarks}</span>
            <div className="admin-user-actions">
              <button aria-label="提升为终身会员" title="提升为终身会员" onClick={() => onChangePlan(user.id, "Lifetime")}>
                <Crown size={15} />
              </button>
              <button aria-label="降级为免费会员" title="降级为免费会员" onClick={() => onChangePlan(user.id, "Free")}>
                <UserCircle size={15} />
              </button>
              <button aria-label="取消会员" title="取消会员" onClick={() => onChangePlan(user.id, "Cancelled")}>
                <UserMinus size={15} />
              </button>
              <button
                aria-label={user.status === "disabled" ? "恢复用户" : "禁用用户"}
                title={user.status === "disabled" ? "恢复用户" : "禁用用户"}
                onClick={() => onToggleStatus(user.id)}
              >
                {user.status === "disabled" ? <CheckCircle2 size={15} /> : <Ban size={15} />}
              </button>
              <button aria-label="剔除用户" className="danger" title="剔除用户" onClick={() => onRemove(user.id)}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminBenefitsPanel() {
  return (
    <div className="admin-config-panel">
      <div>
        <strong>会员权益配置</strong>
        <span>维护 Free / Monthly / Lifetime 的权益、额度和功能开关。</span>
      </div>
      <div className="admin-config-grid">
        <AdminConfigCard title="Free" value="20 bookmarks" note="基础 AI 搜索、基础 Tag 管理" />
        <AdminConfigCard title="Monthly" value="$5 / month" note="无限书签、AI 整理、失效检测" />
        <AdminConfigCard title="Lifetime" value="$120 once" note="终身无限使用、优先模型额度" />
      </div>
    </div>
  );
}

function AdminPermissionsPanel() {
  return (
    <div className="admin-config-panel">
      <div>
        <strong>权限配置</strong>
        <span>后台仅对开发者或指定 Google 邮箱开放。</span>
      </div>
      <SettingRow label="Admin 邮箱" value="UXIOI / owner@hoardly.app" />
      <SettingRow label="权限范围" value="用户管理 / 订阅配置 / 支付配置 / 模型配置" />
      <SettingRow label="危险操作" value="禁用用户、剔除用户、取消会员需要二次确认" />
    </div>
  );
}

function AdminPaymentConfigPanel() {
  return (
    <div className="admin-config-panel">
      <div>
        <strong>支付配置</strong>
        <span>集中维护 Stripe、微信、支付宝、PayPal 和 Crypto 收款配置。</span>
      </div>
      <div className="admin-config-grid">
        <AdminConfigCard title="Stripe" value="Enabled" note="Cards / Alipay / WeChat Pay" />
        <AdminConfigCard title="Crypto" value="Polygon" note="USDT / USDC · 20 confirmations" />
        <AdminConfigCard title="PayPal" value="Ready" note="待填写商户信息" />
      </div>
    </div>
  );
}

function AdminConfigCard({ note, title, value }: { note: string; title: string; value: string }) {
  return (
    <div className="admin-config-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
      <button>编辑</button>
    </div>
  );
}

function AdminLineChart({
  data,
  metric,
  range,
}: {
  data: ReportPoint[];
  metric: ReportMetric;
  range: ReportRange;
}) {
  const width = 720;
  const height = 240;
  const padding = 34;
  const metricLabel = getReportMetricLabel(metric);
  const maxValue = Math.max(...data.map((item) => item[metric]), 1);
  const points = data
    .map((item, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
      const y = height - padding - (item[metric] / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-title">
        <strong>收入趋势</strong>
        <span>
          {metricLabel} · {range === "week" ? "最近 7 天" : range === "30d" ? "最近 30 天" : range === "halfYear" ? "最近半年" : "最近一年"}
        </span>
      </div>
      <svg aria-label="Revenue line chart" viewBox={`0 0 ${width} ${height}`}>
        <g className="chart-grid">
          {[0, 1, 2, 3].map((line) => {
            const y = padding + (line * (height - padding * 2)) / 3;
            return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} />;
          })}
        </g>
        <polyline className="chart-line" points={points} />
        {data.map((item, index) => {
          const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
          const y = height - padding - (item[metric] / maxValue) * (height - padding * 2);
          return (
            <g key={item.label}>
              <circle className="chart-point" cx={x} cy={y} r="4" />
              <text x={x} y={height - 10}>{item.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function getReportMetricLabel(metric: ReportMetric) {
  const labels: Record<ReportMetric, string> = {
    activeUsers: "活跃用户",
    aiCalls: "AI 调用量",
    errorRate: "错误率",
    invalidLinks: "失效链接",
    revenue: "收入",
    subscribers: "订阅人数",
  };
  return labels[metric];
}

function AdminMetricCard({
  active,
  icon,
  label,
  note,
  onClick,
  value,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  note: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button className={active ? "admin-metric-card active" : "admin-metric-card"} onClick={onClick}>
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </button>
  );
}

function KeyRoundIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M15 7.5a5 5 0 1 0-3.7 4.82L13 14h2v2h2v2h3v-3.15l-5-5A5 5 0 0 0 15 7.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function CategorySection({
  title,
  count,
  searchOpen,
  searchValue,
  onCloseSearch,
  onSearchChange,
  onToggleSearch,
  children,
}: {
  title: string;
  count: number;
  searchOpen: boolean;
  searchValue: string;
  onCloseSearch: () => void;
  onSearchChange: (value: string) => void;
  onToggleSearch: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="category-section">
      <div className="category-section-header">
        {searchOpen ? (
          <div className="section-search-inline">
            <Search size={14} />
            <input
              autoFocus
              placeholder={`Search ${title}...`}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onCloseSearch();
              }}
            />
            <button onClick={onCloseSearch}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <p>
              {title} <span>({count})</span>
            </p>
            <button title={`搜索 ${title}`} onClick={onToggleSearch}>
              <Search size={14} />
            </button>
          </>
        )}
      </div>
      <div className="category-list">{children}</div>
    </div>
  );
}

function renderCategoryItem(
  item: { name: string; count: number },
  options: {
    categoryMode: CategoryMode;
    draggingName: string | null;
    dragOverName: string | null;
    menuFor: string | null;
    moveCategory: (targetName: string) => void;
    setDraggingName: (name: string | null) => void;
    setDragOverName: (name: string | null) => void;
    setMenuFor: (name: string | null) => void;
    leadingIcon: React.ReactNode;
    displayName?: string;
    editingKey?: string | null;
    editingName?: string | null;
    editingValue?: string;
    menuKey: string;
    onCancelEdit?: () => void;
    onCommitEdit?: () => void;
    onCreateAfter?: () => void;
    onCreateBefore?: () => void;
    onDeleteTag?: () => void;
    onDeleteTagAndLinks?: () => void;
    onEditValueChange?: (value: string) => void;
    onRename?: () => void;
    onSelect?: () => void;
    selected?: boolean;
  },
) {
  const isEditing = options.editingKey === options.menuKey;

  return (
    <div
      className={`category-item ${
        options.draggingName === item.name ? "dragging" : ""
      } ${options.dragOverName === item.name ? "drag-over" : ""} ${
        options.selected ? "selected" : ""
      }`}
      draggable
      key={item.name}
      onClick={() => options.onSelect?.()}
      onContextMenu={(event) => {
        event.preventDefault();
        options.setMenuFor(options.menuFor === options.menuKey ? null : options.menuKey);
      }}
      onDragEnd={() => {
        options.setDraggingName(null);
        options.setDragOverName(null);
      }}
      onDragEnter={() => options.setDragOverName(item.name)}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={() => options.setDraggingName(item.name)}
      onDrop={() => {
        options.moveCategory(item.name);
        options.setDraggingName(null);
        options.setDragOverName(null);
      }}
      title="Hover 显示拖动手柄；右键打开操作菜单"
    >
      <span className="drag-handle">
        <GripVertical size={15} />
      </span>
      <span className="category-name">
        {options.leadingIcon}
        {isEditing ? (
          <input
            autoFocus
            className="tag-inline-edit"
            value={options.editingValue ?? item.name}
            onBlur={options.onCommitEdit}
            onChange={(event) => options.onEditValueChange?.(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") options.onCommitEdit?.();
              if (event.key === "Escape") options.onCancelEdit?.();
            }}
          />
        ) : (
          <span
            className="tag-name-text"
            onDoubleClick={(event) => {
              event.stopPropagation();
              options.onRename?.();
            }}
          >
            {options.displayName ?? item.name}
          </span>
        )}
      </span>
      <span className="category-count">{item.count}</span>
      {options.menuFor === options.menuKey ? (
        <CategoryContextMenu
          name={item.name}
          type={options.categoryMode}
          onClose={() => options.setMenuFor(null)}
          onCreateAfter={options.onCreateAfter}
          onCreateBefore={options.onCreateBefore}
          onCopy={() => void navigator.clipboard.writeText(item.name)}
          onDeleteTag={options.onDeleteTag}
          onDeleteTagAndLinks={options.onDeleteTagAndLinks}
          onRename={options.onRename}
        />
      ) : null}
    </div>
  );
}

function CategoryContextMenu({
  name,
  type,
  onClose,
  onCreateAfter,
  onCreateBefore,
  onCopy,
  onDeleteTag,
  onDeleteTagAndLinks,
  onRename,
}: {
  name: string;
  type: CategoryMode;
  onClose: () => void;
  onCreateAfter?: () => void;
  onCreateBefore?: () => void;
  onCopy: () => void;
  onDeleteTag?: () => void;
  onDeleteTagAndLinks?: () => void;
  onRename?: () => void;
}) {
  const runAndClose = (action?: () => void) => {
    action?.();
    onClose();
  };

  return (
    <div className="category-menu" onClick={(event) => event.stopPropagation()}>
      <button onClick={() => runAndClose(onRename)}>
        <Edit3 size={14} />
        重命名
      </button>
      <button
        onClick={() => {
          onCopy();
          onClose();
        }}
      >
        <Copy size={14} />
        复制
      </button>
      <button onClick={() => runAndClose(onCreateBefore)}>
        <ListPlus size={14} />
        往上新建 {type === "tags" ? "Tag" : "文件夹"}
      </button>
      <button onClick={() => runAndClose(onCreateAfter)}>
        <ListPlus size={14} />
        往下新建 {type === "tags" ? "Tag" : "文件夹"}
      </button>
      <button className="danger" onClick={() => runAndClose(onDeleteTag)}>
        <Trash2 size={14} />
        删除{type === "tags" ? " Tag" : "文件夹"}（保留链接）
      </button>
      <button className="danger" onClick={() => runAndClose(onDeleteTagAndLinks)}>
        <Trash2 size={14} />
        删除{type === "tags" ? " Tag" : "文件夹"}及全部链接
      </button>
    </div>
  );
}

function LinkContextMenu({
  bookmark,
  onClose,
  onDelete,
  onRename,
}: {
  bookmark: (typeof mockBookmarks)[number];
  onClose: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const runAndClose = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="category-menu link-menu" onClick={(event) => event.stopPropagation()}>
      <button onClick={() => runAndClose(onRename)}>
        <Edit3 size={14} />
        重命名链接
      </button>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(bookmark.url);
          onClose();
        }}
      >
        <Copy size={14} />
        复制链接
      </button>
      <button className="danger" onClick={() => runAndClose(onDelete)}>
        <Trash2 size={14} />
        删除链接
      </button>
    </div>
  );
}

function AiSearchBox({
  loading,
  onSubmit,
  placeholder,
  query,
  setQuery,
}: {
  loading: boolean;
  onSubmit: () => void;
  placeholder: string;
  query: string;
  setQuery: (value: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="ai-composer-wrap">
      {menuOpen ? (
        <div className="ai-composer-menu">
          <button type="button">
            <Paperclip size={18} />
            添加照片和文件
          </button>
          <button type="button">
            <ImagePlus size={18} />
            创建图片
          </button>
          <button type="button">
            <Lightbulb size={18} />
            思考一下
          </button>
          <button type="button">
            <Telescope size={18} />
            深度研究
          </button>
          <button type="button">
            <Coffee size={18} />
            请喝杯咖啡
          </button>
          <button type="button">
            <MoreHorizontal size={18} />
            更多
            <ChevronRight className="ai-composer-menu-arrow" size={16} />
          </button>
        </div>
      ) : null}

      <div className="ai-search-box">
        <button
          aria-expanded={menuOpen}
          className="ai-composer-button"
          title="添加"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Plus size={22} />
        </button>
        <textarea
        className="ai-search-textarea"
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="ai-composer-actions">
        <button
          className="ai-voice-button"
          title="语音输入"
          type="button"
        >
          <Mic size={18} />
        </button>
        <button
          className="ai-submit-button"
          disabled={loading || !query.trim()}
          title="发送给 AI"
          type="button"
          onClick={onSubmit}
        >
          {loading ? <Loader2 className="spin" size={16} /> : <FilledSendIcon />}
        </button>
      </div>
      </div>
    </div>
  );
}


function FilledSendIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="16" viewBox="0 0 24 24" width="16">
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

const CHAT_HEIGHT_MIN = 120;
const CHAT_HEIGHT_MAX = Math.round(window.innerHeight * 0.6);
const CHAT_HEIGHT_DEFAULT = 260;

function AiConversationPanel({
  error,
  expanded,
  loading,
  messages,
  query,
  setExpanded,
}: {
  error: string | null;
  expanded: boolean;
  loading: boolean;
  messages: PreviewAiMessage[];
  query: string;
  setExpanded: (expanded: boolean) => void;
}) {
  const [panelHeight, setPanelHeight] = useState(CHAT_HEIGHT_DEFAULT);
  const dragging = useRef(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef(0);
  const startH = useRef(0);

  useEffect(() => {
    if (!expanded) return;
    const body = chatBodyRef.current;
    if (!body) return;

    requestAnimationFrame(() => {
      body.scrollTo({
        top: body.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [expanded, loading, messages.length]);

  const onResizeStart = (event: React.MouseEvent) => {
    event.preventDefault();
    dragging.current = true;
    startY.current = event.clientY;
    startH.current = panelHeight;

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientY - startY.current;
      const next = Math.min(CHAT_HEIGHT_MAX, Math.max(CHAT_HEIGHT_MIN, startH.current + delta));
      setPanelHeight(next);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className={expanded ? "ai-conversation expanded" : "ai-conversation"}
      style={expanded ? { height: `${panelHeight}px` } : undefined}
    >
      <button
        className="ai-conversation-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span>Hoardly AI conversation</span>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded ? (
        <div className="ai-conversation-body" ref={chatBodyRef}>
          {messages.length === 0 ? (
            <div className="chat-row assistant">
              <div className="chat-message">
                <div className="chat-header">
                  <Avatar size="sm" className="chat-avatar-wrap">
                    <AvatarFallback className="chat-avatar-ai">
                      <Sparkles size={12} />
                    </AvatarFallback>
                  </Avatar>
                  <p className="chat-name">Hoardly AI</p>
                </div>
                <div className="chat-bubble">
                  我可以基于你的书签标题、描述、Tag 和文件夹做语义搜索，也可以建议把链接移动到合适的 Tag 或文件夹。输入问题后按 Enter 即可发送。
                </div>
              </div>
            </div>
          ) : null}

          {messages.map((message) =>
            message.role === "user" ? (
              <div className="chat-row user" key={message.id}>
                <div className="chat-message">
                  <div className="chat-header right">
                    <p className="chat-name">Avril Lavigne</p>
                    <Avatar size="sm" className="chat-avatar-wrap">
                      <AvatarImage alt="Avril Lavigne" src="/avril-avatar.png" />
                      <AvatarFallback>AL</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="chat-bubble user">{message.content}</div>
                </div>
              </div>
            ) : (
              <div className="chat-row assistant" key={message.id}>
                <div className="chat-message">
                  <div className="chat-header">
                    <Avatar size="sm" className="chat-avatar-wrap">
                      <AvatarFallback className="chat-avatar-ai">
                        <Sparkles size={12} />
                      </AvatarFallback>
                    </Avatar>
                    <p className="chat-name">
                      Hoardly AI {message.meta ? <span className="chat-meta">{message.meta}</span> : null}
                    </p>
                  </div>
                  <div className={error && message.meta ? "chat-bubble error" : "chat-bubble"}>
                    {message.content}
                  </div>
                </div>
              </div>
            ),
          )}

          {loading ? (
            <div className="chat-row assistant">
              <div className="chat-message">
                <div className="chat-header">
                  <Avatar size="sm" className="chat-avatar-wrap">
                    <AvatarFallback className="chat-avatar-ai">
                      <Loader2 className="spin" size={12} />
                    </AvatarFallback>
                  </Avatar>
                  <p className="chat-name">Hoardly AI</p>
                </div>
                <div className="chat-bubble muted">
                  正在调用模型并分析 {query ? "当前问题" : "书签"}...
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {expanded ? (
        <div
          className="ai-resize-handle"
          title="上下拖动调整高度"
          onMouseDown={onResizeStart}
        >
          <span className="ai-resize-bar" />
        </div>
      ) : null}
    </div>
  );
}

function BookmarkCard({
  bookmark,
  editingId,
  editingValue,
  menuFor,
  onCancelRename,
  onCommitRename,
  onDelete,
  onMenuChange,
  onRename,
  onRenameValueChange,
}: {
  bookmark: BookmarkMetadata;
  editingId: string | null;
  editingValue: string;
  menuFor: string | null;
  onCancelRename: () => void;
  onCommitRename: () => void;
  onDelete: () => void;
  onMenuChange: (key: string | null) => void;
  onRename: () => void;
  onRenameValueChange: (value: string) => void;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const menuKey = `bookmark-card:${bookmark.bookmarkId}`;
  const isRenaming = editingId === bookmark.bookmarkId;
  const host = getHostname(bookmark.url);

  return (
    <a
      className="bookmark-card"
      href={bookmark.url}
      rel="noopener noreferrer"
      target="_blank"
      onClick={(event) => {
        if (isRenaming || menuFor === menuKey) event.preventDefault();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenuChange(menuFor === menuKey ? null : menuKey);
      }}
    >
      <div className="bookmark-thumb">
        {thumbFailed ? (
          <div className="bookmark-thumb-fallback">{host.slice(0, 1).toUpperCase()}</div>
        ) : (
          <img alt="" src={getScreenshotUrl(bookmark.url)} onError={() => setThumbFailed(true)} />
        )}
      </div>
      <div className="bookmark-body">
        {isRenaming ? (
          <input
            autoFocus
            className="bookmark-title-edit"
            value={editingValue}
            onBlur={onCommitRename}
            onChange={(event) => onRenameValueChange(event.target.value)}
            onClick={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCommitRename();
              if (event.key === "Escape") onCancelRename();
            }}
          />
        ) : (
          <h3>{bookmark.title}</h3>
        )}
        <p>{bookmark.description}</p>
        <div className="tag-row">
          {bookmark.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      {menuFor === menuKey ? (
        <div className="category-menu bookmark-card-menu" onClick={(event) => event.preventDefault()}>
          <button onClick={onRename}>
            <Edit3 size={14} />
            重命名链接
          </button>
          <button className="danger" onClick={onDelete}>
            <Trash2 size={14} />
            删除链接
          </button>
        </div>
      ) : null}
    </a>
  );
}

function InvalidBookmarkCard({
  item,
  onDelete,
  onRestore,
}: {
  item: InvalidListItem;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const host = getHostname(item.url);

  return (
    <article className="bookmark-card invalid-bookmark-card">
      <div className="bookmark-thumb">
        {imageFailed ? (
          <div className="bookmark-thumb-fallback">{host.slice(0, 1).toUpperCase()}</div>
        ) : (
          <img alt="" src={getScreenshotUrl(item.url)} onError={() => setImageFailed(true)} />
        )}
        <span className="invalid-badge">{item.reason}</span>
      </div>
      <div className="bookmark-body">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <div className="tag-row">
          {item.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="invalid-card-actions">
          <button aria-label="恢复" title="恢复" onClick={onRestore}>
            <CheckCircle2 size={14} />
          </button>
          <button aria-label="彻底删除" className="danger" title="彻底删除" onClick={onDelete}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

function TagMark({ active }: { active: boolean }) {
  return (
    <svg
      className="tag-mark"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 0 : 1.8}
      viewBox="0 0 24 24"
    >
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L3 13V4h9l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7.5" cy="8.5" fill={active ? "var(--page-bg)" : "none"} r="1.3" />
    </svg>
  );
}

function getTagItems(bookmarks: typeof mockBookmarks) {
  const counts = new Map<string, number>();
  bookmarks.forEach((bookmark) => {
    bookmark.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });
  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count,
  );
}

function mergeCategoryItems(
  items: Array<{ name: string; count: number }>,
  extras: Array<{ name: string; count: number }>,
) {
  const names = new Set(items.map((item) => item.name));
  return [...items, ...extras.filter((item) => !names.has(item.name))];
}

function getUniqueTagName(existingNames: string[], baseName: string) {
  const names = new Set(existingNames);
  if (!names.has(baseName)) return baseName;

  let index = 2;
  while (names.has(`${baseName}-${index}`)) index += 1;
  return `${baseName}-${index}`;
}

function orderItems(items: Array<{ name: string; count: number }>, order: string[]) {
  if (order.length === 0) return items;

  return [...items].sort((a, b) => {
    const aIndex = order.indexOf(a.name);
    const bIndex = order.indexOf(b.name);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function getFolderItems(bookmarks: typeof mockBookmarks) {
  const counts = new Map<string, number>();
  bookmarks.forEach((bookmark) => {
    const folder = bookmark.folderSuggestion ?? "Unsorted";
    counts.set(folder, (counts.get(folder) ?? 0) + 1);
  });
  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count,
  );
}

function getScreenshotUrl(url: string) {
  return `https://image.thum.io/get/width/720/crop/420/${encodeURIComponent(url)}`;
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown website";
  }
}

function getShortUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

function isComplexAiQuery(value: string) {
  const query = value.trim();
  if (!query) return false;
  return (
    query.length > 28 ||
    /[?？]/.test(query) ||
    /帮我|整理|推荐|为什么|如何|找一下|summarize|organize|recommend|why|how/i.test(query)
  );
}

const rootElement = document.getElementById("root")!;
const globalWithPreviewRoot = globalThis as typeof globalThis & {
  __hoardlyPreviewRoot?: Root;
};

globalWithPreviewRoot.__hoardlyPreviewRoot ??= createRoot(rootElement);
globalWithPreviewRoot.__hoardlyPreviewRoot.render(<WebPreviewApp />);
