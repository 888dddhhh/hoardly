export type HoardlyLocale =
  | "en"
  | "zh-CN"
  | "zh-TW"
  | "ja"
  | "es"
  | "fr"
  | "de"
  | "ko"
  | "pt"
  | "ar";

export type HoardlyCardType =
  | "web"
  | "tweet"
  | "reddit"
  | "instagram"
  | "facebook"
  | "threads"
  | "linkedin"
  | "xhs"
  | "douyin"
  | "youtube"
  | "tiktok"
  | "bilibili"
  | "medium"
  | "pinterest"
  | "wechat"
  | "video"
  | "image"
  | "note"
  | "pdf"
  | "doc"
  | "voice_note";

export type HoardlyParseStatus = "pending" | "ready" | "failed" | "invalid";
export type HoardlyStorageLocation = "cloud" | "local" | "hybrid";
export type HoardlyTagOrigin = "ai" | "user" | "project" | "system";
export type HoardlyTagDimension = "topic" | "entity" | "method" | "useCase" | "domain";
export type HoardlyProjectStatus = "active" | "archived" | "deleted";

export type LocalizedText = Partial<Record<HoardlyLocale, string>>;

export interface HoardlyTag {
  id: string;
  slug: string;
  labels: LocalizedText;
  origin: HoardlyTagOrigin;
  /** Which tagging dimension this tag belongs to (AI-assigned) */
  dimension?: HoardlyTagDimension;
  usageCount: number;
}

/** Raw LLM output schema for the multi-dimension tagger */
export interface TagGenerationResult {
  topic: string[];
  entity: string[];
  method: string[];
  useCase: string[];
  domain: string[];
  newLabels: Record<string, { en: string; "zh-CN": string }>;
}

/** Dimension metadata for UI display */
export const TAG_DIMENSION_LABELS: Record<HoardlyTagDimension, { en: string; zh: string }> = {
  topic: { en: "Core Topics", zh: "核心主题" },
  entity: { en: "Key Entities", zh: "关键实体" },
  method: { en: "Methods & Techniques", zh: "方法技术" },
  useCase: { en: "Use Cases", zh: "用途场景" },
  domain: { en: "Domains", zh: "所属领域" },
};

/** Display priority: lower = show first in card list chips */
export const TAG_DIMENSION_PRIORITY: Record<HoardlyTagDimension, number> = {
  topic: 0,
  entity: 1,
  method: 2,
  useCase: 3,
  domain: 4,
};

export interface HoardlyProject {
  id: string;
  name: string;
  slug: string;
  color: string;
  status: HoardlyProjectStatus;
  description?: string;
  cardIds: string[];
}

export interface HoardlyHighlight {
  id: string;
  quoteText: string;
  noteText?: string;
  color: "yellow";
  createdAt: string;
}

export interface HoardlyThreadPost {
  id: string;
  author: string;
  authorHandle?: string;
  text: string;
  upvotes?: number;
  depth: number;
}

export interface HoardlyThreadSnapshot {
  capturedAt: string;
  totalPosts: number;
  posts: HoardlyThreadPost[];
}

export type HoardlyParseFailReason =
  | "login_wall"
  | "private"
  | "network_error"
  | "unsupported";

/**
 * 3 种添加模式：
 *   bookmark — 只存链接 + 元数据（最轻量）
 *   capture  — 抓取完整正文转 Markdown + 下载内嵌媒体（永久私有副本）
 *   upload   — 用户自己上传的图片/视频/PDF/文字笔记
 */
export type HoardlyCaptureMode = "bookmark" | "capture" | "upload";

/**
 * 附件：采集下载的媒体 或 用户上传的文件，存储在 R2 对象存储
 */
export interface HoardlyAttachment {
  id: string;
  /** 原始文件名或来源 URL */
  originalName: string;
  /** MIME 类型 */
  mimeType: string;
  /** 文件大小 (bytes) */
  sizeBytes: number;
  /** R2 对象存储 key（生产环境） */
  storageKey?: string;
  /** 可访问的 CDN URL 或本地 blob URL */
  url: string;
  /** image / video / audio / pdf / other */
  mediaType: "image" | "video" | "audio" | "pdf" | "other";
  /** 图片/视频的宽高 */
  width?: number;
  height?: number;
  createdAt: string;
}

export interface HoardlyCard {
  id: string;
  type: HoardlyCardType;
  url?: string;
  titleOriginal: string;
  titleI18n: LocalizedText;
  thumbnailUrl?: string;
  summary: LocalizedText;
  tagIds: string[];
  sourcePlatform: string;
  /** bookmark = 只存链接; capture = 抓正文; upload = 用户上传 */
  captureMode: HoardlyCaptureMode;
  /**
   * 采集/上传的正文内容，统一 Markdown 格式。
   * bookmark 模式下通常为空；capture 模式下为抓取转换的正文；
   * upload + note 类型下为用户输入的笔记。
   */
  contentMarkdown?: string;
  /** 关联的附件（采集下载的媒体 / 用户上传的文件） */
  attachments: HoardlyAttachment[];
  /** Display name of the author (e.g. "John Doe") */
  authorName?: string;
  /** Platform handle (e.g. "@user", "u/user", "r/subreddit" for Reddit posts) */
  authorHandle?: string;
  /** Reddit subreddit (e.g. "r/MachineLearning") — separate from authorHandle */
  subreddit?: string;
  /** Reason why parsing failed — used to show targeted guidance to the user */
  parseFailReason?: HoardlyParseFailReason;
  projectIds: string[];
  parseStatus: HoardlyParseStatus;
  storageLocation: HoardlyStorageLocation;
  starred: boolean;
  deletedAt?: string;
  createdAt: string;
  lastOpenedAt?: string;
  highlights: HoardlyHighlight[];
  /** 用户个人笔记（不同于 contentMarkdown，这是用户写的批注） */
  noteMarkdown?: string;
  /** Thread snapshot for social cards (Reddit threads, Twitter/X threads) */
  threadSnapshot?: HoardlyThreadSnapshot;
  /** Estimated word count of the full article/post body (for read-time display) */
  wordCount?: number;
}

export interface HoardlyMaintenanceIssue {
  id: string;
  type: "dead_link" | "tag_merge" | "import_failed";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  cardId?: string;
}

export type HoardlySortMode = "recent" | "lastViewed" | "smart";
export type HoardlyViewMode = "grid" | "list";
