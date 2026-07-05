import type { BookmarkMetadata } from "../types/bookmark";
import type { InvalidBookmarkRecord } from "./invalid-links";
import type { BookmarkPageSignals } from "./bookmark-page-signals";
import { loadBookmarkPageSignals } from "./bookmark-page-signals";
import type { ExtendedTagEvidence } from "./bookmark-tag-evidence";
import { gatherExtendedTagEvidenceCore } from "./bookmark-tag-evidence";

export type BookmarkCreateInput = {
  title?: string;
  url: string;
};

type RuntimeResponse<T> = T & {
  error?: string;
  ok?: boolean;
  applied?: number;
  processed?: number;
  total?: number;
};

type ChromeLike = typeof chrome;

/** 仅扩展内页面（popup / app / options）为 true；演示站网页即使有 sendMessage 也不应冒充扩展上下文 */
export function hasExtensionRuntime() {
  const runtime = getChrome()?.runtime;
  return Boolean(runtime?.id && runtime?.sendMessage);
}

/** 仅在扩展上下文中可用；勿在 https 网页用相对路径打开 app，否则会落到演示域的假数据页 */
export function getExtensionUrl(path: string) {
  const runtime = getChrome()?.runtime;
  if (!runtime?.getURL) {
    throw new Error(
      "当前页面不是扩展页面（缺少 chrome.runtime.getURL）。请从扩展图标打开全屏，或使用 chrome-extension://…/app.html。",
    );
  }
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return runtime.getURL(normalized);
}

export async function openExtensionPage(path: string) {
  let url: string;
  try {
    url = getExtensionUrl(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法打开扩展页";
    window.alert?.(message);
    throw error;
  }
  const tabs = getChrome()?.tabs;

  if (tabs?.create) {
    await tabs.create({ url });
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function listAppBookmarks() {
  if (!hasExtensionRuntime()) {
    return [];
  }

  const response = await sendRuntimeMessage<{
    bookmarks: BookmarkMetadata[];
  }>({ type: "hoardly.listBookmarks" });

  if (!response || response.ok === false) {
    throw new Error(
      (response as { error?: string } | null)?.error ??
        "无法读取 Chrome 书签，请确认已安装并启用 Hoardly 扩展。",
    );
  }

  return response.bookmarks ?? [];
}

export async function listRecentAppBookmarks(limit = 20) {
  if (!hasExtensionRuntime()) {
    return [];
  }

  const response = await sendRuntimeMessage<{
    bookmarks: BookmarkMetadata[];
  }>({ limit, type: "hoardly.listRecentBookmarks" });

  if (!response || response.ok === false) {
    throw new Error(
      (response as { error?: string } | null)?.error ??
        "无法读取 Chrome 最近书签，请确认扩展已启用。",
    );
  }

  return response.bookmarks ?? [];
}

export async function createAppBookmark(input: BookmarkCreateInput) {
  const normalizedUrl = normalizeUrl(input.url);
  if (!normalizedUrl) {
    throw new Error("请输入有效链接。");
  }

  const response = await sendRuntimeMessage<{
    bookmark: BookmarkMetadata;
  }>({
    bookmark: {
      title: input.title?.trim(),
      url: normalizedUrl,
    },
    type: "hoardly.createBookmark",
  });

  if (!response?.bookmark) {
    throw new Error("当前不在 Chrome 扩展环境，无法写入浏览器书签。");
  }

  return response.bookmark;
}

export async function deleteAppBookmark(bookmarkId: string) {
  await sendRuntimeMessage({ bookmarkId, type: "hoardly.deleteBookmark" });
}

export async function listInvalidAppBookmarks() {
  if (!hasExtensionRuntime()) {
    return [];
  }

  const response = await sendRuntimeMessage<{
    records: InvalidBookmarkRecord[];
  }>({ type: "hoardly.listInvalidLinks" });

  if (!response || response.ok === false) {
    throw new Error(
      (response as { error?: string } | null)?.error ?? "无法读取失效链接列表。",
    );
  }

  return response.records ?? [];
}

export async function runInvalidAppBookmarkCheck() {
  await sendRuntimeMessage({ type: "hoardly.runInvalidLinkCheck" });
}

export async function applyBookmarkMetadataBatch(items: BookmarkMetadata[]) {
  if (!hasExtensionRuntime()) {
    throw new Error("仅能在 Chrome 扩展环境中写回书签。");
  }

  const response = await sendRuntimeMessage<{ applied: number }>({
    type: "hoardly.applyBookmarkMetadataBatch",
    items,
  });

  if (!response || response.ok === false) {
    throw new Error(
      (response as { error?: string } | null)?.error ?? "保存书签元数据失败。",
    );
  }

  return response.applied ?? items.length;
}

export async function reanalyzeAllAppBookmarks(limit = 300) {
  if (!hasExtensionRuntime()) {
    throw new Error("仅能在 Chrome 扩展环境中重新分析书签。");
  }

  const response = await sendRuntimeMessage<{
    active?: number;
    config?: {
      aiProvider?: string;
      hasAiKey?: boolean;
      hasCrawl4Ai?: boolean;
      hasFirecrawl?: boolean;
      hasMethodTwo?: boolean;
      model?: string;
    };
    pending?: number;
    processed: number;
    sampleErrors?: string[];
    total: number;
  }>({
    type: "hoardly.reanalyzeAllBookmarks",
    limit,
  });

  if (!response || response.ok === false) {
    throw new Error(
      (response as { error?: string } | null)?.error ?? "重新分析失败。",
    );
  }

  return {
    active: response.active ?? 0,
    config: response.config,
    pending: response.pending ?? 0,
    processed: response.processed ?? 0,
    sampleErrors: response.sampleErrors ?? [],
    total: response.total ?? 0,
  };
}

export async function restoreInvalidAppBookmark(bookmarkId: string) {
  await sendRuntimeMessage({ bookmarkId, type: "hoardly.restoreInvalidLink" });
}

export async function deleteInvalidAppBookmark(bookmarkId: string) {
  await sendRuntimeMessage({ bookmarkId, type: "hoardly.deleteInvalidLink" });
}

export async function getActiveTabBookmarkInput(): Promise<BookmarkCreateInput | null> {
  const tabs = getChrome()?.tabs;
  if (!tabs?.query) return null;

  const [tab] = await tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:\/\//i.test(tab.url)) return null;

  return {
    title: tab.title,
    url: tab.url,
  };
}

/** 在扩展弹窗 / 扩展页中打开书签链接（优先 tabs.create，避免仅 <a target="_blank"> 不生效） */
/**
 * 在扩展后台（或当前页）拉取书签 URL 的 HTML 并解析 meta/标题，供 AI 打标签。
 * 不打开可见标签页；仅 HTTP GET 文本。
 */
export async function fetchBookmarkPageSignals(url: string): Promise<BookmarkPageSignals> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return Promise.resolve({
      fetchOk: false,
      fetchError: "not-http",
      narrationForAi: "非 http(s) 链接，无法抓取页面。",
    });
  }

  if (hasExtensionRuntime()) {
    try {
      const response = await sendRuntimeMessage<{ signals: BookmarkPageSignals }>({
        type: "hoardly.fetchPageSignals",
        url: trimmed,
      });
      if (response && (response as { signals?: BookmarkPageSignals }).signals) {
        return (response as { signals: BookmarkPageSignals }).signals;
      }
    } catch {
      /* 回退到当前上下文 fetch */
    }
  }

  return loadBookmarkPageSignals(trimmed);
}

/** HTML + 维基 + DDG 摘要 + 本地启发 + 缩略图 URL，供多轮 AI 校验打标签 */
export async function gatherExtendedTagEvidence(url: string): Promise<ExtendedTagEvidence> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return gatherExtendedTagEvidenceCore(trimmed);
  }

  if (hasExtensionRuntime()) {
    try {
      const response = await sendRuntimeMessage<{ evidence: ExtendedTagEvidence }>({
        type: "hoardly.gatherExtendedTagEvidence",
        url: trimmed,
      });
      if (response && (response as { evidence?: ExtendedTagEvidence }).evidence) {
        return (response as { evidence: ExtendedTagEvidence }).evidence;
      }
    } catch {
      /* 回退 */
    }
  }

  return gatherExtendedTagEvidenceCore(trimmed);
}

