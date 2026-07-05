import { parseHTML } from "linkedom/worker";

/**
 * 为 AI 打标签拉取页面文本信号（扩展 background / 页面内 fetch HTML，不执行脚本）。
 */

export type BookmarkPageSignals = {
  fetchOk: boolean;
  fetchError?: string;
  /** 从 HTML 解析 */
  documentTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogSiteName?: string;
  firstH1?: string;
  /** Readability-style 主正文清洗结果：去掉导航、页脚、广告与脚本后的内容摘录 */
  readableText?: string;
  /** 给模型读的短叙述（中文为主，限长） */
  narrationForAi: string;
};

const DEFAULT_UA =
  "Mozilla/5.0 (compatible; Hoardly/1.0; +https://hoardly) AppleWebKit/537.36 Chrome/120 Safari/537.36";

function decodeBasicEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html: string) {
  return decodeBasicEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const NOISE_SELECTOR = [
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "iframe",
  "nav",
  "footer",
  "header",
  "aside",
  "form",
  "button",
  "input",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  "[aria-hidden='true']",
  ".cookie",
  ".cookies",
  ".banner",
  ".advertisement",
  ".ads",
  ".ad",
  ".modal",
  ".popup",
  ".sidebar",
  ".menu",
].join(",");

const CONTENT_SELECTOR = [
  "article",
  "main",
  "[role='main']",
  ".content",
  ".post-content",
  ".entry-content",
  ".article",
  ".markdown-body",
  ".readme",
  ".prose",
  "body",
].join(",");

function cleanText(text: string) {
  return decodeBasicEntities(text)
    .replace(/\s+/g, " ")
    .replace(/\b(sign in|log in|subscribe|accept cookies|privacy policy|terms of service)\b/gi, " ")
    .trim();
}

function extractReadableText(html: string) {
  try {
    const { document } = parseHTML(html);
    document.querySelectorAll(NOISE_SELECTOR).forEach((node) => node.remove());

    const candidates = Array.from(document.querySelectorAll(CONTENT_SELECTOR))
      .map((node) => cleanText(node.textContent ?? ""))
      .filter((text) => text.length >= 160)
      .sort((a, b) => b.length - a.length);

    const best = candidates[0] ?? cleanText(document.body?.textContent ?? "");
    return best.slice(0, 4200);
  } catch {
    return stripTags(html).slice(0, 2600);
  }
}

function metaContent(html: string, attr: "name" | "property", key: string) {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return decodeBasicEntities(m[1].trim());
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${key}["'][^>]*>`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1] ? decodeBasicEntities(m2[1].trim()) : undefined;
}

function parseOpenGraphAndMeta(html: string) {
  const head = html.slice(0, Math.min(html.length, 450_000));
  const titleMatch = head.match(/<title[^>]*>([^<]{0,400})<\/title>/i);
  const documentTitle = titleMatch?.[1] ? stripTags(titleMatch[1]).slice(0, 280) : undefined;

  const metaDescription =
    metaContent(head, "name", "description") ??
    metaContent(head, "name", "twitter:description");

  const ogTitle = metaContent(head, "property", "og:title");
  const ogDescription =
    metaContent(head, "property", "og:description") ??
    metaContent(head, "name", "twitter:description");
  const ogSiteName = metaContent(head, "property", "og:site_name");

  const h1Match = head.match(/<h1[^>]*>([\s\S]{0,800})<\/h1>/i);
  let firstH1: string | undefined;
  if (h1Match?.[1]) {
    firstH1 = stripTags(h1Match[1]).slice(0, 240);
  }

  return {
    documentTitle,
    metaDescription: metaDescription?.slice(0, 600),
    ogTitle: ogTitle?.slice(0, 280),
    ogDescription: ogDescription?.slice(0, 600),
    ogSiteName: ogSiteName?.slice(0, 120),
    firstH1,
    readableText: extractReadableText(html),
  };
}

function buildNarration(
  url: string,
  parsed: ReturnType<typeof parseOpenGraphAndMeta>,
  fetchError?: string,
): string {
  if (fetchError) {
    return `【页面抓取失败】${fetchError}。请仅依据 URL 与书签标题推断，标签避免使用与域名品牌相同的词。`;
  }
  const lines: string[] = [`页面 URL：${url}`];
  if (parsed.ogSiteName) lines.push(`站点/品牌名（勿直接用作 tag）：${parsed.ogSiteName}`);
  if (parsed.documentTitle) lines.push(`HTML <title>：${parsed.documentTitle}`);
  if (parsed.ogTitle && parsed.ogTitle !== parsed.documentTitle) lines.push(`og:title：${parsed.ogTitle}`);
  if (parsed.firstH1) lines.push(`主标题 h1：${parsed.firstH1}`);
  if (parsed.metaDescription) lines.push(`meta description：${parsed.metaDescription}`);
  if (parsed.ogDescription && parsed.ogDescription !== parsed.metaDescription) {
    lines.push(`og:description：${parsed.ogDescription}`);
  }
  if (parsed.readableText && parsed.readableText.length >= 160) {
    lines.push(`Readability-style 正文摘录：${parsed.readableText.slice(0, 1800)}`);
  }
  const block = lines.join("\n");
  return block.length > 5200 ? `${block.slice(0, 5200)}\n…（已截断）` : block;
}

export function parseHtmlToSignals(html: string, url: string, fetchError?: string): BookmarkPageSignals {
  const parsed = parseOpenGraphAndMeta(html);
  const fetchOk = !fetchError && Boolean(parsed.metaDescription || parsed.ogDescription || parsed.firstH1 || parsed.documentTitle || parsed.readableText);
  return {
    fetchOk,
    fetchError,
    ...parsed,
    narrationForAi: buildNarration(url, parsed, fetchError),
  };
}

export async function fetchHtmlForBookmarkUrl(
  url: string,
  options?: { timeoutMs?: number; maxBytes?: number },
): Promise<{ ok: boolean; html?: string; error?: string }> {
  const timeoutMs = options?.timeoutMs ?? 12_000;
  const maxBytes = options?.maxBytes ?? 400_000;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { ok: false, error: "invalid-url" };
  }
  if (!/^https?:$/i.test(parsedUrl.protocol)) {
    return { ok: false, error: "not-http" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      credentials: "omit",
      headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8", "User-Agent": DEFAULT_UA },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, error: `http-${res.status}` };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { ok: true, html: text.slice(0, maxBytes) };
    }

    const decoder = new TextDecoder();
    let received = "";
    while (received.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      received += decoder.decode(value, { stream: true });
    }
    reader.releaseLock?.();
    return { ok: true, html: received.slice(0, maxBytes) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch-failed";
    if (msg.includes("abort")) return { ok: false, error: "timeout" };
    return { ok: false, error: msg.slice(0, 120) };
  } finally {
    clearTimeout(timer);
  }
}

export async function loadBookmarkPageSignals(url: string): Promise<BookmarkPageSignals> {
  const { ok, html, error } = await fetchHtmlForBookmarkUrl(url);
  if (!ok || !html) {
    return parseHtmlToSignals("", url, error ?? "no-body");
  }
  return parseHtmlToSignals(html, url);
}
