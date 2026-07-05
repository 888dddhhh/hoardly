import type { BookmarkMetadata } from "../types/bookmark";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "this",
  "that",
  "page",
  "home",
  "site",
  "web",
  "http",
  "https",
  "www",
  "com",
  "org",
  "net",
  "saved",
  "hoardly",
  "categorized",
  "topic",
  "topics",
  "keyword",
  "keywords",
  "url",
  "link",
  "links",
  "site",
  "website",
  "webpage",
  "page",
  "pages",
  "resource",
  "resources",
  "bookmark",
  "bookmarks",
  "qs",
]);

export function slugTag(raw: string): string {
  const s = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return s;
}

export function isUsefulTag(tag: string, blocklist?: Set<string>) {
  if (tag.length < 2) return false;
  if (STOP.has(tag)) return false;
  if (/^(topic|topics|qs|url|link|website|webpage|page|resource|bookmark)$/i.test(tag)) {
    return false;
  }
  if (/^uncategorized\b|^unknown\b|^misc\b|^other\b/i.test(tag)) return false;
  if (blocklist?.has(tag)) return false;
  return true;
}

export function getHostnameForTags(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/** 从域名与页面品牌字段生成「禁止作为 tag」的 slug 集合（避免标签=网站名） */
export function buildBrandSlugBlocklist(
  url: string,
  page?: { ogSiteName?: string; documentTitle?: string; ogTitle?: string },
): Set<string> {
  const block = new Set<string>();
  const host = getHostnameForTags(url).toLowerCase();
  host
    .split(".")
    .filter((p) => p && p !== "www" && p.length >= 2)
    .forEach((p) => {
      const s = slugTag(p);
      if (s.length >= 2) block.add(s);
    });
  const blob = [page?.ogSiteName, page?.documentTitle, page?.ogTitle].filter(Boolean).join(" ");
  blob
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3)
    .forEach((w) => {
      const s = slugTag(w);
      if (s.length >= 2) block.add(s);
    });
  return block;
}

/** 标题中的显著拉丁词（偏长），避免把标题复述成 tag；短词（如 ai、dev）不拦截 */
function significantTitleTokens(title: string): Set<string> {
  const set = new Set<string>();
  const lower = title.toLowerCase();
  lower
    .split(/[^a-z0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 5)
    .forEach((w) => set.add(w));
  return set;
}

/** 从 description 里取候选拉丁词（非停用、不在标题显著词中） */
function tokensFromDescription(description: string | undefined, titleBlock: Set<string>): string[] {
  if (!description?.trim()) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && w.length <= 20 && !STOP.has(w) && !titleBlock.has(w))
    .forEach((w) => {
      const slug = slugTag(w);
      if (slug.length >= 2 && !seen.has(slug)) {
        seen.add(slug);
        out.push(slug);
      }
    });
  return out.slice(0, 6);
}

function pathSegmentTags(url: string): string[] {
  try {
    const u = new URL(url);
    const segments = u.pathname
      .split("/")
      .map((s) => decodeURIComponent(s))
      .filter((s) => s.length >= 2 && s.length <= 32 && !/\.[a-z0-9]{1,4}$/i.test(s));
    const tags: string[] = [];
    const seen = new Set<string>();
    for (const seg of segments) {
      const slug = slugTag(seg);
      if (slug.length >= 2 && slug !== "index" && !seen.has(slug)) {
        seen.add(slug);
        tags.push(slug);
        if (tags.length >= 4) break;
      }
    }
    return tags;
  } catch {
    return [];
  }
}