/**
 * 在 Service Worker 中非激活打开页面并抽取 innerText 节选。
 * 非扩展上下文或非 http(s) 时返回空串；用于 HTML 证据偏薄时的可选验证。
 */
export async function fetchDeepPageTextOptional(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  if (!hasExtensionRuntime()) return "";
  try {
    const response = await sendRuntimeMessage<{ text?: string }>({
      type: "hoardly.deepPageTextProbe",
      url: trimmed,
    });
    const text = (response as { text?: string } | null)?.text;
    return typeof text === "string" ? text.trim() : "";
  } catch {
    return "";
  }
}

export function openBookmarkUrl(url: string) {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return;
  }

  const tabs = getChrome()?.tabs;
  if (tabs?.create) {
    void tabs.create({ url: trimmed, active: true });
    return;
  }

  window.open(trimmed, "_blank", "noopener,noreferrer");
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getHostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function isTransientSwMessageError(message: string) {
  return /Receiving end does not exist|Could not establish connection|Extension context invalidated/i.test(
    message,
  );
}

async function sendRuntimeMessage<T>(message: Record<string, unknown>) {
  const runtime = getChrome()?.runtime;
  if (!runtime?.sendMessage) return null;

  const maxAttempts = 3;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await new Promise<{
      ok: true;
      response: RuntimeResponse<T> | null;
    } | { ok: false; error: string }>((resolve) => {
      runtime.sendMessage(message, (response: RuntimeResponse<T> | undefined) => {
        const error = runtime.lastError?.message;
        if (error) {
          resolve({ ok: false, error });
          return;
        }

        if (response?.ok === false) {
          resolve({ ok: false, error: response.error ?? "Hoardly request failed." });
          return;
        }

        resolve({ ok: true, response: response ?? null });
      });
    });

    if (result.ok) {
      return result.response;
    }

    lastError = result.error;
    if (!isTransientSwMessageError(result.error) || attempt === maxAttempts) {
      return Promise.reject(new Error(result.error));
    }

    await new Promise((r) => setTimeout(r, 120 * attempt));
  }

  return Promise.reject(new Error(lastError ?? "Hoardly request failed."));
}

function getChrome() {
  return (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome;
}
