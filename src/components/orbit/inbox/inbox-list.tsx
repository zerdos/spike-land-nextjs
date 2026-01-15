"use client";

import { useDocumentVisibility } from "@/hooks/useDocumentVisibility";
import type { InboxItem as InboxItemType } from "@prisma/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FilterFormValues } from "./inbox-filters";
import { InboxItem } from "./inbox-item";

interface PageData {
  items: InboxItemType[];
  hasNext: boolean;
  page: number;
}

async function fetchInboxItems(
  workspaceSlug: string,
  filters: FilterFormValues,
  page: number,
): Promise<PageData> {
  const query = new URLSearchParams(
    { ...filters, page: page.toString() } as Record<string, string>,
  );
  const res = await fetch(`/api/orbit/${workspaceSlug}/inbox?${query}`);
  if (!res.ok) {
    let responseBody: string | undefined;
    try {
      responseBody = await res.text();
    } catch {
      // Ignore errors while reading the response body; we still want to throw the original error.
    }
    const baseMessage = `Failed to fetch inbox items: ${res.status} ${res.statusText}`;
    const detailedMessage = responseBody ? `${baseMessage} - ${responseBody}` : baseMessage;
    throw new Error(detailedMessage);
  }
  return res.json();
}

interface InboxListProps {
  onItemSelected: (item: InboxItemType) => void;
  filters: FilterFormValues;
}

export function InboxList({ onItemSelected, filters }: InboxListProps) {
  const params = useParams();
  const workspaceSlug = params["workspaceSlug"] as string;
  const [selectedItem, setSelectedItem] = useState<InboxItemType | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const isVisible = useDocumentVisibility();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["inboxItems", workspaceSlug, filters],
    queryFn: ({ pageParam }) => fetchInboxItems(workspaceSlug, filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PageData) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    refetchInterval: isVisible ? 30000 : false,
  });

  const allItems = data ? data.pages.flatMap((page: PageData) => page.items) : [];

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allItems.length + 1 : allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem && lastItem.index >= allItems.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allItems.length,
    isFetchingNextPage,
    rowVirtualizer,
  ]);

  const handleItemClick = (item: InboxItemType) => {
    setSelectedItem(item);
    onItemSelected(item);
  };

  return (
    <div ref={parentRef} className="h-full max-h-[calc(100vh-200px)] overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > allItems.length - 1;
          const item = allItems[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {isLoaderRow
                ? (
                  hasNextPage ? "Loading more..." : "Nothing more to load"
                )
                : item && (
                  <InboxItem
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => handleItemClick(item)}
                  />
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
