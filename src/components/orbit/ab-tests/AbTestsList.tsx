"use client";

/**
 * List of A/B tests with filtering by status
 *
 * Displays all A/B tests for a workspace with tabs for filtering.
 * Resolves #840
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AbTest } from "@/types/ab-test";
import { useCallback, useEffect, useState } from "react";
import { AbTestCard } from "./AbTestCard";

interface AbTestsListProps {
  workspaceSlug: string;
}

export function AbTestsList({ workspaceSlug }: AbTestsListProps) {
  const [tests, setTests] = useState<AbTest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = useCallback(async () => {
    try {
      const response = await fetch(`/api/orbit/${workspaceSlug}/ab-tests`);
      if (!response.ok) {
        throw new Error("Failed to fetch tests");
      }
      const data = await response.json();
      setTests(data.tests || []);
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    void fetchTests();
  }, [fetchTests]);

  const filterTestsByStatus = (status?: string) => {
    if (!status) return tests;
    return tests.filter((test) => test.status === status);
  };

  if (loading) {
    return <div className="text-center py-8">Loading tests...</div>;
  }

  if (tests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No A/B tests yet. Create your first test to get started!
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList>
        <TabsTrigger value="all">All ({tests.length})</TabsTrigger>
        <TabsTrigger value="RUNNING">
          Running ({filterTestsByStatus("RUNNING").length})
        </TabsTrigger>
        <TabsTrigger value="COMPLETED">
          Completed ({filterTestsByStatus("COMPLETED").length})
        </TabsTrigger>
        <TabsTrigger value="DRAFT">
          Draft ({filterTestsByStatus("DRAFT").length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="space-y-4 mt-4">
        {tests.map((test) => (
          <AbTestCard key={test.id} test={test} workspaceSlug={workspaceSlug} />
        ))}
      </TabsContent>

      <TabsContent value="RUNNING" className="space-y-4 mt-4">
        {filterTestsByStatus("RUNNING").map((test) => (
          <AbTestCard key={test.id} test={test} workspaceSlug={workspaceSlug} />
        ))}
      </TabsContent>

      <TabsContent value="COMPLETED" className="space-y-4 mt-4">
        {filterTestsByStatus("COMPLETED").map((test) => (
          <AbTestCard key={test.id} test={test} workspaceSlug={workspaceSlug} />
        ))}
      </TabsContent>

      <TabsContent value="DRAFT" className="space-y-4 mt-4">
        {filterTestsByStatus("DRAFT").map((test) => (
          <AbTestCard key={test.id} test={test} workspaceSlug={workspaceSlug} />
        ))}
      </TabsContent>
    </Tabs>
  );
}
