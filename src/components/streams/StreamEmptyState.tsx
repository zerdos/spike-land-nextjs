"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Link, Search, Users } from "lucide-react";

/**
 * Props for the StreamEmptyState component
 */
export interface StreamEmptyStateProps {
  /** The type of empty state to display */
  type: "no-accounts" | "no-posts" | "no-results";
  /** Callback when the connect accounts button is clicked */
  onConnectAccounts?: () => void;
}

/**
 * Configuration for each empty state type
 */
const EMPTY_STATE_CONFIG = {
  "no-accounts": {
    icon: Users,
    title: "Connect your social accounts",
    description:
      "Link your Twitter, Facebook, Instagram, or LinkedIn accounts to see your posts here.",
    showCta: true,
    ctaText: "Connect Accounts",
  },
  "no-posts": {
    icon: FileText,
    title: "No posts yet",
    description: "Your connected accounts don't have any posts yet, or we couldn't fetch them.",
    showCta: false,
    ctaText: "",
  },
  "no-results": {
    icon: Search,
    title: "No matching posts",
    description: "Try adjusting your filters or search query.",
    showCta: false,
    ctaText: "",
  },
} as const;

/**
 * StreamEmptyState displays a placeholder when there are no posts to show.
 * It handles three scenarios: no connected accounts, no posts available,
 * and no posts matching the current filters.
 */
export function StreamEmptyState({
  type,
  onConnectAccounts,
}: StreamEmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type];
  const Icon = config.icon;

  const handleConnectClick = () => {
    onConnectAccounts?.();
  };

  return (
    <Card data-testid="stream-empty-state" className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Icon
            className="h-8 w-8 text-muted-foreground"
            data-testid="empty-state-icon"
          />
        </div>
        <h3
          className="mb-2 text-lg font-semibold text-foreground"
          data-testid="empty-state-title"
        >
          {config.title}
        </h3>
        <p
          className="mb-6 max-w-md text-sm text-muted-foreground"
          data-testid="empty-state-description"
        >
          {config.description}
        </p>
        {config.showCta && (
          <Button
            onClick={handleConnectClick}
            data-testid="connect-accounts-button"
          >
            <Link className="h-4 w-4" />
            {config.ctaText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
