"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { SocialPlatform, StreamPost } from "@/lib/social/types";
import { cn } from "@/lib/utils";
import { ExternalLink, Heart, Loader2, MessageCircle, Share2 } from "lucide-react";
import Image from "next/image";

/**
 * Platform badge color configuration
 */
const PLATFORM_COLORS: Record<SocialPlatform, { bg: string; text: string; }> = {
  TWITTER: { bg: "bg-[#1DA1F2]", text: "text-white" },
  FACEBOOK: { bg: "bg-[#1877F2]", text: "text-white" },
  INSTAGRAM: {
    bg: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
    text: "text-white",
  },
  LINKEDIN: { bg: "bg-[#0A66C2]", text: "text-white" },
  TIKTOK: { bg: "bg-black", text: "text-white" },
  YOUTUBE: { bg: "bg-[#FF0000]", text: "text-white" },
};

/**
 * Platform display names
 */
const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  TWITTER: "X",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
};

/**
 * Props for the StreamPostCard component
 */
export interface StreamPostCardProps {
  /** The post data to display */
  post: StreamPost;
  /** Callback when the like button is clicked */
  onLike?: (postId: string) => void;
  /** Callback when the reply button is clicked */
  onReply?: (postId: string) => void;
  /** Callback when the share button is clicked */
  onShare?: (postId: string) => void;
  /** Whether a like action is currently loading for this post */
  isLiking?: boolean;
  /** Whether a reply action is currently loading for this post */
  isReplying?: boolean;
  /** Whether to disable all actions */
  disabled?: boolean;
}

/**
 * Format a number for display (e.g., 1000 -> 1K)
 */
function formatMetricCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return date.toLocaleDateString();
  }
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return "Just now";
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
 * Maximum content length before truncation
 */
const MAX_CONTENT_LENGTH = 280;

/**
 * StreamPostCard displays a single social media post in the unified stream feed.
 * It shows account info, platform badge, post content, metrics, and action buttons.
 */
export function StreamPostCard({
  post,
  onLike,
  onReply,
  onShare,
  isLiking = false,
  isReplying = false,
  disabled = false,
}: StreamPostCardProps) {
  const platformColors = PLATFORM_COLORS[post.platform];
  const platformName = PLATFORM_NAMES[post.platform];
  const publishedDate = post.publishedAt instanceof Date
    ? post.publishedAt
    : new Date(post.publishedAt);

  const isContentTruncated = post.content.length > MAX_CONTENT_LENGTH;
  const displayContent = isContentTruncated
    ? `${post.content.slice(0, MAX_CONTENT_LENGTH)}...`
    : post.content;

  const handleLike = () => {
    if (!disabled && !isLiking) {
      onLike?.(post.id);
    }
  };

  const handleReply = () => {
    if (!disabled && !isReplying) {
      onReply?.(post.id);
    }
  };

  const handleShare = () => {
    if (!disabled) {
      onShare?.(post.id);
    }
  };

  return (
    <Card data-testid="stream-post-card" className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar>
              {post.accountAvatarUrl && (
                <AvatarImage
                  src={post.accountAvatarUrl}
                  alt={`${post.accountName}'s avatar`}
                />
              )}
              <AvatarFallback>{getInitials(post.accountName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">
                {post.accountName}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatRelativeTime(publishedDate)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              data-testid="platform-badge"
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                platformColors.bg,
                platformColors.text,
              )}
            >
              {platformName}
            </span>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open original post"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-foreground whitespace-pre-wrap">{displayContent}</p>

        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div
            data-testid="media-preview"
            className={cn(
              "mt-3 grid gap-2",
              post.mediaUrls.length === 1 && "grid-cols-1",
              post.mediaUrls.length === 2 && "grid-cols-2",
              post.mediaUrls.length >= 3 && "grid-cols-2",
            )}
          >
            {post.mediaUrls.slice(0, 4).map((url, index) => (
              <div
                key={url}
                className={cn(
                  "relative overflow-hidden rounded-lg bg-muted",
                  post.mediaUrls!.length === 3 && index === 0 && "row-span-2",
                )}
              >
                <Image
                  src={url}
                  alt={`Post media ${index + 1}`}
                  className="h-full w-full object-cover"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ))}
          </div>
        )}

        {post.metrics && (
          <div
            data-testid="metrics"
            className="mt-4 flex items-center gap-4 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {formatMetricCount(post.metrics.likes)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {formatMetricCount(post.metrics.comments)}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              {formatMetricCount(post.metrics.shares)}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
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
              {isLiking
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Heart className={cn("h-4 w-4", post.isLiked && "fill-current")} />}
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
      </CardFooter>
    </Card>
  );
}
