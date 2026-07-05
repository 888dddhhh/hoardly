export type BookmarkStatus = "active" | "invalid" | "pending_review";

export interface BookmarkMetadata {
  bookmarkId: string;
  url: string;
  title: string;
  description?: string;
  tags: string[];
  folderSuggestion?: string;
  thumbnailUrl?: string;
  sourcePlatform?: string;
  status: BookmarkStatus;
  confidence?: number;
  lastAiReviewedAt?: string;
  lastInvalidCheckedAt?: string;
  invalidReason?: string;
}

export interface BookmarkSearchResult extends BookmarkMetadata {
  matchedBy: Array<"title" | "description" | "tag" | "url" | "folder">;
}
