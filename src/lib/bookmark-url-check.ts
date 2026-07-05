export type UrlCheckResult = {
  url: string;
  ok: boolean;
  status?: number;
  reason: string;
};

export async function checkBookmarkUrls(urls: string[]): Promise<UrlCheckResult[]> {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const canUsePreviewProxy =
    typeof window !== "undefined" &&
    (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost");

  if (canUsePreviewProxy) {
    const res = await fetch("/api/check-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: unique }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`链接检测服务不可用：${res.status} ${t}`);
    }
    const data = (await res.json()) as { results: UrlCheckResult[] };
    return data.results ?? [];
  }

  const results: UrlCheckResult[] = [];
  for (const url of unique) {
    results.push(await checkSingleUrlInBrowser(url));
  }
  return results;
}

async function checkSingleUrlInBrowser(url: string): Promise<UrlCheckResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12000);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      mode: "cors",
      signal: controller.signal,
      cache: "no-store",
    });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        mode: "cors",
        signal: controller.signal,
        cache: "no-store",
      });
    }
    window.clearTimeout(timer);
    if (res.ok || (res.status >= 200 && res.status < 400)) {
      return { url, ok: true, status: res.status, reason: `HTTP ${res.status}` };
    }
    return {
      url,
      ok: false,
      status: res.status,
      reason: `HTTP ${res.status}`,
    };
  } catch (error) {
    window.clearTimeout(timer);
    const message = error instanceof Error ? error.message : "网络错误";
    return { url, ok: false, reason: message };
  }
}
