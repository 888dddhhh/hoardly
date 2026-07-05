import type { AiBookmarkAnalysis } from "../types/ai";
import type { BookmarkMetadata } from "../types/bookmark";
import { ensureExactlyThreeTags, getHostnameForTags } from "./bookmark-tags";

type BookmarkInput = {
  bookmarkId: string;
  title: string;
  url: string;
};

const TAG_RULES: Array<{
  folder: string;
  keywords: string[];
  /** 与 URL 规则命中时注入的候选 tag（非标题）；ensureExactlyThreeTags 会从中取至多 3 个并补全 */
  tags: string[];
}> = [
  {
    folder: "AI Tools",
    keywords: ["ai", "agent", "llm", "openai", "model", "prompt", "deepseek", "gemini"],
    tags: ["ai", "llm-tools", "automation"],
  },
  {
    folder: "Finance",
    keywords: ["finance", "trading", "market", "chart", "crypto", "stock", "invest"],
    tags: ["finance", "markets", "data-viz"],
  },
  {
    folder: "Research",
    keywords: ["research", "paper", "study", "docs", "documentation", "archive"],
    tags: ["research", "documentation", "reading"],
  },
  {
    folder: "Design",
    keywords: ["design", "ui", "ux", "figma", "component", "template"],
    tags: ["design", "product-ui", "visual"],
  },
  {
    folder: "Developer",
    keywords: ["github", "npm", "api", "sdk", "typescript", "react", "chrome", "extension"],
    tags: ["dev", "code-host", "engineering"],
  },
];

export function analyzeBookmarkLocally({ bookmarkId, title, url }: BookmarkInput): BookmarkMetadata {
  const analysis = buildLocalAnalysis(title, url);
  const now = new Date().toISOString();
  const resolvedTitle = title || getHostname(url);

  return {
    bookmarkId,
    confidence: analysis.confidence,
    description: analysis.description,
    folderSuggestion: analysis.folderSuggestion,
    lastAiReviewedAt: now,
    sourcePlatform: getHostname(url),
    status: "active",
    tags: ensureExactlyThreeTags({
      url,
      title: resolvedTitle,
      description: analysis.description,
      candidates: analysis.tagCandidates,
    }),
    title: resolvedTitle,
    url,
  };
}

function buildLocalAnalysis(title: string, url: string): AiBookmarkAnalysis & { tagCandidates: string[] } {
  /** 仅用 URL / 主机匹配规则，不把标题拼进匹配文本，避免 tag 复述标题 */
  const textForRules = `${url} ${getHostnameForTags(url)}`.toLowerCase();
  const matchedRules = TAG_RULES.filter((rule) =>
    rule.keywords.some((keyword) => textForRules.includes(keyword)),
  );
  const tagCandidates = Array.from(new Set(matchedRules.flatMap((rule) => rule.tags)));

  const folderSuggestion = matchedRules[0]?.folder ?? "Bookmarks";
  const readableTitle = title || getHostname(url);

  return {
    confidence: matchedRules.length > 0 ? 0.82 : 0.58,
    description: `From ${getHostname(url)} — topic cues from URL and path (not the page title). Local rules suggest folder "${folderSuggestion}".`,
    folderSuggestion,
    tags: [],
    tagCandidates,
  };
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}
