"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, RefreshCw, Search, Zap, ZapOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AllocatorAuditLog } from "@prisma/client";

interface AllocatorAuditLogViewerProps {
  workspaceSlug: string;
}

export function AllocatorAuditLogViewer({ workspaceSlug }: AllocatorAuditLogViewerProps) {
  const [logs, setLogs] = useState<AllocatorAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [stats, setStats] = useState<{ total: number; }>({ total: 0 });

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set("fromDate", dateRange.from.toISOString());
      if (dateRange?.to) params.set("toDate", dateRange.to.toISOString());
      if (searchQuery) params.set("executionId", searchQuery); // Simple search mapping for now

      const response = await fetch(
        `/api/orbit/${workspaceSlug}/allocator/audit?${params.toString()}`,
      );
      const data = await response.json();
      if (data.data) {
        setLogs(data.data);
        setStats({ total: data.meta.total });
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug, dateRange, searchQuery]);

  // Initial Fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // SSE Effect
  useEffect(() => {
    if (!isRealtime) return;

    const eventSource = new EventSource(`/api/orbit/${workspaceSlug}/allocator/audit/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "update" && data.logs) {
          setLogs((prev) => {
            // Merge new logs at the top, avoiding duplicates if any
            const inputLogs = data.logs as AllocatorAuditLog[];
            const existingIds = new Set(prev.map(l => l.id));
            const uniqueNewLogs = inputLogs.filter(l => !existingIds.has(l.id));
            return [...uniqueNewLogs, ...prev];
          });
        }
      } catch (e) {
        console.error("SSE Parse Error", e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isRealtime, workspaceSlug]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append("fromDate", dateRange.from.toISOString());
    if (dateRange?.to) params.append("toDate", dateRange.to.toISOString());
    window.location.href =
      `/api/orbit/${workspaceSlug}/allocator/audit/export?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div /> {/* Spacer or secondary title if needed, else empty to keep button alignment */}
        <div className="flex items-center gap-2">
          <Button
            variant={isRealtime ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRealtime(!isRealtime)}
            className={cn(isRealtime && "bg-green-600 hover:bg-green-700")}
          >
            {isRealtime ? <Zap className="mr-2 h-4 w-4" /> : <ZapOff className="mr-2 h-4 w-4" />}
            {isRealtime ? "Live" : "Real-time Off"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Execution ID or content..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(dateRange?.from && "bg-secondary")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from
                  ? (
                    dateRange.to
                      ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      )
                      : (
                        format(dateRange.from, "LLL dd, y")
                      )
                  )
                  : <span>Pick a date range</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range: any) => setDateRange(range || {})}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={() => fetchLogs()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4">
          <div className="flex justify-between">
            <CardTitle className="text-base">Recent Activities</CardTitle>
            <CardDescription>{stats.total} events found</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>User / Trigger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && !isLoading
                ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      No logs found
                    </TableCell>
                  </TableRow>
                )
                : (logs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.decisionType}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.decisionOutcome} />
                    </TableCell>
                    <TableCell className="max-w-md truncate" title={log.aiReasoning || ""}>
                      <span className="font-medium text-sm">{log.aiReasoning}</span>
                      {log.previousState && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Budget: {(log.previousState as { budget?: number; })?.budget ?? "?"}{" "}
                          &rarr; {(log.newState as { budget?: number; })?.budget ?? "?"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.userId ? "User" : log.triggeredBy}
                    </TableCell>
                  </TableRow>
                )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string; }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

  switch (status) {
    case "EXECUTED":
    case "APPROVED":
      variant = "default"; // or success if available
      break;
    case "REJECTED":
    case "FAILED":
      variant = "destructive";
      break;
    case "GUARDRAIL_TRIGGERED":
      variant = "destructive";
      break;
    case "ROLLED_BACK":
      variant = "secondary";
      break;
  }

  return <Badge variant={variant}>{status}</Badge>;
}
