"use client";

import type { SocialPlatform } from "@prisma/client";
import { useEffect, useState } from "react";

// Define the Competitor type matching our Prisma model
interface Competitor {
  id: string;
  platform: SocialPlatform;
  handle: string;
  name: string | null;
  isActive: boolean;
}

interface CompetitorListProps {
  workspaceSlug: string;
}

export function CompetitorList({ workspaceSlug }: CompetitorListProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [platform, setPlatform] = useState<SocialPlatform>("TWITTER");
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompetitors() {
      try {
        const response = await fetch(
          `/api/orbit/${workspaceSlug}/scout/competitors`,
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to fetch competitors (${response.status})`,
          );
        }
        const data = await response.json();
        setCompetitors(data);
      } catch (err) {
        const errorMessage = err instanceof Error
          ? err.message
          : "Could not load competitors.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompetitors();
  }, [workspaceSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/scout/competitors`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, handle }),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to add competitor");
      }

      const newCompetitor = await response.json();
      setCompetitors([newCompetitor, ...competitors]);
      setHandle("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  const handleRemove = async (competitorId: string) => {
    if (!confirm("Are you sure you want to remove this competitor?")) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/scout/competitors/${competitorId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to remove competitor");
      }

      // Remove from local state
      setCompetitors(competitors.filter((c) => c.id !== competitorId));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while removing competitor.");
      }
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Competitor Accounts</h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
          className="border p-2 rounded"
        >
          <option value="TWITTER">Twitter</option>
          <option value="FACEBOOK">Facebook</option>
          <option value="INSTAGRAM">Instagram</option>
        </select>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Enter handle"
          className="border p-2 rounded flex-grow"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Add
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {isLoading ? <p>Loading competitors...</p> : (
        <ul>
          {competitors.map((c) => (
            <li
              key={c.id}
              className="border-b p-2 flex justify-between items-center"
            >
              <div>
                <span className="font-bold">{c.name || c.handle}</span>
                <span className="text-gray-500 ml-2">({c.platform})</span>
              </div>
              <button
                onClick={() => handleRemove(c.id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
