import type { BookmarkPageSignals } from "./bookmark-page-signals";
import { loadBookmarkPageSignals } from "./bookmark-page-signals";
import { getLocalHeuristicKeywords } from "./bookmark-tag-heuristics";

export type ExtendedTagEvidence = {
  signals: BookmarkPageSignals;
  /** 必填 SOP：仅用 URL 一问三标签（模型轮次写入；权重仅次于源 A） */
  urlOnlyThreeTags?: string[];
  /** 重要可选验证：后台非激活标签页抽取的正文节选（薄页/抓取失败时触发） */
  deepPageTextProbe?: string;
  /** 校验源 B：维基开放搜索标题 */
  wikipediaHints: string[];
  /** 校验源 C：DuckDuckGo Instant Answer 摘要（非官方搜索 API，仅摘要） */
  ddgInstantAnswer: string;
  /** 校验源 D：本地 URL 规则 */
  localHeuristics: string[];
  /** 页面外观缩略图（外链）；无视觉模型时仅作「存在截图」与常识提示 */
  thumbnailPageUrl: string;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const UA =
  "Mozilla/5.0 (compatible; Hoardly/1.0) AppleWebKit/537.36 Chrome/120 Safari/537.36";

export async function fetchWikipediaOpenSearchTitles(query: string): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&namespace=0&format=json&origin=*`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length < 2) return [];
    const titles = data[1];
    return Array.isArray(titles) ? titles.filter((t): t is string => typeof t === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export async function fetchDuckDuckGoInstantAnswer(hostname: string): Promise<string> {
  const q = `${hostname} what kind of website`;
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1`;
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
    if (!res.ok) return "";
    const j = (await res.json()) as {
      AbstractText?: string;
      AbstractURL?: string;
      Heading?: string;
      RelatedTopics?: Array<{ Text?: string }>;
    };
    const parts: string[] = [];
    if (j.Heading) parts.push(`Heading: ${j.Heading}`);
    if (j.AbstractText) parts.push(j.AbstractText);
    if (j.AbstractURL) parts.push(`Source: ${j.AbstractURL}`);
    for (const rt of (j.RelatedTopics ?? []).slice(0, 4)) {
      if (rt.Text) parts.push(rt.Text);
    }
    return parts.join("\n").slice(0, 2000);
  } catch {
    return "";
  }
}

export function buildEvidenceDossierForAi(
  url: string,
  title: string,
  ev: ExtendedTagEvidence,
): string {
  const urlOnlyLine =
    ev.urlOnlyThreeTags && ev.urlOnlyThreeTags.length >= 3
      ? ev.urlOnlyThreeTags.slice(0, 3).join(", ")
      : "(本轮必填「仅用 URL 反问」无有效三标签)";
  const deepProbe =
    ev.deepPageTextProbe && ev.deepPageTextProbe.trim().length > 0
      ? ev.deepPageTextProbe.trim().slice(0, 4000)
      : "";

  const lines: string[] = [
    `【书签标题】${title}`,
    `【URL】${url}`,
    "--- 校验源 A：页面 HTML 解析（站点自身描述，最高优先级）---",
    ev.signals.narrationForAi,
    "--- 必填 SOP·校验源 F：仅用 URL 反问三标签（权重仅次于 A；问题为「这是什么网站？可以给我 3 个标签描述这个网站吗」）---",
    urlOnlyLine,
  ];
  if (deepProbe) {
    lines.push(
      "--- 重要可选验证·后台打开页面抽取正文节选（非必跑；用于交叉验证）---",
      deepProbe,
    );
  }
  lines.push(
    "--- 校验源 B：维基相关标题 ---",
    ev.wikipediaHints.length ? ev.wikipediaHints.join(" | ") : "(无结果)",
    "--- 校验源 C：DDG 即时摘要（检索式理解站点）---",
    ev.ddgInstantAnswer.trim() || "(无摘要)",
    "--- 校验源 D：本地 URL 启发关键词 ---",
    ev.localHeuristics.length ? ev.localHeuristics.join(", ") : "(无)",
    "--- 校验源 E：页面缩略图（外链，供结合常识推断页面类型）---",
    ev.thumbnailPageUrl,
  );
  return lines.join("\n").slice(0, 8000);
}

export async function gatherExtendedTagEvidenceCore(url: string): Promise<ExtendedTagEvidence> {
  const trimmed = url.trim();
  const signals = /^https?:\/\//i.test(trimmed)
    ? await loadBookmarkPageSignals(trimmed)
    : ({
        fetchOk: false,
        fetchError: "not-http",
        narrationForAi: "非 http(s) 链接。",
      } as BookmarkPageSignals);

  const host = hostnameOf(trimmed);
  const [wikipediaHints, ddgInstantAnswer] = await Promise.all([
    fetchWikipediaOpenSearchTitles(host || trimmed.slice(0, 40)),
    host ? fetchDuckDuckGoInstantAnswer(host) : Promise.resolve(""),
  ]);

  const localHeuristics = /^https?:\/\//i.test(trimmed) ? getLocalHeuristicKeywords(trimmed) : [];
  const thumbnailPageUrl = /^https?:\/\//i.test(trimmed)
    ? `https://image.thum.io/get/width/720/crop/420/noanimate/${encodeURIComponent(trimmed)}`
    : "";

  return {
    signals,
    wikipediaHints,
    ddgInstantAnswer,
    localHeuristics,
    thumbnailPageUrl,
  };
}
