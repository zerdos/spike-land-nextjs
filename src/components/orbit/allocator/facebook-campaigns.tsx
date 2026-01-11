"use client";

import type { AllocatorCampaign } from "@prisma/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FacebookCampaignsProps {
  workspaceSlug: string;
}

export default function FacebookCampaigns({
  workspaceSlug,
}: FacebookCampaignsProps) {
  const [campaigns, setCampaigns] = useState<AllocatorCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const response = await fetch(
          `/api/orbit/${workspaceSlug}/allocator/facebook/campaigns`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch campaigns");
        }
        const data = await response.json();
        setCampaigns(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCampaigns();
  }, [workspaceSlug]);

  const handleSync = async () => {
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/allocator/facebook/sync`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to start sync");
      }
      toast.success("Sync process started successfully!");
    } catch (err) {
      toast.error(
        `Error starting sync: ${err instanceof Error ? err.message : "An unknown error occurred"}`,
      );
    }
  };

  if (isLoading) {
    return <div>Loading campaigns...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Facebook Campaigns</h2>
        <button
          onClick={handleSync}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Sync Now
        </button>
      </div>
      {campaigns.length === 0 ? <p>No campaigns found.</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Budget
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Spend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {campaign.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.budget?.toString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.spend.toString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
