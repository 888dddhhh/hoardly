import type { BookmarkMetadata } from "../types/bookmark";
import type { InvalidBookmarkRecord } from "./invalid-links";

const LS_EXT_ID = "hoardly:chrome-extension-id";

function envExtensionId(): string {
  const raw = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_HOARDLY_EXTENSION_ID;
  return typeof raw === "string" ? raw.trim() : "";
}

/** 构建/部署时可写死；用户也可在网页里保存到 localStorage，避免每次部署改环境变量 */
export function getChromeExtensionIdForBridge(): string {
  if (typeof window === "undefined") return envExtensionId();
  return envExtensionId() || window.localStorage.getItem(LS_EXT_ID)?.trim() || "";
}

export function setChromeExtensionIdForBridge(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_EXT_ID, id.trim());
}

export type ChromeBridgeOk<T> = { ok: true; data: T } | { ok: false; error: string };

function getChromeRuntime() {
  return (globalThis as { chrome?: typeof chrome }).chrome;
}

export function fetchChromeBookmarksViaExtension(
  extensionId: string,
): Promise<ChromeBridgeOk<BookmarkMetadata[]>> {
  return new Promise((resolve) => {
    const chromeApi = getChromeRuntime();
    if (!extensionId) {
      resolve({ ok: false, error: "未配置扩展 ID。" });
      return;
    }
    if (!chromeApi?.runtime?.sendMessage) {
      resolve({
        ok: false,
        error: "当前环境没有 chrome.runtime（请用 Chrome 打开本页，并已安装扩展）。",
      });
      return;
    }

    chromeApi.runtime.sendMessage(
      extensionId,
      { type: "hoardly.listBookmarks" },
      (response: unknown) => {
        const last = chromeApi.runtime.lastError;
        if (last?.message) {
          resolve({
            ok: false,
            error: `${last.message}（请确认扩展 manifest 已包含 externally_connectable 匹配本页域名，且 ID 正确）`,
          });
          return;
        }
        const res = response as {
          ok?: boolean;
          bookmarks?: BookmarkMetadata[];
          error?: string;
        };
        if (res?.ok === false) {
          resolve({ ok: false, error: res.error ?? "扩展返回失败" });
          return;
        }
        if (Array.isArray(res?.bookmarks)) {
          resolve({ ok: true, data: res.bookmarks });
          return;
        }
        resolve({ ok: false, error: "扩展未返回书签列表。" });
      },
    );
  });
}

export function fetchChromeInvalidRecordsViaExtension(
  extensionId: string,
): Promise<ChromeBridgeOk<InvalidBookmarkRecord[]>> {
  return new Promise((resolve) => {
    const chromeApi = getChromeRuntime();
    if (!extensionId || !chromeApi?.runtime?.sendMessage) {
      resolve({ ok: false, error: "无法连接扩展。" });
      return;
    }

    chromeApi.runtime.sendMessage(extensionId, { type: "hoardly.listInvalidLinks" }, (response: unknown) => {
      const last = chromeApi.runtime.lastError;
      if (last?.message) {
        resolve({ ok: false, error: last.message });
        return;
      }
      const res = response as {
        ok?: boolean;
        records?: InvalidBookmarkRecord[];
        error?: string;
      };
      if (res?.ok === false) {
        resolve({ ok: false, error: res.error ?? "扩展返回失败" });
        return;
      }
      if (Array.isArray(res?.records)) {
        resolve({ ok: true, data: res.records });
        return;
      }
      resolve({ ok: false, error: "扩展未返回失效列表。" });
    });
  });
}
