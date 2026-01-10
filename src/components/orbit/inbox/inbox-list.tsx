
'use client';

import { useVirtual } from 'react-virtual';
import { InboxItem as InboxItemType } from '@prisma/client';
import { InboxItem } from './inbox-item';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from 'react-query';
import { useParams } from 'next/navigation';
import type { FilterFormValues } from './inbox-filters';

async function fetchInboxItems(workspaceSlug: string, filters: FilterFormValues, page: number) {
  const query = new URLSearchParams({ ...filters, page: page.toString() } as Record<string, string>);
  const res = await fetch(`/api/orbit/${workspaceSlug}/inbox?${query}`);
  if (!res.ok) {
    throw new Error('Failed to fetch inbox items');
  }
  return res.json();
}

interface InboxListProps {
  onItemSelected: (item: InboxItemType) => void;
  filters: FilterFormValues;
}

export function InboxList({ onItemSelected, filters }: InboxListProps) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const [selectedItem, setSelectedItem] = useState<InboxItemType | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(
    ['inboxItems', workspaceSlug, filters],
    ({ pageParam = 1 }) => fetchInboxItems(workspaceSlug, filters, pageParam),
    {
      getNextPageParam: (lastPage: any) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    }
  );

  const allItems = data ? data.pages.flatMap((page: any) => page.items) : [];

  const rowVirtualizer = useVirtual({
    size: hasNextPage ? allItems.length + 1 : allItems.length,
    parentRef,
    estimateSize: useCallback(() => 100, []),
    overscan: 5,
  });

  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.virtualItems].reverse();
    if (lastItem && lastItem.index >= allItems.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, allItems.length, isFetchingNextPage, rowVirtualizer.virtualItems]);

  const handleItemClick = (item: InboxItemType) => {
    setSelectedItem(item);
    onItemSelected(item);
  }

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${rowVirtualizer.totalSize}px`, width: '100%', position: 'relative' }}>
        {rowVirtualizer.virtualItems.map((virtualRow) => {
          const isLoaderRow = virtualRow.index > allItems.length - 1;
          const item = allItems[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {isLoaderRow ? (
                hasNextPage ? 'Loading more...' : 'Nothing more to load'
              ) : (
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
