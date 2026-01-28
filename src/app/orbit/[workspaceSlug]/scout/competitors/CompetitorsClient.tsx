"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { SocialPlatform } from "@prisma/client";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Competitor {
  id: string;
  platform: SocialPlatform;
  handle: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CompetitorsClientProps {
  workspaceSlug: string;
}

const PLATFORMS: { value: SocialPlatform; label: string; }[] = [
  { value: "TWITTER", label: "Twitter/X" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
];

export function CompetitorsClient({ workspaceSlug }: CompetitorsClientProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [platform, setPlatform] = useState<SocialPlatform>("TWITTER");
  const [handle, setHandle] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | "ALL">(
    "ALL",
  );

  const fetchCompetitors = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/scout/competitors`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to fetch competitors (${response.status})`,
        );
      }

      const data = await response.json();
      setCompetitors(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Could not load competitors.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!handle.trim()) {
      toast.error("Please enter a handle");
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/scout/competitors`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, handle: handle.trim() }),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to add competitor");
      }

      const newCompetitor = await response.json();
      setCompetitors([newCompetitor, ...competitors]);
      setHandle("");
      toast.success("Competitor added successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCompetitor = async (competitorId: string) => {
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

      setCompetitors(competitors.filter((c) => c.id !== competitorId));
      toast.success("Competitor removed");
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "An unknown error occurred while removing competitor.";
      toast.error(errorMessage);
    }
  };

  // Filter competitors
  const filteredCompetitors = competitors.filter((competitor) => {
    const matchesSearch = searchQuery === "" ||
      competitor.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      competitor.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlatform = platformFilter === "ALL" || competitor.platform === platformFilter;

    return matchesSearch && matchesPlatform;
  });

  const getPlatformLabel = (platform: SocialPlatform) => {
    return PLATFORMS.find((p) => p.value === platform)?.label || platform;
  };

  return (
    <div className="space-y-6">
      {/* Add Competitor Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Competitor</CardTitle>
          <CardDescription>
            Track a new competitor's social media account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCompetitor} className="flex flex-wrap gap-3">
            <Select
              value={platform}
              onValueChange={(value) => setPlatform(value as SocialPlatform)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Enter handle (e.g., @competitor)"
              className="flex-1 min-w-[200px]"
            />

            <Button type="submit" disabled={isAdding}>
              <Plus className="h-4 w-4 mr-2" />
              {isAdding ? "Adding..." : "Add Competitor"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search competitors..."
                className="pl-9"
              />
            </div>

            <Select
              value={platformFilter}
              onValueChange={(value) => setPlatformFilter(value as SocialPlatform | "ALL")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Competitors List */}
      <Card>
        <CardHeader>
          <CardTitle>Tracked Competitors</CardTitle>
          <CardDescription>
            {filteredCompetitors.length} competitor
            {filteredCompetitors.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading
            ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[100px]" />
                    </div>
                  </div>
                ))}
              </div>
            )
            : filteredCompetitors.length === 0
            ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No competitors found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {competitors.length === 0
                    ? "Add your first competitor to start tracking"
                    : "Try adjusting your filters"}
                </p>
              </div>
            )
            : (
              <div className="space-y-3">
                {filteredCompetitors.map((competitor) => (
                  <div
                    key={competitor.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {competitor.name || competitor.handle}
                          </span>
                          <Badge variant="secondary">
                            {getPlatformLabel(competitor.platform)}
                          </Badge>
                          {!competitor.isActive && <Badge variant="outline">Inactive</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          @{competitor.handle}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCompetitor(competitor.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove competitor</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
