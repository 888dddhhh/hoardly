import React, { useEffect, useMemo, useState } from "react";
import { Bookmark as BookmarkIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { getHostname } from "../lib/bookmark-service";
import { Icon } from "./ui/icon";

/**
 * 缩略图四级瀑布策略：
 *   1. OG Image / Twitter Card（由采集阶段提取并存入 card.thumbnailUrl）
 *   2. 截图服务（thum.io / wp.com/mshots / microlink）
 *   3. 高分辨率 Favicon（Google / DuckDuckGo）
 *   4. 渐变占位 + 首字母
 *
 * 用法：
 *   <SiteBookmarkThumbnail url="..." ogImageUrl={card.thumbnailUrl} variant="card" />
 */

function buildScreenshotCandidates(url: string): string[] {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return [];
  }
  if (!host) return [];

  const encoded = encodeURIComponent(url);
  return [
    // thum.io — 高分辨率
    `https://image.thum.io/get/width/1280/crop/720/noanimate/${encoded}`,
    // WordPress mshots
    `https://s0.wp.com/mshots/v1/${encoded}?w=900`,
    // thum.io — 备选小图
    `https://image.thum.io/get/width/640/crop/400/noanimate/${encoded}`,
    // microlink 免费截图
    `https://api.microlink.io/?url=${encoded}&screenshot=true&meta=false&embed=screenshot.url`,
  ];
}

function buildFaviconCandidates(url: string): string[] {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return [];
  }
  if (!host) return [];
  return [
    `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host)}`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${host}&size=128`,
  ];
}

type SiteBookmarkThumbnailProps = {
  url: string;
  ogImageUrl?: string;
  className?: string;
  /** card：大卡缩略图；tile：小格 favicon；full：抽屉大图 */
  variant?: "card" | "tile" | "full";
};

export function SiteBookmarkThumbnail({
  url,
  ogImageUrl,
  className,
  variant = "card",
}: SiteBookmarkThumbnailProps) {
  const candidates = useMemo(() => {
    const list: string[] = [];

    // Level 1: OG Image（如果存在且不是 Google favicon 链接）
    if (ogImageUrl && !ogImageUrl.includes("s2/favicons")) {
      list.push(ogImageUrl);
    }

    // Level 2: 截图服务（card / full 模式使用）
    if (variant !== "tile") {
      list.push(...buildScreenshotCandidates(url));
    }

    // Level 3: 高分辨率 Favicon
    list.push(...buildFaviconCandidates(url));

    return list;
  }, [url, ogImageUrl, variant]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [url, ogImageUrl, variant]);

  const hostname = getHostname(url);
  const exhausted = candidates.length === 0 || index >= candidates.length;
  const src = exhausted ? undefined : candidates[index];

  // Level 4: 渐变占位 + 首字母
  if (exhausted) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-muted via-muted/80 to-background text-center",
          variant === "card" ? "h-full w-full" : variant === "full" ? "aspect-video w-full" : "size-10 shrink-0 rounded-xl",
          className,
        )}
      >
        {variant !== "tile" ? (
          <>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-background/60 text-lg font-bold uppercase text-muted-foreground">
              {hostname.slice(0, 1) || <Icon icon={BookmarkIcon} className="size-5" />}
            </div>
            <span className="line-clamp-1 max-w-[80%] px-2 text-[11px] font-medium text-muted-foreground">{hostname}</span>
          </>
        ) : (
          <div className="flex size-6 items-center justify-center rounded-md bg-background/60 text-[10px] font-semibold uppercase text-muted-foreground">
            {hostname.slice(0, 1) || <Icon icon={BookmarkIcon} className="size-3.5" />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        variant === "card" ? "h-full w-full" : variant === "full" ? "aspect-video w-full" : "flex size-10 shrink-0 items-center justify-center rounded-xl p-1.5",
        className,
      )}
    >
      <img
        alt=""
        className={cn(
          variant === "tile"
            ? "size-full object-contain"
            : "h-full w-full object-cover object-top",
        )}
        loading="lazy"
        referrerPolicy="no-referrer"
        src={src}
        onError={() => setIndex((i) => i + 1)}
      />
      {variant === "card" || variant === "full" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/30 to-transparent" />
      ) : null}
    </div>
  );
}
