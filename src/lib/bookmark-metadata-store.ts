import type { BookmarkMetadata } from "../types/bookmark";

export const BOOKMARK_METADATA_STORAGE_KEY = "hoardly:bookmark-metadata";

export type BookmarkMetadataMap = Record<string, BookmarkMetadata>;

export async function getBookmarkMetadataMap() {
  const stored = await chrome.storage.local.get(BOOKMARK_METADATA_STORAGE_KEY);
  return (stored[BOOKMARK_METADATA_STORAGE_KEY] ?? {}) as BookmarkMetadataMap;
}

export async function getBookmarkMetadata(bookmarkId: string) {
  const metadata = await getBookmarkMetadataMap();
  return metadata[bookmarkId] ?? null;
}

export async function saveBookmarkMetadata(metadata: BookmarkMetadata) {
  const current = await getBookmarkMetadataMap();
  await chrome.storage.local.set({
    [BOOKMARK_METADATA_STORAGE_KEY]: {
      ...current,
      [metadata.bookmarkId]: metadata,
    },
  });
}

export async function saveBookmarkMetadataBatch(metadataItems: BookmarkMetadata[]) {
  if (metadataItems.length === 0) return;

  const current = await getBookmarkMetadataMap();
  const next = { ...current };
  metadataItems.forEach((metadata) => {
    next[metadata.bookmarkId] = metadata;
  });

  await chrome.storage.local.set({
    [BOOKMARK_METADATA_STORAGE_KEY]: next,
  });
}

export async function removeBookmarkMetadata(bookmarkId: string) {
  const current = await getBookmarkMetadataMap();
  const next = { ...current };
  delete next[bookmarkId];
  await chrome.storage.local.set({
    [BOOKMARK_METADATA_STORAGE_KEY]: next,
  });
}

export async function listBookmarkMetadata() {
  return Object.values(await getBookmarkMetadataMap());
}
