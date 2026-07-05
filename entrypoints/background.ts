import { defineBackground } from "wxt/utils/define-background";
import { classifyBookmarksWithAi } from "../src/lib/bookmark-ai-classify";
import {
  getBookmarkMetadata,
  getBookmarkMetadataMap,
  listBookmarkMetadata,
  removeBookmarkMetadata,
  saveBookmarkMetadataBatch,
  saveBookmarkMetadata,
} from "../src/lib/bookmark-metadata-store";
import {
  getStoredInvalidLinks,
  type InvalidBookmarkRecord,
  removeStoredInvalidLink,
  saveStoredInvalidLinks,
} from "../src/lib/invalid-links";
import type { BookmarkMetadata } from "../src/types/bookmark";
import { loadBookmarkPageSignals } from "../src/lib/bookmark-page-signals";
import { gatherExtendedTagEvidenceCore } from "../src/lib/bookmark-tag-evidence";
import {
  AI_USER_SETTINGS_STORAGE_KEY,
  normalizeAiUserSettings,
} from "../src/lib/ai-user-settings";

const DAILY_REVIEW_ALARM = "hoardly.daily-review";
const DAILY_INVALID_CHECK_ALARM = "hoardly.daily-invalid-check";
const PENDING_TAGGING_ALARM = "hoardly.pending-tagging";
const INVALID_STATUS_CODES = new Set([400, 401, 403, 404, 410, 451, 500, 502, 503, 504]);
const analysisInFlight = new Set<string>();
const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

/**
 * 非激活标签页加载后抽取正文（可选验证路径）；失败或超时时返回空串。
 * 仅用于 http(s)；需 manifest scripting + tabs。
 */
