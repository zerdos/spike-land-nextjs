"use client";

import { useWorkspace } from "@/components/orbit/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCSV, exportToCSV, generatePDF } from "@/lib/workspace/report-export";
import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

interface ReportSummary {
  workspaceId: string;
  workspaceName: string;
  socialAccountCount: number;
  publishedPostCount: number;
  totalEngagements: number;
  totalImpressions: number;
  totalFollowers: number;
  scheduledPostCount: number;
  lastActivityAt: string | null;
}

export function CrossWorkspaceReport() {
  const { workspaces } = useWorkspace();

  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const workspaceOptions = workspaces.map((w) => ({
    label: w.name,
    value: w.id,
  }));

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["cross-workspace-report", selectedWorkspaceIds, dateRange],
    queryFn: async () => {
      if (selectedWorkspaceIds.length === 0 || !dateRange?.from || !dateRange?.to) {
        return null;
      }

      const response = await fetch("/api/workspaces/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceIds: selectedWorkspaceIds,
          dateRange: {
            startDate: dateRange.from,
            endDate: dateRange.to,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch report");
      }

      return response.json();
    },
    enabled: false, // Only fetch on button click
  });

  const handleGenerateReport = () => {
    if (selectedWorkspaceIds.length === 0) {
      toast.error("Please select at least one workspace");
      return;
    }
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Please select a date range");
      return;
    }
    refetch();
  };

  const handleExportCSV = () => {
    if (!reportData?.summaries) return;
    const csv = exportToCSV(reportData.summaries);
    downloadCSV(csv, `workspace-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    const doc = generatePDF(
      "Cross-Workspace Report",
      reportData.kpis,
      reportData.summaries,
    );
    doc.save(`workspace-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="workspace-select" className="text-sm font-medium">Workspaces</label>
              <div id="workspace-select">
                <MultiSelect
                  options={workspaceOptions}
                  selected={selectedWorkspaceIds}
                  onChange={setSelectedWorkspaceIds}
                  placeholder="Select workspaces..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="date-range-picker" className="text-sm font-medium">Date Range</label>
              <div id="date-range-picker">
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              </div>
            </div>
          </div>
          <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full md:w-auto">
            {isLoading
              ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              )
              : (
                "Generate Report"
              )}
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {reportData.kpis.totalEngagements.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total Engagements</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {reportData.kpis.totalImpressions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total Impressions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {reportData.kpis.totalFollowers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total Followers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {reportData.kpis.totalPublishedPosts.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Published Posts</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), "MMM dd")}
                    minTickGap={30}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) => format(new Date(date), "MMM dd, yyyy")}
                    formatter={(value: number | undefined) => [value?.toLocaleString() ?? "0", ""]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="engagements"
                    stroke="#8884d8"
                    name="Engagements"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#82ca9d"
                    name="Impressions"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Workspace Breakdown</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileText className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead className="text-right">Accounts</TableHead>
                    <TableHead className="text-right">Posts</TableHead>
                    <TableHead className="text-right">Engagements</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reportData.summaries as ReportSummary[]).map((summary) => (
                    <TableRow key={summary.workspaceId}>
                      <TableCell className="font-medium">{summary.workspaceName}</TableCell>
                      <TableCell className="text-right">{summary.socialAccountCount}</TableCell>
                      <TableCell className="text-right">{summary.publishedPostCount}</TableCell>
                      <TableCell className="text-right">
                        {summary.totalEngagements.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {summary.totalImpressions.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
