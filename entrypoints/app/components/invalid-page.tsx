import {
  AlertTriangle as DangerIcon,
  Folder as FolderIcon,
  Trash2 as Delete02Icon,
  Search as Search01Icon,
  RotateCw as RotateClockwiseIcon,
  Tag as TagIcon,
} from "lucide-react";
import { Button } from "../../../src/components/ui/button";
import { Card, CardContent, CardHeader } from "../../../src/components/ui/card";
import { Icon } from "../../../src/components/ui/icon";
import { Input } from "../../../src/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../../src/components/ui/tabs";
import type { InvalidBookmarkRecord } from "../../../src/lib/invalid-links";
import { formatDateTime } from "./shared";

export function InvalidTagsPage({
  query,
  setQuery,
  items,
  onCheck,
  onDelete,
  onRestore,
}: {
  query: string;
  setQuery: (value: string) => void;
  items: InvalidBookmarkRecord[];
  onCheck: () => Promise<void>;
  onDelete: (bookmarkId: string) => Promise<void>;
  onRestore: (bookmarkId: string) => Promise<void>;
}) {
  return (
    <div className="flex min-h-0">
      <aside className="hidden w-[223px] shrink-0 border-r border-border px-4 py-6 lg:block">
        <Tabs defaultValue="tag">
          <TabsList className="mb-5 w-full">
            <TabsTrigger value="tag" className="flex-1">
              <Icon icon={TagIcon} className="size-3.5" />
              Tag
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1">
              <Icon icon={FolderIcon} className="size-3.5" />
              Group
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative mb-5">
          <Icon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-9 pl-9 text-xs"
            placeholder="Search..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          {items.slice(0, 14).map((item) => (
            <button
              key={item.bookmarkId}
              type="button"
              className="flex h-9 w-full items-center gap-2 rounded-xl px-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Icon icon={DangerIcon} className="size-4 shrink-0" />
              <span className="truncate">{item.title || item.reason}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-8 px-4">
        <Card className="rounded-[24px] py-0">
          <CardContent className="p-4">
            <div className="flex min-h-[118px] flex-col justify-between gap-4">
              <Input
                className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                placeholder="搜索失效标签"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <Button variant="secondary" size="sm" onClick={() => void onCheck()}>
                  <Icon icon={RotateClockwiseIcon} className="size-4" />
                  Check now
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (!window.confirm("Delete every invalid bookmark shown here?")) return;
                    void Promise.all(items.map((item) => onDelete(item.bookmarkId)));
                  }}
                >
                  <Icon icon={Delete02Icon} className="size-4" />
                  Delete all
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {items.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No invalid bookmarks waiting for review.
            </CardContent>
          </Card>
        ) : null}
        {items.map((item) => (
          <Card key={item.bookmarkId} className="h-[390px] overflow-hidden py-0">
            <CardHeader className="px-5 pt-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="mb-3 inline-flex rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-xs text-destructive">
                    {item.reason}
                  </p>
                  <h3 className="line-clamp-2 text-base font-medium">{item.title}</h3>
                </div>
                <Icon icon={DangerIcon} className="size-5 text-destructive" />
              </div>
              <p className="break-all text-xs text-muted-foreground">{item.url}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-muted p-3 text-sm">
                <p className="text-muted-foreground">Original folder</p>
                <p className="font-medium">{item.originalFolder || "Unknown folder"}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Checked at {formatDateTime(item.checkedAt)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => void onRestore(item.bookmarkId)}>
                  <Icon icon={RotateClockwiseIcon} className="mr-2 size-4" />
                  Restore
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!window.confirm(`Delete "${item.title}" from Chrome bookmarks?`)) {
                      return;
                    }
                    void onDelete(item.bookmarkId);
                  }}
                >
                  <Icon icon={Delete02Icon} className="mr-2 size-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </div>
  );
}
