import type { AdminDashboardMetrics } from "../types/admin";
import type { UserAccount } from "../types/account";
import type { BookmarkMetadata } from "../types/bookmark";

type TagSeed = {
  tag: string;
  count: number;
  titlePrefix: string;
  descriptionPrefix: string;
  folderSuggestion: string;
  sourcePlatform: string;
  status: BookmarkMetadata["status"];
  invalidReason?: string;
};

const tagSeeds: TagSeed[] = [
  {
    tag: "ai",
    count: 15,
    titlePrefix: "AI Workflow Toolkit",
    descriptionPrefix: "Curated prompts and workflow references",
    folderSuggestion: "AI Tools",
    sourcePlatform: "ai-workflow.example.com",
    status: "active",
  },
  {
    tag: "agents",
    count: 14,
    titlePrefix: "Agent Automation Case",
    descriptionPrefix: "Agent orchestration examples and benchmarks",
    folderSuggestion: "Automation",
    sourcePlatform: "agent-cases.example.com",
    status: "active",
  },
  {
    tag: "finance",
    count: 13,
    titlePrefix: "Finance Research Note",
    descriptionPrefix: "Market trend snapshots and analysis notes",
    folderSuggestion: "Finance",
    sourcePlatform: "finance-notes.example.com",
    status: "active",
  },
  {
    tag: "charts",
    count: 12,
    titlePrefix: "Chart Pattern Library",
    descriptionPrefix: "Visual chart patterns for fast comparison",
    folderSuggestion: "Finance",
    sourcePlatform: "chart-library.example.com",
    status: "active",
  },
  {
    tag: "research",
    count: 11,
    titlePrefix: "Research Digest",
    descriptionPrefix: "Deep-dive reading list and summary links",
    folderSuggestion: "Research",
    sourcePlatform: "research-digest.example.com",
    status: "active",
  },
  {
    tag: "失效",
    count: 10,
    titlePrefix: "Archived Link",
    descriptionPrefix: "Previously saved page pending link recovery",
    folderSuggestion: "Review",
    sourcePlatform: "archived-links.example.com",
    status: "invalid",
    invalidReason: "HTTP 404",
  },
];

export const mockBookmarks: BookmarkMetadata[] = [
  ...tagSeeds.flatMap((seed, seedIndex) =>
    Array.from({ length: seed.count }, (_, rowIndex) => {
      const serial = rowIndex + 1;
      const baseBookmark: BookmarkMetadata = {
        bookmarkId: `${seedIndex + 1}-${serial}`,
        url: `https://${seed.tag}-${serial}.hoardly-demo.app`,
        title: `${seed.titlePrefix} ${serial}`,
        description: `${seed.descriptionPrefix} (${serial})`,
        tags: [seed.tag, "hoardly-demo", `${seed.tag}-corpus`],
        folderSuggestion: seed.folderSuggestion,
        sourcePlatform: seed.sourcePlatform,
        status: seed.status,
        confidence: Number((0.82 + (rowIndex % 5) * 0.03).toFixed(2)),
      };

      if (seed.status === "invalid") {
        baseBookmark.invalidReason = seed.invalidReason ?? "Unreachable";
        baseBookmark.lastInvalidCheckedAt = "2026-04-26T04:00:00.000Z";
      } else {
        baseBookmark.lastAiReviewedAt = "2026-04-26T03:00:00.000Z";
      }

      return baseBookmark;
    }),
  ),
];

export const mockAccount: UserAccount = {
  id: "user_google_001",
  googleEmail: "avril@gmail.com",
  displayName: "Avril Lavigne",
  planId: "free",
  bookmarkCount: mockBookmarks.length,
  lifetimeUnlocked: false,
  status: "active",
};

export const mockAdminMetrics: AdminDashboardMetrics = {
  dailyRevenueUsd: 55,
  monthlySubscribers: 11,
  lifetimeUsers: 2,
  activeUsers: 84,
  aiCallsToday: 326,
  invalidLinksDetected: 9,
  errorRate: 0.02,
};
