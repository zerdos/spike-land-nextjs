"use client";

import { InboxAssignDialog } from "@/components/orbit/inbox/inbox-assign-dialog";
import type { FilterFormValues } from "@/components/orbit/inbox/inbox-filters";
import { InboxFilters } from "@/components/orbit/inbox/inbox-filters";
import { InboxList } from "@/components/orbit/inbox/inbox-list";
import { InboxReplyPanel } from "@/components/orbit/inbox/inbox-reply-panel";
import type { InboxItem } from "@prisma/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";

// Mock team members for now
const teamMembers = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
  { id: "3", name: "Charlie" },
];

export default function InboxPage() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const [filters, setFilters] = useState<FilterFormValues>({});
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);

  const handleFilterChange = (newFilters: FilterFormValues) => {
    setFilters(newFilters);
  };

  const handleAssign = () => {
    // TODO: Implement inbox list refetch after assignment
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen">
        <div className="w-1/3 border-r">
          <div className="p-4 border-b">
            <InboxFilters onFilterChange={handleFilterChange} teamMembers={teamMembers} />
          </div>
          <InboxList filters={filters} onItemSelected={setSelectedItem} />
        </div>
        <div className="w-2/3 p-4">
          {selectedItem
            ? (
              <>
                <InboxReplyPanel itemId={selectedItem.id} />
                <div className="mt-4">
                  <InboxAssignDialog
                    itemId={selectedItem.id}
                    teamMembers={teamMembers}
                    onAssign={handleAssign}
                  />
                </div>
              </>
            )
            : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select an item to view
              </div>
            )}
        </div>
      </div>
    </QueryClientProvider>
  );
}