const KNOWN_HOST_ALIASES: Array<{ test: (h: string) => boolean; tags: string[] }> = [
  { test: (h) => h.includes("github.com"), tags: ["github", "code-host"] },
  { test: (h) => h.includes("gitlab.com"), tags: ["gitlab", "code-host"] },
  { test: (h) => h.includes("stackoverflow.com"), tags: ["stackoverflow", "qna"] },
  { test: (h) => h.includes("youtube.com") || h === "youtu.be", tags: ["youtube", "video"] },
  { test: (h) => h.includes("medium.com"), tags: ["medium", "articles"] },
  { test: (h) => h.includes("twitter.com") || h === "x.com", tags: ["social", "microblog"] },
  { test: (h) => h.includes("reddit.com"), tags: ["reddit", "community"] },
  { test: (h) => h.includes("notion.so"), tags: ["notion", "workspace"] },
  { test: (h) => h.includes("figma.com"), tags: ["figma", "design-tool"] },
  { test: (h) => h.includes("wikipedia.org"), tags: ["wikipedia", "encyclopedia"] },
];

function hostDerivedTags(url: string): string[] {
  const host = getHostnameForTags(url);
  const tags: string[] = [];
  for (const row of KNOWN_HOST_ALIASES) {
    if (row.test(host)) {
      tags.push(...row.tags);
      break;
    }
  }
  const parts = host.split(".").filter((p) => p && p !== "www");
  if (parts.length >= 2) {
    const sld = parts[parts.length - 2];
    const slug = slugTag(sld);
    if (slug.length >= 2) tags.push(slug);
  } else if (parts[0]) {
    const slug = slugTag(parts[0]);
    if (slug.length >= 2) tags.push(slug);
  }
  return Array.from(new Set(tags));
}

function tldHintTag(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith(".edu")) return "academic";
    if (host.endsWith(".gov")) return "government";
    if (host.endsWith(".dev")) return "dev-domain";
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * 每条书签强制恰好 3 个 tag：优先 candidates，再 URL 路径/主机/描述，且避免与标题显著词重复。
 */
export function ensureExactlyThreeTags(input: {
  url: string;
  title: string;
  description?: string;
  /** 已排序的偏好顺序（如规则命中、AI 输出） */
  candidates: string[];
  /** 禁止使用的品牌/站点名 slug（与网站名称一致） */
  brandBlocklist?: Set<string>;
}): string[] {
  const brandBlock = input.brandBlocklist ?? buildBrandSlugBlocklist(input.url);
  const titleBlock = significantTitleTokens(input.title);
  const descTokens = tokensFromDescription(input.description, titleBlock);

  const rawPool: string[] = [];
  for (const c of input.candidates) {
    const t = slugTag(c);
    if (t) rawPool.push(t);
  }
  rawPool.push(...pathSegmentTags(input.url));
  rawPool.push(...hostDerivedTags(input.url));
  rawPool.push(...descTokens);

  const tld = tldHintTag(input.url);
  if (tld) rawPool.push(tld);

  const seen = new Set<string>();
  const picked: string[] = [];

  const ok = (tag: string) => {
    if (!isUsefulTag(tag, brandBlock)) return false;
    if (titleBlock.has(tag)) return false;
    return true;
  };

  for (const tag of rawPool) {
    if (picked.length >= 3) break;
    if (!ok(tag)) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    picked.push(tag);
  }

  const fallbacks = [
    "needs-review",
    "low-confidence",
    "manual-tag",
  ];
  let fi = 0;
  while (picked.length < 3 && fi < 80) {
    fi += 1;
    const base = fallbacks[(fi - 1) % fallbacks.length]!;
    const tag = slugTag(`${base}-${fi}`);
    if (!seen.has(tag)) {
      seen.add(tag);
      picked.push(tag);
    }
  }

  return picked.slice(0, 3);
}

export function withExactlyThreeTags(metadata: BookmarkMetadata): BookmarkMetadata {
  const tags = ensureExactlyThreeTags({
    url: metadata.url,
    title: metadata.title,
    description: metadata.description,
    candidates: metadata.tags ?? [],
    brandBlocklist: buildBrandSlugBlocklist(metadata.url),
  });
  const prev = metadata.tags ?? [];
  if (prev.length === 3 && tags[0] === prev[0] && tags[1] === prev[1] && tags[2] === prev[2]) {
    return metadata;
  }
  return { ...metadata, tags };
}
