"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoutResult } from "@prisma/client";
import { useEffect, useState } from "react";

interface TopicFeedProps {
  workspaceSlug: string;
}

interface EnrichedScoutResult extends ScoutResult {
  topic: {
    name: string;
  };
}

export function TopicFeed({ workspaceSlug }: TopicFeedProps) {
  const [results, setResults] = useState<EnrichedScoutResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/scout/monitor?page=${page}`,
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.data);
        setTotalPages(data.pagination.totalPages);
      }
      setLoading(false);
    };
    fetchResults();
  }, [workspaceSlug, page]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading...</p> : (
          <div className="space-y-4">
            {results.map(result => (
              <div key={result.id} className="border p-4 rounded-md">
                <p className="font-bold">{result.topic.name}</p>
                <p>{result.content}</p>
                <div className="text-sm text-gray-500">
                  <span>by {result.author}</span> | <span>{result.platform}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center mt-4">
          <Button onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