async function deepPageTextProbe(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";

  return new Promise((resolve) => {
    let settled = false;
    let tabId: number | undefined;
    let injected = false;

    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      resolve(text.slice(0, 8000));
    };

    const cleanupTab = async () => {
      if (tabId === undefined) return;
      const id = tabId;
      tabId = undefined;
      try {
        await chrome.tabs.remove(id);
      } catch {
        /* noop */
      }
    };

    const onDone = (text: string) => {
      void cleanupTab().finally(() => finish(text));
    };

    const timeout = setTimeout(() => {
      try {
        chrome.tabs.onUpdated.removeListener(onUpdated);
      } catch {
        /* noop */
      }
      onDone("");
    }, 18000);

    const inject = () => {
      if (injected || tabId === undefined) return;
      injected = true;
      clearTimeout(timeout);
      try {
        chrome.tabs.onUpdated.removeListener(onUpdated);
      } catch {
        /* noop */
      }
      const id = tabId;
      chrome.scripting.executeScript(
        {
          target: { tabId: id },
          func: () => (document.body?.innerText ?? "").slice(0, 6000),
        },
        (results) => {
          let text = "";
          if (!chrome.runtime.lastError && results?.[0]?.result != null) {
            text = String(results[0].result).trim();
          }
          onDone(text);
        },
      );
    };

    const onUpdated = (updatedTabId: number, info: { status?: string }) => {
      if (updatedTabId !== tabId || info.status !== "complete") return;
      inject();
    };

    chrome.tabs.create({ url: trimmed, active: false }, (tab) => {
      if (chrome.runtime.lastError || !tab?.id) {
        clearTimeout(timeout);
        finish("");
        return;
      }
      tabId = tab.id;
      chrome.tabs.get(tabId, (t) => {
        if (chrome.runtime.lastError || !t) {
          chrome.tabs.onUpdated.addListener(onUpdated);
          return;
        }
        if (t.status === "complete") {
          inject();
        } else {
          chrome.tabs.onUpdated.addListener(onUpdated);
        }
      });
    });
  });
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(DAILY_REVIEW_ALARM, {
      periodInMinutes: 60 * 24,
    });

    chrome.alarms.create(DAILY_INVALID_CHECK_ALARM, {
      periodInMinutes: 60 * 24,
    });

    chrome.alarms.create(PENDING_TAGGING_ALARM, {
      periodInMinutes: 5,
    });

    void runPendingBookmarkTagging(10);
  });

  chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create(PENDING_TAGGING_ALARM, {
      periodInMinutes: 5,
    });
    void runPendingBookmarkTagging(10);
  });

  chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    if (!bookmark.url) return;

    void analyzeAndStoreBookmark({
      bookmarkId: id,
      title: bookmark.title,
      url: bookmark.url,
    });
  });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url) return;
    void retryPendingBookmarkForUrl(tab.url);
  });

  chrome.bookmarks.onRemoved.addListener((id) => {
    void removeBookmarkMetadata(id);
  });

  chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (message?.type === "hoardly.listBookmarks") {
      return respond(sendResponse, async () => ({
        bookmarks: await listBookmarksWithMetadata(await getAllBookmarkLinks()),
      }));
    }

    if (message?.type === "hoardly.listInvalidLinks") {
      return respond(sendResponse, async () => ({
        records: await getStoredInvalidLinks(),
      }));
    }

    return false;
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "hoardly.listBookmarks") {
      return respond(sendResponse, async () => ({
        bookmarks: await listBookmarksWithMetadata(await getAllBookmarkLinks()),
      }));
    }

    if (message?.type === "hoardly.listRecentBookmarks") {
      return respond(sendResponse, async () => ({
        bookmarks: await listBookmarksWithMetadata(
          await getRecentBookmarkLinks(Number(message.limit) || 20),
        ),
      }));
    }

    if (message?.type === "hoardly.fetchPageSignals") {
      return respond(sendResponse, async () => {
        const url = String(message.url || "");
        if (!/^https?:\/\//i.test(url)) {
          return {
            signals: {
              fetchOk: false,
              fetchError: "not-http",
              narrationForAi: "非 http(s) 链接，无法抓取。",
            },
          };
        }
        const signals = await loadBookmarkPageSignals(url);
        return { signals };
      });
    }

    if (message?.type === "hoardly.gatherExtendedTagEvidence") {
      return respond(sendResponse, async () => {
        const url = String(message.url || "");
        const evidence = await gatherExtendedTagEvidenceCore(url);
        return { evidence };
      });
    }

    if (message?.type === "hoardly.deepPageTextProbe") {
      return respond(sendResponse, async () => {
        const url = String(message.url || "");
        const text = await deepPageTextProbe(url);
        return { text };
      });
    }

    if (message?.type === "hoardly.createBookmark") {
      return respond(sendResponse, async () => {
        const bookmarkInput = message.bookmark as
          | { title?: string; url?: string }
          | undefined;
        if (!bookmarkInput?.url) throw new Error("Missing bookmark URL.");

        const existingBookmark = await findExistingBookmarkLink(bookmarkInput.url);
        if (existingBookmark) {
          const [bookmark] = await listBookmarksWithMetadata([existingBookmark]);
          return { bookmark };
        }

        const bookmark = await chrome.bookmarks.create({
          title: bookmarkInput.title || bookmarkInput.url,
          url: bookmarkInput.url,
        });

        return {
          bookmark: await analyzeAndStoreBookmark({
            bookmarkId: bookmark.id,
            title: bookmark.title,
            url: bookmark.url || bookmarkInput.url,
          }),
        };
      });
    }

    if (message?.type === "hoardly.deleteBookmark") {
      return respond(sendResponse, async () => {
        const bookmarkId = String(message.bookmarkId || "");
        if (!bookmarkId) throw new Error("Missing bookmark id.");

        await chrome.bookmarks.remove(bookmarkId);
        await removeBookmarkMetadata(bookmarkId);
        await removeStoredInvalidLink(bookmarkId);
        return {};
      });
    }

    if (message?.type === "hoardly.runInvalidLinkCheck") {
      return respond(sendResponse, async () => {
        await runInvalidLinkCheck();
        return {};
      });
    }

    if (message?.type === "hoardly.applyBookmarkMetadataBatch") {
      return respond(sendResponse, async () => {
        const items = message.items as BookmarkMetadata[] | undefined;
        if (!items?.length) throw new Error("缺少书签元数据。");

        const normalized = items.map((item) => normalizeStrictMetadataForStorage(item));
        await saveBookmarkMetadataBatch(normalized);
        void runPendingBookmarkTagging(12);

        return { applied: normalized.length };
      });
    }

    if (message?.type === "hoardly.reanalyzeAllBookmarks") {
      return respond(sendResponse, async () => {
        const limit = Math.min(Math.max(Number(message.limit) || 10, 1), 2000);
        const processed = await runPendingBookmarkTagging(limit);
        const links = await getAllBookmarkLinks();
        const diagnostics = await getTaggingDiagnostics(links.length);
        return { processed, total: links.length, ...diagnostics };
      });
    }

    if (message?.type === "hoardly.runDailyBookmarkReview") {
      return respond(sendResponse, async () => {
        await runDailyBookmarkReview();
        return {};
      });
    }

    if (message?.type === "hoardly.listBookmarkMetadata") {
      return respond(sendResponse, async () => ({
        metadata: await listBookmarkMetadata(),
      }));
    }

    if (message?.type === "hoardly.listInvalidLinks") {
      return respond(sendResponse, async () => ({
        records: await getStoredInvalidLinks(),
      }));
    }

    if (message?.type === "hoardly.restoreInvalidLink") {
      return respond(sendResponse, async () => {
        const bookmarkId = String(message.bookmarkId || "");
        if (!bookmarkId) throw new Error("Missing bookmark id.");

        await restoreInvalidLink(bookmarkId);
        return {};
      });
    }

    if (message?.type === "hoardly.deleteInvalidLink") {
      return respond(sendResponse, async () => {
        const bookmarkId = String(message.bookmarkId || "");
        if (!bookmarkId) throw new Error("Missing bookmark id.");

        await chrome.bookmarks.remove(bookmarkId);
        await removeBookmarkMetadata(bookmarkId);
        await removeStoredInvalidLink(bookmarkId);
        return {};
      });
    }

    return false;
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === DAILY_REVIEW_ALARM) {
      void runDailyBookmarkReview();
    }

    if (alarm.name === DAILY_INVALID_CHECK_ALARM) {
      void runInvalidLinkCheck();
    }

    if (alarm.name === PENDING_TAGGING_ALARM) {
      void runPendingBookmarkTagging(10);
    }
  });
});

