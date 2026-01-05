"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SocialPlatform, StreamPost } from "@/lib/social/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * Platform-specific character limits
 */
export const PLATFORM_CHARACTER_LIMITS: Record<SocialPlatform, number> = {
  TWITTER: 280,
  FACEBOOK: 8000,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
  TIKTOK: 150,
  YOUTUBE: 10000,
};

/**
 * Connected account info for the selector
 */
export interface ConnectedAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  avatarUrl?: string;
}

/**
 * Props for the ReplyDialog component
 */
export interface ReplyDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** The post being replied to */
  post: StreamPost;
  /** Available accounts for the selected platform */
  accounts: ConnectedAccount[];
  /** Callback when the reply is submitted */
  onSubmit: (accountId: string, content: string) => Promise<void>;
  /** Whether a reply is being submitted */
  isSubmitting?: boolean;
}

/**
 * Get initials from account name for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate content for display
 */
function truncateContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength)}...`;
}

/**
 * ReplyDialog provides a modal interface for composing replies to social media posts.
 *
 * Features:
 * - Shows original post context
 * - Platform-specific character limit indicator
 * - Account selector for multi-account support
 * - Real-time character count with color feedback
 * - Accessible form controls
 */
export function ReplyDialog({
  open,
  onOpenChange,
  post,
  accounts,
  onSubmit,
  isSubmitting = false,
}: ReplyDialogProps) {
  const [content, setContent] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Filter accounts by the post's platform
  const availableAccounts = accounts.filter(
    (account) => account.platform === post.platform,
  );

  const characterLimit = PLATFORM_CHARACTER_LIMITS[post.platform];
  const remainingChars = characterLimit - content.length;
  const isOverLimit = remainingChars < 0;
  const isNearLimit = remainingChars <= 20 && remainingChars >= 0;

  // Auto-select the first available account or the post's original account
  useEffect(() => {
    if (open && availableAccounts.length > 0) {
      // Try to select the account that owns the post first
      const postAccount = availableAccounts.find((a) => a.id === post.accountId);
      if (postAccount) {
        setSelectedAccountId(postAccount.id);
      } else {
        setSelectedAccountId(availableAccounts[0]?.id || "");
      }
    }
  }, [open, availableAccounts, post.accountId]);

  // Reset content when dialog opens
  useEffect(() => {
    if (open) {
      setContent("");
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAccountId || !content.trim() || isOverLimit) return;

    await onSubmit(selectedAccountId, content.trim());
    setContent("");
    onOpenChange(false);
  }, [selectedAccountId, content, isOverLimit, onSubmit, onOpenChange]);

  const handleCancel = useCallback(() => {
    setContent("");
    onOpenChange(false);
  }, [onOpenChange]);

  const selectedAccount = availableAccounts.find(
    (a) => a.id === selectedAccountId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="reply-dialog">
        <DialogHeader>
          <DialogTitle>Reply to Post</DialogTitle>
          <DialogDescription>
            Compose your reply to this {post.platform.toLowerCase()} post.
          </DialogDescription>
        </DialogHeader>

        {/* Original Post Context */}
        <div
          className="rounded-lg border bg-muted/50 p-3"
          data-testid="original-post"
        >
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              {post.accountAvatarUrl && (
                <AvatarImage
                  src={post.accountAvatarUrl}
                  alt={`${post.accountName}'s avatar`}
                />
              )}
              <AvatarFallback className="text-xs">
                {getInitials(post.accountName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{post.accountName}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {truncateContent(post.content, 150)}
          </p>
        </div>

        <div className="space-y-4">
          {/* Account Selector */}
          {availableAccounts.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="account-select">Reply as</Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                disabled={isSubmitting}
              >
                <SelectTrigger id="account-select" data-testid="account-select">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id}
                      data-testid={`account-option-${account.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          {account.avatarUrl && (
                            <AvatarImage
                              src={account.avatarUrl}
                              alt={`${account.accountName}'s avatar`}
                            />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(account.accountName)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{account.accountName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show single account info if only one available */}
          {availableAccounts.length === 1 && selectedAccount && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Replying as:</span>
              <Avatar className="h-5 w-5">
                {selectedAccount.avatarUrl && (
                  <AvatarImage
                    src={selectedAccount.avatarUrl}
                    alt={`${selectedAccount.accountName}'s avatar`}
                  />
                )}
                <AvatarFallback className="text-xs">
                  {getInitials(selectedAccount.accountName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{selectedAccount.accountName}</span>
            </div>
          )}

          {/* Reply Content */}
          <div className="space-y-2">
            <Label htmlFor="reply-content">Your reply</Label>
            <Textarea
              id="reply-content"
              placeholder={`Write your reply... (${characterLimit} characters max)`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[120px] resize-none"
              data-testid="reply-textarea"
            />
            <div className="flex justify-end">
              <span
                className={cn(
                  "text-sm",
                  isOverLimit && "text-destructive font-medium",
                  isNearLimit && !isOverLimit && "text-yellow-600",
                  !isNearLimit && !isOverLimit && "text-muted-foreground",
                )}
                data-testid="character-count"
              >
                {remainingChars} / {characterLimit}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting ||
              !selectedAccountId ||
              !content.trim() ||
              isOverLimit}
            data-testid="submit-button"
          >
            {isSubmitting
              ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              )
              : "Reply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
