import type { BookmarkMetadata, BookmarkSearchResult } from "../types/bookmark";

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "find",
  "in",
  "of",
  "search",
  "the",
  "to",
  "找",
  "找一下",
  "搜索",
  "查找",
  "一下",
  "书签",
  "链接",
  "网页",
]);

export function searchBookmarks(
  bookmarks: BookmarkMetadata[],
  query: string,
): BookmarkSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return bookmarks.map((bookmark) => ({ ...bookmark, matchedBy: [] }));
  }

  const parsedQuery = parseQuery(normalizedQuery);

  return bookmarks
    .map((bookmark) => rankBookmark(bookmark, parsedQuery))
    .filter((result): result is BookmarkSearchResult & { score: number } =>
      Boolean(result),
    )
    .sort((a, b) => b.score - a.score)
    .map(({ score: _score, ...bookmark }) => bookmark);
}

type ParsedQuery = {
  domain?: string;
  folder?: string;
  status?: string;
  tag?: string;
  terms: string[];
};

function parseQuery(query: string): ParsedQuery {
  const parsed: ParsedQuery = { terms: [] };
  const tokens = query.split(/\s+/).filter(Boolean);

  tokens.forEach((token) => {
    const [rawKey, ...rawValue] = token.split(":");
    const value = rawValue.join(":").trim();

    if (value && rawKey === "tag") {
      parsed.tag = value;
      return;
    }

    if (value && (rawKey === "folder" || rawKey === "group")) {
      parsed.folder = value;
      return;
    }

    if (value && (rawKey === "domain" || rawKey === "site")) {
      parsed.domain = value;
      return;
    }

    if (value && rawKey === "status") {
      parsed.status = value;
      return;
    }

    if (!SEARCH_STOP_WORDS.has(token)) {
      parsed.terms.push(token);
    }
  });

  return parsed;
}

function rankBookmark(bookmark: BookmarkMetadata, query: ParsedQuery) {
  const matchedBy = new Set<BookmarkSearchResult["matchedBy"][number]>();
  const tags = bookmark.tags.map((tag) => tag.toLowerCase());
  const title = bookmark.title.toLowerCase();
  const description = bookmark.description?.toLowerCase() ?? "";
  const url = bookmark.url.toLowerCase();
  const hostname = getHostname(bookmark.url).toLowerCase();
  const folder = bookmark.folderSuggestion?.toLowerCase() ?? "";
  let score = 0;

  if (query.tag) {
    if (!tags.some((tag) => tag.includes(query.tag!))) return undefined;
    matchedBy.add("tag");
    score += 70;
  }

  if (query.folder) {
    if (!folder.includes(query.folder)) return undefined;
    matchedBy.add("folder");
    score += 50;
  }

  if (query.domain) {
    if (!hostname.includes(query.domain) && !url.includes(query.domain)) {
      return undefined;
    }
    matchedBy.add("url");
    score += 50;
  }

  if (query.status && bookmark.status !== query.status) return undefined;

  if (query.terms.length === 0) {
    return matchedBy.size > 0 ? withScore(bookmark, matchedBy, score || 1) : undefined;
  }

  query.terms.forEach((term) => {
    if (title === term) {
      matchedBy.add("title");
      score += 90;
      return;
    }

    if (title.includes(term)) {
      matchedBy.add("title");
      score += title.startsWith(term) ? 60 : 45;
      return;
    }

    if (tags.some((tag) => tag === term || tag.includes(term))) {
      matchedBy.add("tag");
      score += 50;
      return;
    }

    if (folder.includes(term)) {
      matchedBy.add("folder");
      score += 35;
      return;
    }

    if (hostname.includes(term) || url.includes(term)) {
      matchedBy.add("url");
      score += 30;
      return;
    }

    if (description.includes(term)) {
      matchedBy.add("description");
      score += 20;
    }
  });

  return score > 0 ? withScore(bookmark, matchedBy, score) : undefined;
}

function withScore(
  bookmark: BookmarkMetadata,
  matchedBy: Set<BookmarkSearchResult["matchedBy"][number]>,
  score: number,
) {
  return {
    ...bookmark,
    matchedBy: Array.from(matchedBy),
    score,
  };
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
