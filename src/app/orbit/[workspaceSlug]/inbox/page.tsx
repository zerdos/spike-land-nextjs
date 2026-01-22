"use client";

import { InboxActionButtons } from "@/components/orbit/inbox/inbox-action-buttons";
import { InboxAssignDialog } from "@/components/orbit/inbox/inbox-assign-dialog";
import type { FilterFormValues } from "@/components/orbit/inbox/inbox-filters";
import { InboxFilters } from "@/components/orbit/inbox/inbox-filters";
import { InboxList } from "@/components/orbit/inbox/inbox-list";
import { InboxReplyPanel } from "@/components/orbit/inbox/inbox-reply-panel";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import type { InboxItem } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function InboxPage() {
  const params = useParams();
  const workspaceSlug = params?.["workspaceSlug"] as string;
  const [filters, setFilters] = useState<FilterFormValues>({});
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const queryClient = useQueryClient();

  const { data: members = [] } = useWorkspaceMembers(workspaceSlug);

  const handleFilterChange = (newFilters: FilterFormValues) => {
    setFilters(newFilters);
  };

  const handleAssign = () => {
    queryClient.invalidateQueries({
      queryKey: ["inboxItems", workspaceSlug],
    });
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
          <InboxFilters
            onFilterChange={handleFilterChange}
            teamMembers={members}
          />
        </div>
        <InboxList filters={filters} onItemSelected={setSelectedItem} />
      </div>
      <div className="w-2/3 p-4">
        {selectedItem
          ? (
            <>
              <div className="flex justify-end mb-4">
                <InboxActionButtons
                  itemId={selectedItem.id}
                  workspaceSlug={workspaceSlug}
                  onActionComplete={() => setSelectedItem(null)}
                />
              </div>
              <InboxReplyPanel itemId={selectedItem.id} />
              <div className="mt-4">
                <InboxAssignDialog
                  itemId={selectedItem.id}
                  teamMembers={members}
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
  );
}
