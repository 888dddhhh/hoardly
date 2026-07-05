import type { HoardlyCard, HoardlyTag } from "../types/hoardly";

/**
 * Layer 1 — Prompt-level blacklist.
 * These words are injected into the LLM system prompt as banned tags.
 */
export const TAG_BLACKLIST = new Set([
  // Chinese generic
  "网页", "文章", "内容", "链接", "网站", "资源", "工具", "平台", "技术", "编程",
  "开发", "学习", "参考", "收藏", "信息", "互联网", "应用", "服务", "产品",
  "笔记", "文档", "帖子", "分享", "推荐", "教程", "在线",
  // English generic
  "webpage", "article", "content", "link", "website", "resource", "tool",
  "technology", "programming", "development", "learning", "reference",
  "information", "internet", "application", "service", "product", "misc",
  "other", "unknown", "topic", "general", "various", "related", "useful",
  "blog", "post", "page", "note", "online", "digital", "software", "data",
  // Platform names (already shown as card type badge)
  "youtube", "reddit", "twitter", "instagram", "facebook", "threads",
  "linkedin", "tiktok", "bilibili", "pinterest", "medium", "wechat",
  "xiaohongshu", "douyin", "x.com",
]);

export const TAG_BLACKLIST_PROMPT_SECTION = `## 禁用标签（以下词语绝对不能作为标签出现）
${[...TAG_BLACKLIST].join(", ")}`;

/**
 * Layer 2 — Post-generation specificity filter.
 * Returns true if the tag should be REJECTED.
 */
export function isTagTooGeneric(
  slug: string,
  allCards: HoardlyCard[],
  existingTags: HoardlyTag[],
): boolean {
  const lower = slug.toLowerCase().trim();

  if (TAG_BLACKLIST.has(lower)) return true;

  if (lower.length < 3) return true;

  // If this tag already exists and is used on >40% of active cards, it's too broad
  const existing = existingTags.find((t) => t.slug === lower);
  if (existing) {
    const activeCards = allCards.filter((c) => !c.deletedAt);
    const usedOn = activeCards.filter((c) => c.tagIds.includes(existing.id)).length;
    if (activeCards.length > 5 && usedOn / activeCards.length > 0.4) return true;
  }

  return false;
}

/**
 * Layer 3 — Convergence: find an existing tag by slug match.
 * Returns the existing tag ID if found, or null if the slug is new.
 */
export function findExistingTagBySlug(
  slug: string,
  existingTags: HoardlyTag[],
): HoardlyTag | undefined {
  const lower = slug.toLowerCase().trim();
  return existingTags.find((t) => t.slug.toLowerCase() === lower);
}

/**
 * Sanitise a single raw slug from LLM output:
 * lowercase, trim, replace spaces/underscores with hyphens, strip non-alnum.
 */
export function sanitizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
