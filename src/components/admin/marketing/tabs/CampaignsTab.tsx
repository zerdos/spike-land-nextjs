"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  DateRange,
  DateRangePicker,
  DateRangePreset,
  formatDateForAPI,
  getDateRangeFromPreset,
} from "../DateRangePicker";

interface CampaignData {
  id: string;
  name: string;
  platform: "FACEBOOK" | "GOOGLE_ADS" | string;
  visitors: number;
  signups: number;
  conversionRate?: number;
  revenue: number;
}

interface CampaignsResponse {
  campaigns: CampaignData[];
  total: number;
  page: number;
  pageSize: number;
}

type SortField =
  | "name"
  | "platform"
  | "visitors"
  | "signups"
  | "conversionRate"
  | "revenue";
type SortDirection = "asc" | "desc";
type PlatformFilter = "all" | "FACEBOOK" | "GOOGLE_ADS";

interface CampaignsTabProps {
  className?: string;
}

const PAGE_SIZE = 10;

export function CampaignsTab({ className }: CampaignsTabProps) {
  const [data, setData] = useState<CampaignsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRangeFromPreset("30d"),
  );
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: formatDateForAPI(dateRange.startDate),
        endDate: formatDateForAPI(dateRange.endDate),
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
        sortField,
        sortDirection,
      });

      if (platformFilter !== "all") {
        params.set("platform", platformFilter);
      }

      const response = await fetch(
        `/api/admin/marketing/analytics/campaigns?${params}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch campaigns data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [dateRange, platformFilter, sortField, sortDirection, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      setDateRange(getDateRangeFromPreset(preset));
    }
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(1);
  };

  const handleExportCSV = () => {
    if (!data?.campaigns) return;

    const headers = [
      "Campaign",
      "Platform",
      "Visitors",
      "Signups",
      "Conv %",
      "Revenue",
    ];
    const rows = data.campaigns.map((c) => [
      c.name,
      c.platform,
      c.visitors,
      c.signups,
      `${(c.conversionRate ?? 0).toFixed(2)}%`,
      `$${c.revenue.toFixed(2)}`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaigns-${formatDateForAPI(dateRange.startDate)}-${
      formatDateForAPI(dateRange.endDate)
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField; }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc"
      ? <ArrowUp className="ml-1 inline h-3 w-3" />
      : <ArrowDown className="ml-1 inline h-3 w-3" />;
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const getPlatformBadge = (platform: string) => {
    if (
      platform === "FACEBOOK" || platform.toLowerCase().includes("facebook")
    ) {
      return <Badge variant="default" className="bg-blue-600">FB</Badge>;
    }
    if (
      platform === "GOOGLE_ADS" || platform.toLowerCase().includes("google")
    ) {
      return <Badge variant="default" className="bg-yellow-600">Google</Badge>;
    }
    return <Badge variant="outline">{platform}</Badge>;
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Controls Row */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <DateRangePicker
            preset={datePreset}
            onPresetChange={handlePresetChange}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <Select
            value={platformFilter}
            onValueChange={(v) => {
              setPlatformFilter(v as PlatformFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="FACEBOOK">Facebook Ads</SelectItem>
              <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={!data?.campaigns?.length}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {loading
            ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )
            : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("name")}
                      >
                        Campaign
                        <SortIcon field="name" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("platform")}
                      >
                        Platform
                        <SortIcon field="platform" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right hover:bg-muted/50"
                        onClick={() => handleSort("visitors")}
                      >
                        Visitors
                        <SortIcon field="visitors" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right hover:bg-muted/50"
                        onClick={() => handleSort("signups")}
                      >
                        Signups
                        <SortIcon field="signups" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right hover:bg-muted/50"
                        onClick={() => handleSort("conversionRate")}
                      >
                        Conv %
                        <SortIcon field="conversionRate" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer text-right hover:bg-muted/50"
                        onClick={() => handleSort("revenue")}
                      >
                        Revenue
                        <SortIcon field="revenue" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.campaigns && data.campaigns.length > 0
                      ? (
                        data.campaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell className="font-medium">
                              {campaign.name}
                            </TableCell>
                            <TableCell>
                              {getPlatformBadge(campaign.platform)}
                            </TableCell>
                            <TableCell className="text-right">
                              {campaign.visitors.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {campaign.signups.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {(campaign.conversionRate ?? 0).toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${campaign.revenue.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )
                      : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-muted-foreground py-8"
                          >
                            No campaigns found for the selected filters.
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {data && data.total > PAGE_SIZE && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {((page - 1) * PAGE_SIZE) + 1} to{" "}
                      {Math.min(page * PAGE_SIZE, data.total)} of {data.total} campaigns
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
