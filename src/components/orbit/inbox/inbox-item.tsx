import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { InboxItem as InboxItemType } from "@prisma/client";
import {
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Music2,
  Twitter,
  Youtube,
} from "lucide-react";
import React from "react";
import { InboxPriorityBadge } from "./inbox-priority-badge";
import { InboxSentimentBadge } from "./inbox-sentiment-badge";

interface InboxItemProps {
  item: InboxItemType;
  isSelected: boolean;
  onClick: () => void;
}

const PLATFORM_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; }>
> = {
  TWITTER: Twitter,
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  LINKEDIN: Linkedin,
  TIKTOK: Music2,
  YOUTUBE: Youtube,
  DISCORD: MessageCircle,
};

function PlatformIcon({ platform }: { platform: string; }) {
  const Icon = PLATFORM_ICONS[platform] || MessageCircle;
  return <Icon className="h-4 w-4" />;
}

export function InboxItem({ item, isSelected, onClick }: InboxItemProps) {
  return (
    <Card
      className={`cursor-pointer ${isSelected ? "bg-gray-100" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-4 flex items-start space-x-4">
        <Avatar>
          <AvatarImage
            src={item.senderAvatarUrl ?? undefined}
            alt={item.senderName}
          />
          <AvatarFallback>
            <PlatformIcon platform={item.platform} />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{item.senderName}</div>
            <div className="text-xs text-gray-500">
              {new Date(item.receivedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
          <div className="text-sm text-gray-700 mt-1">{item.content}</div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">{item.type}</Badge>
            <InboxSentimentBadge
              sentiment={item.sentiment}
              score={item.sentimentScore}
            />
            <InboxPriorityBadge score={item.priorityScore} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
