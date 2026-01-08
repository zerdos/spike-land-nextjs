"use client";

import { Button } from "@/components/ui/button";
import type { StreamPost } from "@/lib/social/types";
import { cn } from "@/lib/utils";
import { Heart, Loader2, MessageCircle, Share2 } from "lucide-react";

/**
 * Props for the StreamActions component
 */
export interface StreamActionsProps {
  /** The post to show actions for */
  post: StreamPost;
  /** Callback when the like button is clicked */
  onLike?: () => void;
  /** Callback when the reply button is clicked */
  onReply?: () => void;
  /** Callback when the share button is clicked */
  onShare?: () => void;
  /** Whether a like action is currently loading */
  isLiking?: boolean;
  /** Whether a reply action is currently loading */
  isReplying?: boolean;
  /** Whether to disable all actions */
  disabled?: boolean;
}

/**
 * StreamActions displays engagement action buttons for a social media post.
 * Shows like, reply, and share buttons based on platform capabilities.
 *
 * Features:
 * - Platform-aware action buttons (only shows supported actions)
 * - Loading states for async operations
 * - Visual feedback for liked state
 * - Accessible button labels
 */
export function StreamActions({
  post,
  onLike,
  onReply,
  onShare,
  isLiking = false,
  isReplying = false,
  disabled = false,
}: StreamActionsProps) {
  const handleLike = () => {
    if (!disabled && !isLiking) {
      onLike?.();
    }
  };

  const handleReply = () => {
    if (!disabled && !isReplying) {
      onReply?.();
    }
  };

  const handleShare = () => {
    if (!disabled) {
      onShare?.();
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid="stream-actions">
      {post.canLike && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleLike}
          disabled={disabled || isLiking}
          className={cn(post.isLiked && "text-red-500")}
          aria-label={post.isLiked ? "Unlike" : "Like"}
          data-testid="like-button"
        >
          {isLiking ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <Heart
              className={cn("h-4 w-4", post.isLiked && "fill-current")}
            />
          )}
          <span className="ml-1">Like</span>
        </Button>
      )}

      {post.canReply && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReply}
          disabled={disabled || isReplying}
          aria-label="Reply"
          data-testid="reply-button"
        >
          {isReplying
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <MessageCircle className="h-4 w-4" />}
          <span className="ml-1">Reply</span>
        </Button>
      )}

      {post.canShare && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          disabled={disabled}
          aria-label="Share"
          data-testid="share-button"
        >
          <Share2 className="h-4 w-4" />
          <span className="ml-1">Share</span>
        </Button>
      )}
    </div>
  );
}
