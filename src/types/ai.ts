import type { BookmarkMetadata } from "./bookmark";

export interface AiBookmarkAnalysis {
  description: string;
  tags: string[];
  folderSuggestion: string;
  sourcePlatform?: string;
  confidence: number;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AiSearchAction {
  id: string;
  label: string;
  type: "add_tag" | "move_folder" | "reanalyze" | "mark_invalid";
  targetBookmarkIds: string[];
}

export interface AiSearchResponse {
  answer: string;
  results: BookmarkMetadata[];
  actions: AiSearchAction[];
}
