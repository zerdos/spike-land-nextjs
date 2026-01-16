/**
 * CalendarClient Component
 *
 * Main client component for the calendar page in Orbit.
 * Manages calendar state, post creation/editing, and drag-and-drop rescheduling.
 * Part of #574: Build Calendar UI
 */

"use client";

import type { SocialPlatform } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  CalendarHeader,
  CalendarMonthView,
  CreatePostDialog,
  type SocialAccountOption,
} from "@/components/calendar";
import { useWorkspace } from "@/components/orbit/WorkspaceContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCalendarView } from "@/hooks/useCalendarView";
import type { CalendarPostItem, CreateScheduledPostInput } from "@/lib/calendar/types";
import { AlertCircle, Plus } from "lucide-react";

interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
}

async function fetchAccounts(workspaceId: string): Promise<SocialAccount[]> {
  const response = await fetch(
    `/api/social/accounts?workspaceId=${workspaceId}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch accounts");
  }
  return response.json();
}

async function createScheduledPost(
  workspaceId: string,
  data: CreateScheduledPostInput,
): Promise<void> {
  const response = await fetch("/api/calendar/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, workspaceId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Failed to create post",
    }));
    throw new Error(error.error || "Failed to create post");
  }
}

async function reschedulePost(
  postId: string,
  newScheduledAt: Date,
): Promise<void> {
  const response = await fetch(`/api/calendar/posts/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduledAt: newScheduledAt.toISOString() }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Failed to reschedule post",
    }));
    throw new Error(error.error || "Failed to reschedule post");
  }
}

export function CalendarClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [_selectedPost, setSelectedPost] = useState<CalendarPostItem | null>(
    null,
  );
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string; } | null
  >(null);

  const {
    posts,
    currentDate,
    viewMode,
    filters,
    isLoading,
    isError,
    error,
    goToNextMonth,
    goToPreviousMonth,
    goToToday,
    setViewMode,
    setFilters,
  } = useCalendarView({
    workspaceId,
    enabled: !!workspaceId,
  });

  // Fetch connected accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["social-accounts", workspaceId],
    queryFn: () => fetchAccounts(workspaceId),
    enabled: !!workspaceId,
  });

  // Create post mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateScheduledPostInput) => createScheduledPost(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-view"] });
      setCreateDialogOpen(false);
      setSelectedDate(null);
      showMessage("success", "Post scheduled successfully");
    },
    onError: (error) => {
      showMessage("error", error.message);
    },
  });

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ postId, newDate }: { postId: string; newDate: Date; }) =>
      reschedulePost(postId, newDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-view"] });
      showMessage("success", "Post rescheduled successfully");
    },
    onError: (error) => {
      showMessage("error", error.message);
    },
  });

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedPost(null);
    setCreateDialogOpen(true);
  }, []);

  const handlePostClick = useCallback((post: CalendarPostItem) => {
    // Navigate to post detail/edit page
    router.push(`/orbit/${workspace?.slug}/calendar/${post.id}`);
  }, [router, workspace?.slug]);

  const handleReschedule = useCallback(
    (postId: string, newDate: Date) => {
      rescheduleMutation.mutate({ postId, newDate });
    },
    [rescheduleMutation],
  );

  const handleCreatePost = useCallback(
    (data: CreateScheduledPostInput) => {
      createMutation.mutate(data);
    },
    [createMutation],
  );

  const handleConnectAccounts = useCallback(() => {
    if (workspace?.slug) {
      router.push(`/orbit/${workspace.slug}/settings`);
    }
  }, [router, workspace?.slug]);

  // Map accounts to dialog format
  const accountOptions: SocialAccountOption[] = accounts.map((account) => ({
    id: account.id,
    platform: account.platform,
    name: account.accountName,
  }));

  // Get unique platforms from connected accounts
  const connectedPlatforms: SocialPlatform[] = [
    ...new Set(accounts.map((a) => a.platform)),
  ];

  // No accounts connected state
  if (!isLoading && accounts.length === 0) {
    return (
      <div className="space-y-6" data-testid="calendar-view">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">
              Schedule and manage your social media posts
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-xl font-semibold">No accounts connected</h2>
          <p className="mt-2 text-muted-foreground">
            Connect your social media accounts to start scheduling posts.
          </p>
          <Button className="mt-4" onClick={handleConnectAccounts}>
            Connect Accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="calendar-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            Schedule and manage your social media posts
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          data-testid="create-post-button"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {isError && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Calendar Header */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        filters={filters}
        connectedPlatforms={connectedPlatforms}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
        onViewModeChange={setViewMode}
        onFiltersChange={setFilters}
        isLoading={isLoading}
      />

      {/* Calendar View */}
      <CalendarMonthView
        currentDate={currentDate}
        posts={posts}
        onPostClick={handlePostClick}
        onDayClick={handleDayClick}
        onReschedule={handleReschedule}
        isLoading={isLoading || rescheduleMutation.isPending}
      />

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreatePost}
        accounts={accountOptions}
        initialDate={selectedDate ?? undefined}
        isSubmitting={createMutation.isPending}
        timezone="UTC"
      />
    </div>
  );
}