async function analyzeAndStoreBookmark(bookmark: {
  bookmarkId: string;
  title: string;
  url: string;
}) {
  const existing = await getBookmarkMetadata(bookmark.bookmarkId);
  const baseMetadata =
    existing ??
    createPendingBookmarkMetadata(bookmark, "正在获取标签，等待严格 AI 双方法验证。");

  if (analysisInFlight.has(bookmark.bookmarkId)) {
    return baseMetadata;
  }

  analysisInFlight.add(bookmark.bookmarkId);
  try {
    if (!existing || needsStrictTagging(existing)) {
      await saveBookmarkMetadata(
        createPendingBookmarkMetadata(bookmark, "正在获取标签，执行 Jina Reader + Method 2。"),
      );
    }

    const metadata = await classifyBookmarkWithAiFallback(baseMetadata);
    await saveBookmarkMetadata(metadata);
    await chrome.storage.local.set({
      [`bookmark:${bookmark.bookmarkId}:lastAiReviewStatus`]: {
        mode: "strict-jina-reader-plus-method-two",
        reviewedAt: metadata.lastAiReviewedAt,
        status: isStrictlyTagged(metadata) ? "completed" : "pending_review",
      },
    });
    return metadata;
  } finally {
    analysisInFlight.delete(bookmark.bookmarkId);
  }
}

