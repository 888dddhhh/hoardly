const TAG_ORDER_KEY = "hoardly:app:sidebar-tag-order";
const FOLDER_ORDER_KEY = "hoardly:app:sidebar-folder-order";

export function loadSidebarTagOrder(): string[] {
  try {
    const raw = localStorage.getItem(TAG_ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveSidebarTagOrder(order: string[]) {
  localStorage.setItem(TAG_ORDER_KEY, JSON.stringify(order));
}

export function loadSidebarFolderOrder(): string[] {
  try {
    const raw = localStorage.getItem(FOLDER_ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveSidebarFolderOrder(order: string[]) {
  localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(order));
}

/** 保留用户排序，并把新出现的名称追加到末尾 */
export function mergeDiscoveryOrder(order: string[], discovered: string[]): string[] {
  const disc = [...new Set(discovered)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of order) {
    if (disc.includes(n) && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  for (const n of disc.sort((a, b) => a.localeCompare(b))) {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

export function mergeCategoryItems(
  items: Array<{ name: string; count: number }>,
  extras: Array<{ name: string; count: number }>,
) {
  const names = new Set(items.map((item) => item.name));
  return [...items, ...extras.filter((item) => !names.has(item.name))];
}

export function orderItems(items: Array<{ name: string; count: number }>, order: string[]) {
  if (order.length === 0) return items;
  return [...items].sort((a, b) => {
    const aIndex = order.indexOf(a.name);
    const bIndex = order.indexOf(b.name);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export function getUniqueCategoryName(existingNames: string[], baseName: string) {
  const names = new Set(existingNames);
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName}-${index}`)) index += 1;
  return `${baseName}-${index}`;
}
