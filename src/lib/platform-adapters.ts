import type { HoardlyCardType } from "../types/hoardly";

// ─── Platform metadata ───────────────────────────────────────────────────────

export type ParseFailReason =
  | "login_wall"
  | "private"
  | "network_error"
  | "unsupported";

export type SocialCaptureMeta = {
  authorHandle?: string;
  authorName?: string;
  parseFailReason?: ParseFailReason;
  platformColor: string;
  platformDisplayName: string;
  subreddit?: string;
};

type PlatformMeta = {
  color: string;
  displayName: string;
  /** Platforms that commonly show login walls */
  loginWallRisk: boolean;
};

const PLATFORM_REGISTRY: Record<HoardlyCardType, PlatformMeta> = {
  web: { color: "#6b7280", displayName: "网页", loginWallRisk: false },
  reddit: { color: "#ff4500", displayName: "Reddit", loginWallRisk: false },
  tweet: { color: "#1d9bf0", displayName: "X", loginWallRisk: true },
  instagram: { color: "#e1306c", displayName: "Instagram", loginWallRisk: true },
  facebook: { color: "#1877f2", displayName: "Facebook", loginWallRisk: true },
  threads: { color: "#000000", displayName: "Threads", loginWallRisk: true },
  linkedin: { color: "#0a66c2", displayName: "LinkedIn", loginWallRisk: true },
  xhs: { color: "#ff2442", displayName: "小红书", loginWallRisk: true },
  douyin: { color: "#010101", displayName: "抖音", loginWallRisk: false },
  youtube: { color: "#ff0000", displayName: "YouTube", loginWallRisk: false },
  tiktok: { color: "#010101", displayName: "TikTok", loginWallRisk: false },
  bilibili: { color: "#00a1d6", displayName: "B站", loginWallRisk: false },
  medium: { color: "#000000", displayName: "Medium", loginWallRisk: false },
  pinterest: { color: "#e60023", displayName: "Pinterest", loginWallRisk: false },
  wechat: { color: "#07c160", displayName: "公众号", loginWallRisk: false },
  video: { color: "#ef4444", displayName: "视频", loginWallRisk: false },
  image: { color: "#8b5cf6", displayName: "图片", loginWallRisk: false },
  note: { color: "#f59e0b", displayName: "笔记", loginWallRisk: false },
  pdf: { color: "#dc2626", displayName: "PDF", loginWallRisk: false },
  doc: { color: "#3b82f6", displayName: "文档", loginWallRisk: false },
  voice_note: { color: "#14b8a6", displayName: "语音", loginWallRisk: false },
};

export function getPlatformMeta(type: HoardlyCardType): PlatformMeta {
  return PLATFORM_REGISTRY[type] ?? PLATFORM_REGISTRY.web;
}

export function getPlatformColor(type: HoardlyCardType): string {
  return getPlatformMeta(type).color;
}

export function getPlatformDisplayName(type: HoardlyCardType): string {
  return getPlatformMeta(type).displayName;
}

export function isLoginWallRisk(type: HoardlyCardType): boolean {
  return getPlatformMeta(type).loginWallRisk;
}

// ─── Social metadata extraction ──────────────────────────────────────────────

/**
 * Extracts social-specific metadata (author handle, subreddit, etc.) from a
 * URL based on the already-detected card type. Pure function, no side effects.
 */
export function extractSocialMeta(
  url: string,
  type: HoardlyCardType,
): Pick<SocialCaptureMeta, "authorHandle" | "subreddit"> {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    switch (type) {
      case "reddit": {
        // /r/subreddit or /u/user
        const sub = path.match(/\/r\/([^/]+)/);
        const user = path.match(/\/u(?:ser)?\/([^/]+)/);
        return {
          subreddit: sub ? `r/${sub[1]}` : undefined,
          authorHandle: user ? `u/${user[1]}` : undefined,
        };
      }

      case "tweet": {
        // /username/status/... or just /username
        const match = path.match(/^\/([A-Za-z0-9_]{1,15})/);
        // Skip reserved paths
        const RESERVED = new Set(["home", "explore", "notifications", "messages", "i", "settings"]);
        if (match && !RESERVED.has(match[1].toLowerCase())) {
          return { authorHandle: `@${match[1]}` };
        }
        return {};
      }

      case "instagram": {
        // /username/ or /p/... (post pages don't have username in path)
        const match = path.match(/^\/([^/?p][^/?]*)/);
        return match ? { authorHandle: `@${match[1]}` } : {};
      }

      case "threads": {
        // /@username or /username
        const match = path.match(/^\/@?([^/?]+)/);
        return match ? { authorHandle: `@${match[1]}` } : {};
      }

      case "linkedin": {
        const inMatch = path.match(/\/in\/([^/?]+)/);
        const companyMatch = path.match(/\/company\/([^/?]+)/);
        const handle = inMatch?.[1] ?? companyMatch?.[1];
        return handle ? { authorHandle: handle } : {};
      }

      case "youtube": {
        // /@channelname or /channel/UCxxx or /user/name
        const atMatch = path.match(/\/@([^/?]+)/);
        if (atMatch) return { authorHandle: `@${atMatch[1]}` };
        const userMatch = path.match(/\/user\/([^/?]+)/);
        return userMatch ? { authorHandle: `@${userMatch[1]}` } : {};
      }

      case "bilibili": {
        // space.bilibili.com/uid
        if (parsed.hostname.includes("space.bilibili.com")) {
          const match = path.match(/^\/(\d+)/);
          return match ? { authorHandle: `UID:${match[1]}` } : {};
        }
        return {};
      }

      case "xhs": {
        // xiaohongshu.com/user/profile/uid
        const match = path.match(/\/user\/profile\/([^/?]+)/);
        return match ? { authorHandle: match[1] } : {};
      }

      case "tiktok": {
        // @username
        const match = path.match(/^\/@([^/?]+)/);
        return match ? { authorHandle: `@${match[1]}` } : {};
      }

      default:
        return {};
    }
  } catch {
    return {};
  }
}

/**
 * Returns a one-line display hint shown on the card meta row.
 * Priority: subreddit > authorHandle > nothing
 */
export function socialMetaLine(card: {
  authorHandle?: string;
  authorName?: string;
  subreddit?: string;
}): string | undefined {
  if (card.subreddit) return card.subreddit;
  if (card.authorHandle) return card.authorHandle;
  if (card.authorName) return card.authorName;
  return undefined;
}

// ─── Parse failure helpers ───────────────────────────────────────────────────

export const PARSE_FAIL_LABELS: Record<ParseFailReason, string> = {
  login_wall: "需要登录",
  private: "私密内容",
  network_error: "网络错误",
  unsupported: "暂不支持",
};

export const PARSE_FAIL_HINTS: Record<ParseFailReason, string> = {
  login_wall: "登录墙阻止了解析。可截图保存，或手动补充标题和笔记。",
  private: "该内容设置为私密，无法自动获取。请手动添加笔记。",
  network_error: "网络请求失败，请重试。若持续失败请检查网络设置。",
  unsupported: "此平台暂不支持自动解析，已保存链接。",
};