async function classifyBookmarkWithAiFallback(bookmark: BookmarkMetadata) {
  try {
    const [classified] = await classifyBookmarksWithAi([bookmark]);
    if (classified) {
      return normalizeStrictMetadataForStorage(classified);
    }
  } catch (error) {
    return createPendingBookmarkMetadata(
      bookmark,
      error instanceof Error ? error.message : "Strict AI classification failed.",
    );
  }

  return createPendingBookmarkMetadata(bookmark, "严格 AI 双方法暂未返回结果。");
}

function respond<T extends Record<string, unknown>>(
  sendResponse: (response?: unknown) => void,
  action: () => Promise<T>,
) {
  void action()
    .then((payload) => sendResponse({ ok: true, ...payload }))
    .catch((error) => {
      sendResponse({
        error: error instanceof Error ? error.message : "Hoardly request failed.",
        ok: false,
      });
    });

  return true;
}

async function listBookmarksWithMetadata(
  links: Array<{
    id: string;
    parentTitle?: string;
    title: string;
    url: string;
  }>,
) {
  const [metadataMap, invalidLinks] = await Promise.all([
    getBookmarkMetadataMap(),
    getStoredInvalidLinks(),
  ]);
  const invalidByBookmarkId = new Map(
    invalidLinks.map((record) => [record.bookmarkId, record]),
  );
  const generatedMetadata: BookmarkMetadata[] = [];

  const bookmarks = links.map((link) => {
    const existing = metadataMap[link.id];
    const metadata =
      existing ??
      createPendingBookmarkMetadata({
        bookmarkId: link.id,
        title: link.title,
        url: link.url,
      });
    const invalidRecord = invalidByBookmarkId.get(link.id);

    if (!existing) generatedMetadata.push(metadata);

    return {
      ...metadata,
      folderSuggestion: metadata.folderSuggestion ?? link.parentTitle,
      invalidReason: invalidRecord?.reason ?? metadata.invalidReason,
      lastInvalidCheckedAt: invalidRecord?.checkedAt ?? metadata.lastInvalidCheckedAt,
      status: invalidRecord ? "invalid" : metadata.status,
      title: link.title || metadata.title,
      url: link.url,
    };
  });

  await saveBookmarkMetadataBatch(generatedMetadata);
  if (generatedMetadata.length > 0) {
    void runPendingBookmarkTagging(10);
  }

  return bookmarks;
}

async function restoreInvalidLink(bookmarkId: string) {
  await removeStoredInvalidLink(bookmarkId);

  const metadata = await getBookmarkMetadata(bookmarkId);
  if (!metadata) return;

  await saveBookmarkMetadata({
    ...metadata,
    invalidReason: undefined,
    lastInvalidCheckedAt: undefined,
    status: metadata.tags.length === 3 ? "active" : "pending_review",
  });

  if (metadata.tags.length !== 3) {
    void runPendingBookmarkTagging(8);
  }
}

function isStrictlyTagged(metadata: BookmarkMetadata) {
  return metadata.status === "active" && metadata.tags.length === 3;
}

function needsStrictTagging(metadata: BookmarkMetadata) {
  return metadata.status === "pending_review" || metadata.tags.length !== 3;
}

function createPendingBookmarkMetadata(
  bookmark: Pick<BookmarkMetadata, "bookmarkId" | "title" | "url"> & Partial<BookmarkMetadata>,
  reason = "正在获取标签，等待严格 AI 双方法验证。",
): BookmarkMetadata {
  const clippedReason = reason.trim().slice(0, 320);
  const description = clippedReason.startsWith("正在获取")
    ? clippedReason
    : `正在获取标签：${clippedReason}`;

  return {
    bookmarkId: bookmark.bookmarkId,
    confidence: 0,
    description,
    folderSuggestion: bookmark.folderSuggestion ?? "正在获取",
    invalidReason: bookmark.invalidReason,
    lastAiReviewedAt: new Date().toISOString(),
    lastInvalidCheckedAt: bookmark.lastInvalidCheckedAt,
    sourcePlatform: bookmark.sourcePlatform,
    status: "pending_review",
    tags: [],
    thumbnailUrl: bookmark.thumbnailUrl,
    title: bookmark.title,
    url: bookmark.url,
  };
}

