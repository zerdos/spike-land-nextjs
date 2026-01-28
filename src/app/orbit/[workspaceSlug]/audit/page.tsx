/**
 * Audit Log Viewer Page
 * Resolves #522 (ORB-068): Audit Log UI
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditLogTable } from "@/components/orbit/audit/AuditLogTable";
import { AuditLogFilters } from "@/components/orbit/audit/AuditLogFilters";
import { AuditLogExport } from "@/components/orbit/audit/AuditLogExport";
import { RetentionPolicyManager } from "@/components/orbit/audit/RetentionPolicyManager";

interface AuditPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default function AuditPage({ params }: AuditPageProps) {
  const [workspaceSlug, setWorkspaceSlug] = useState<string>("");
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    action: "all",
    targetType: "all",
    dateRange: "30d",
  });

  useEffect(() => {
    params.then((p) => setWorkspaceSlug(p.workspaceSlug));
  }, [params]);

  const fetchLogs = useCallback(async () => {
    if (!workspaceSlug) return;

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.action !== "all") queryParams.set("action", filters.action);
      if (filters.targetType !== "all") queryParams.set("targetType", filters.targetType);
      if (filters.search) queryParams.set("search", filters.search);
      queryParams.set("dateRange", filters.dateRange);

      const response = await fetch(
        `/api/orbit/${workspaceSlug}/audit/logs?${queryParams.toString()}`
      );

      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (_error) {
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!workspaceSlug) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track all actions and changes across your workspace
          </p>
        </div>
        <AuditLogExport workspaceSlug={workspaceSlug} filters={filters} />
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="retention">Retention Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <AuditLogFilters
            filters={filters}
            onFilterChange={setFilters}
            onSearch={fetchLogs}
          />
          <AuditLogTable logs={logs} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="retention">
          <RetentionPolicyManager workspaceSlug={workspaceSlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
