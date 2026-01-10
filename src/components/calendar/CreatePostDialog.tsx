/**
 * CreatePostDialog Component
 *
 * Dialog for creating and editing scheduled posts.
 * Part of #574: Build Calendar UI
 */

"use client";

import type { SocialPlatform } from "@prisma/client";
import { format } from "date-fns";
import { Calendar, Clock, Repeat } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { CalendarPostItem, CreateScheduledPostInput } from "@/lib/calendar/types";

export interface SocialAccountOption {
  id: string;
  platform: SocialPlatform;
  name: string;
}

export interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateScheduledPostInput) => void;
  accounts: SocialAccountOption[];
  initialDate?: Date;
  editingPost?: CalendarPostItem | null;
  isSubmitting?: boolean;
  timezone?: string;
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  LINKEDIN: "LinkedIn",
  TWITTER: "Twitter/X",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  DISCORD: "Discord",
};

const RECURRENCE_OPTIONS = [
  { value: "", label: "No recurrence" },
  { value: "FREQ=DAILY", label: "Daily" },
  { value: "FREQ=WEEKLY", label: "Weekly" },
  { value: "FREQ=WEEKLY;BYDAY=MO,WE,FR", label: "Mon, Wed, Fri" },
  { value: "FREQ=MONTHLY", label: "Monthly" },
];

export function CreatePostDialog({
  open,
  onOpenChange,
  onSubmit,
  accounts,
  initialDate,
  editingPost,
  isSubmitting,
  timezone = "UTC",
}: CreatePostDialogProps) {
  const [content, setContent] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [recurrenceRule, setRecurrenceRule] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Initialize form when dialog opens or editing post changes
  useEffect(() => {
    if (open) {
      if (editingPost) {
        setContent(editingPost.content);
        // Note: we'd need the full post with account IDs to populate this
        setSelectedAccounts([]);
        setScheduledDate(format(editingPost.scheduledAt, "yyyy-MM-dd"));
        setScheduledTime(format(editingPost.scheduledAt, "HH:mm"));
        setRecurrenceRule(editingPost.isRecurring ? "FREQ=WEEKLY" : ""); // Simplified
      } else {
        const targetDate = initialDate || new Date();
        setContent("");
        setSelectedAccounts([]);
        setScheduledDate(format(targetDate, "yyyy-MM-dd"));
        setScheduledTime(format(targetDate, "HH:mm"));
        setRecurrenceRule("");
      }
      setError(null);
    }
  }, [open, editingPost, initialDate]);

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const validateForm = (): boolean => {
    if (!content.trim()) {
      setError("Please enter post content");
      return false;
    }

    if (selectedAccounts.length === 0) {
      setError("Please select at least one account");
      return false;
    }

    if (!scheduledDate || !scheduledTime) {
      setError("Please select a date and time");
      return false;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledAt <= new Date()) {
      setError("Scheduled time must be in the future");
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);

    onSubmit({
      content: content.trim(),
      scheduledAt,
      timezone,
      accountIds: selectedAccounts,
      recurrenceRule: recurrenceRule || undefined,
    });
  };

  const isEditing = !!editingPost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="create-post-dialog">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Scheduled Post" : "Schedule New Post"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your scheduled post details below."
                : "Create a post to be published at a specific time."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Error message */}
            {error && (
              <div
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                data-testid="form-error"
              >
                {error}
              </div>
            )}

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Post Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What do you want to share?"
                rows={4}
                data-testid="post-content-input"
              />
              <p className="text-xs text-muted-foreground">
                {content.length} characters
              </p>
            </div>

            {/* Account selection */}
            <div className="space-y-2">
              <Label>Target Accounts</Label>
              <div className="space-y-2">
                {accounts.length === 0
                  ? (
                    <p className="text-sm text-muted-foreground">
                      No social accounts connected. Go to Settings to connect accounts.
                    </p>
                  )
                  : (
                    accounts.map((account) => (
                      <div
                        key={account.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
                          selectedAccounts.includes(account.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted",
                        )}
                        onClick={() => handleAccountToggle(account.id)}
                        data-testid={`account-option-${account.id}`}
                      >
                        <Checkbox
                          checked={selectedAccounts.includes(account.id)}
                          onCheckedChange={() => handleAccountToggle(account.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {PLATFORM_LABELS[account.platform]}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled-date">
                  <Calendar className="mr-1 inline h-4 w-4" />
                  Date
                </Label>
                <Input
                  id="scheduled-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  data-testid="scheduled-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled-time">
                  <Clock className="mr-1 inline h-4 w-4" />
                  Time
                </Label>
                <Input
                  id="scheduled-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  data-testid="scheduled-time-input"
                />
              </div>
            </div>

            {/* Timezone display */}
            <p className="text-xs text-muted-foreground">
              Timezone: {timezone}
            </p>

            {/* Recurrence */}
            <div className="space-y-2">
              <Label htmlFor="recurrence">
                <Repeat className="mr-1 inline h-4 w-4" />
                Recurrence
              </Label>
              <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                <SelectTrigger data-testid="recurrence-select">
                  <SelectValue placeholder="No recurrence" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value || "none"}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="schedule-button">
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