function normalizeStrictMetadataForStorage(metadata: BookmarkMetadata): BookmarkMetadata {
  if (metadata.status === "invalid") return metadata;
  if (metadata.tags.length === 3) {
    return {
      ...metadata,
      status: "active",
      tags: metadata.tags.slice(0, 3),
    };
  }

  return createPendingBookmarkMetadata(
    metadata,
    metadata.description || "严格 AI 双方法还没有生成 3 个可验证标签。",
  );
}

async function runPendingBookmarkTagging(limit = 12) {
  const links = await getAllBookmarkLinks();
  const metadataMap = await getBookmarkMetadataMap();
  const pending = links
    .filter((link) => {
      const metadata = metadataMap[link.id];
      return !metadata || needsStrictTagging(metadata);
    })
    .slice(0, limit);

  let processed = 0;
  for (const bookmark of pending) {
    await analyzeAndStoreBookmark({
      bookmarkId: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
    });
    processed += 1;
  }

  await chrome.storage.local.set({
    "jobs:lastPendingTaggingAt": new Date().toISOString(),
    "jobs:lastPendingTaggingCount": processed,
  });

  return processed;
}

async function getTaggingDiagnostics(total: number) {
  const [metadataMap, config] = await Promise.all([
    getBookmarkMetadataMap(),
    getTaggingConfigStatus(),
  ]);
  const metadata = Object.values(metadataMap);
  const active = metadata.filter((item) => item.status === "active" && item.tags.length === 3)
    .length;
  const pendingItems = metadata.filter((item) => needsStrictTagging(item));
  const sampleErrors = Array.from(
    new Set(
      pendingItems
        .map((item) => item.description ?? "")
        .filter(Boolean)
        .map((text) => text.replace(/^正在获取标签：/, "").replace(/^自动打标未完成：/, ""))
        .filter((text) => !/^正在获取标签/.test(text))
        .slice(0, 5),
    ),
  );

  return {
    active,
    config,
    pending: Math.max(0, total - active),
    sampleErrors,
  };
}

async function getTaggingConfigStatus() {
  const stored = await chrome.storage.local.get(AI_USER_SETTINGS_STORAGE_KEY);
  const settings = normalizeAiUserSettings(
    stored[AI_USER_SETTINGS_STORAGE_KEY] as Parameters<typeof normalizeAiUserSettings>[0],
  );
  const hasStoredAiKey = settings.useCustomApi && settings.apiKey.trim().length > 0;
  const hasEnvAiKey = Boolean(
    env.VITE_OPENROUTER_API_KEY ||
      env.VITE_GROQ_API_KEY ||
      env.VITE_DEEPSEEK_API_KEY ||
      env.VITE_OPENAI_API_KEY,
  );
  const hasFirecrawl = Boolean(
    settings.firecrawlApiKey.trim() || env.VITE_FIRECRAWL_API_KEY || env.FIRECRAWL_API_KEY,
  );
  const hasCrawl4Ai = Boolean(
    settings.crawl4AiEndpoint.trim() || env.VITE_CRAWL4AI_ENDPOINT || env.CRAWL4AI_ENDPOINT,
  );

  return {
    aiProvider: settings.useCustomApi ? settings.provider : env.VITE_HOARDLY_AI_PROVIDER ?? "openrouter",
    hasAiKey: hasStoredAiKey || hasEnvAiKey,
    hasCrawl4Ai,
    hasFirecrawl,
    hasMethodTwo: hasFirecrawl || hasCrawl4Ai,
    model: settings.useCustomApi ? settings.model : env.VITE_HOARDLY_AI_MODEL ?? settings.model,
  };
}

async function retryPendingBookmarkForUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return;

  const existingBookmark = await findBookmarkLinkForVisitedUrl(url);
  if (!existingBookmark) return;

  const metadata = await getBookmarkMetadata(existingBookmark.id);
  if (metadata && !needsStrictTagging(metadata)) return;

  await analyzeAndStoreBookmark({
    bookmarkId: existingBookmark.id,
    title: existingBookmark.title,
    url: existingBookmark.url,
  });
}

