"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";

interface MetricsData {
  successRate: {
    last24h: { total: number; successes: number; rate: number };
    last7d: { total: number; successes: number; rate: number };
  };
  latency: { p50: number; p75: number; p95: number };
  iterationsHistogram: Array<{ iterations: number; count: number }>;
  modelComparison: Array<{
    model: string;
    total: number;
    successes: number;
    successRate: number;
    avgDurationMs: number;
    totalCost: number;
  }>;
  totalCost: number;
  activeNotes: number;
}

interface NotesData {
  byStatus: Array<{ status: string; _count: number }>;
  topEffective: Array<{
    id: string;
    trigger: string;
    helpCount: number;
    failCount: number;
    confidenceScore: number;
    status: string;
  }>;
  bottomFailing: Array<{
    id: string;
    trigger: string;
    helpCount: number;
    failCount: number;
    confidenceScore: number;
    status: string;
  }>;
  totalNotes: number;
  averageConfidence: number;
}

export function CreateAgentDashboardClient() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [notes, setNotes] = useState<NotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, notesRes] = await Promise.all([
          fetch("/api/admin/create-agent/metrics"),
          fetch("/api/admin/create-agent/notes"),
        ]);

        if (!metricsRes.ok || !notesRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [metricsData, notesData] = await Promise.all([
          metricsRes.json() as Promise<MetricsData>,
          notesRes.json() as Promise<NotesData>,
        ]);

        setMetrics(metricsData);
        setNotes(notesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Create Agent Dashboard
      </h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Success Rate (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.successRate.last24h.rate ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.successRate.last24h.successes ?? 0}/
              {metrics?.successRate.last24h.total ?? 0} generations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">p95 Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? (metrics.latency.p95 / 1000).toFixed(1) : 0}s
            </div>
            <p className="text-xs text-muted-foreground">
              p50: {metrics ? (metrics.latency.p50 / 1000).toFixed(1) : 0}s /
              p75: {metrics ? (metrics.latency.p75 / 1000).toFixed(1) : 0}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Cost (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics?.totalCost.toFixed(4) ?? "0.0000"}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.modelComparison.length ?? 0} models used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.activeNotes ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg confidence: {(notes?.averageConfidence ?? 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Comparison Table */}
      {metrics && metrics.modelComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Model Comparison (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Success Rate</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.modelComparison.map((model) => (
                  <TableRow key={model.model}>
                    <TableCell className="font-medium">
                      {model.model}
                    </TableCell>
                    <TableCell className="text-right">{model.total}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          model.successRate >= 80
                            ? "default"
                            : model.successRate >= 50
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {model.successRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {(model.avgDurationMs / 1000).toFixed(1)}s
                    </TableCell>
                    <TableCell className="text-right">
                      ${model.totalCost.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Top Effective Notes */}
      {notes && notes.topEffective.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Effective Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="text-right">Helps</TableHead>
                  <TableHead className="text-right">Fails</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.topEffective.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {note.trigger}
                    </TableCell>
                    <TableCell className="text-right">
                      {note.helpCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {note.failCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {note.confidenceScore.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          note.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {note.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bottom Failing Notes */}
      {notes && notes.bottomFailing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Failing Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="text-right">Helps</TableHead>
                  <TableHead className="text-right">Fails</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.bottomFailing.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {note.trigger}
                    </TableCell>
                    <TableCell className="text-right">
                      {note.helpCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {note.failCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {note.confidenceScore.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          note.status === "DEPRECATED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {note.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
