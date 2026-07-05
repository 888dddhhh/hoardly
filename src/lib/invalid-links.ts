export const INVALID_LINKS_STORAGE_KEY = "hoardly:invalid-links";

export type InvalidBookmarkRecord = {
  bookmarkId: string;
  checkedAt: string;
  originalFolder?: string;
  reason: string;
  title: string;
  url: string;
};

export async function getStoredInvalidLinks() {
  const stored = await chrome.storage.local.get(INVALID_LINKS_STORAGE_KEY);
  return (stored[INVALID_LINKS_STORAGE_KEY] ?? []) as InvalidBookmarkRecord[];
}

export async function saveStoredInvalidLinks(records: InvalidBookmarkRecord[]) {
  await chrome.storage.local.set({
    [INVALID_LINKS_STORAGE_KEY]: records,
  });
}

export async function removeStoredInvalidLink(bookmarkId: string) {
  const records = await getStoredInvalidLinks();
  await saveStoredInvalidLinks(records.filter((record) => record.bookmarkId !== bookmarkId));
}