async function findBookmarkLinkForVisitedUrl(url: string) {
  const exact = await findExistingBookmarkLink(url);
  if (exact) return exact;

  const target = normalizeVisitedUrl(url);
  const links = await getAllBookmarkLinks();
  return links.find((link) => normalizeVisitedUrl(link.url) === target) ?? null;
}

function normalizeVisitedUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

async function runDailyBookmarkReview() {
  const reviewedAt = new Date().toISOString();
  const bookmarks = await getAllBookmarkLinks();

  for (const bookmark of bookmarks) {
    await analyzeAndStoreBookmark({
      bookmarkId: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
    });
  }

  await chrome.storage.local.set({
    "jobs:lastDailyReviewAt": reviewedAt,
    "jobs:lastDailyReviewCount": bookmarks.length,
  });
}

async function runInvalidLinkCheck() {
  const checkedAt = new Date().toISOString();
  const bookmarks = await getAllBookmarkLinks();
  const invalidRecords: InvalidBookmarkRecord[] = [];

  for (const bookmark of bookmarks) {
    const result = await checkBookmarkUrl(bookmark.url);
    if (!result.invalid) continue;

    invalidRecords.push({
      bookmarkId: bookmark.id,
      checkedAt,
      originalFolder: bookmark.parentTitle,
      reason: result.reason,
      title: bookmark.title || bookmark.url,
      url: bookmark.url,
    });
  }

  await saveStoredInvalidLinks(invalidRecords);
  await chrome.storage.local.set({
    "jobs:lastInvalidCheckAt": checkedAt,
    "jobs:lastInvalidCheckCount": invalidRecords.length,
  });
}

async function getAllBookmarkLinks() {
  const tree = await chrome.bookmarks.getTree();
  const links: Array<{
    id: string;
    parentTitle?: string;
    title: string;
    url: string;
  }> = [];

  const walk = (nodes: chrome.bookmarks.BookmarkTreeNode[], parentTitle?: string) => {
    nodes.forEach((node) => {
      if (node.url) {
        links.push({
          id: node.id,
          parentTitle,
          title: node.title,
          url: node.url,
        });
        return;
      }

      if (node.children) walk(node.children, node.title || parentTitle);
    });
  };

  walk(tree);
  return links;
}

async function getRecentBookmarkLinks(limit: number) {
  const recent = await chrome.bookmarks.getRecent(limit);

  return Promise.all(
    recent
      .filter((bookmark) => Boolean(bookmark.url))
      .map(async (bookmark) => ({
        id: bookmark.id,
        parentTitle: await getBookmarkParentTitle(bookmark.parentId),
        title: bookmark.title,
        url: bookmark.url || "",
      })),
  );
}

async function findExistingBookmarkLink(url: string) {
  const matches = await chrome.bookmarks.search({ url });
  const match = matches.find((bookmark) => bookmark.url === url);
  if (!match?.url) return null;

  return {
    id: match.id,
    parentTitle: await getBookmarkParentTitle(match.parentId),
    title: match.title,
    url: match.url,
  };
}

async function getBookmarkParentTitle(parentId?: string) {
  if (!parentId) return undefined;

  try {
    const [parent] = await chrome.bookmarks.get(parentId);
    return parent?.title || undefined;
  } catch {
    return undefined;
  }
}

async function checkBookmarkUrl(url: string) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (INVALID_STATUS_CODES.has(response.status)) {
      return {
        invalid: true,
        reason: `HTTP ${response.status}`,
      };
    }

    return { invalid: false, reason: "" };
  } catch {
    return checkBookmarkUrlWithGet(url);
  }
}

async function checkBookmarkUrlWithGet(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (INVALID_STATUS_CODES.has(response.status)) {
      return {
        invalid: true,
        reason: `HTTP ${response.status}`,
      };
    }

    return { invalid: false, reason: "" };
  } catch (error) {
    return {
      invalid: true,
      reason: error instanceof Error ? error.name : "Network error",
    };
  }
}
