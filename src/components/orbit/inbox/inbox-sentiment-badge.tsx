import { Badge } from "@/components/ui/badge";
import { InboxSentiment } from "@prisma/client";
import { Frown, HelpCircle, Meh, Smile } from "lucide-react";

interface InboxSentimentBadgeProps {
  sentiment?: InboxSentiment | null;
  score?: number | null;
  className?: string;
}

export function InboxSentimentBadge({ sentiment, score, className }: InboxSentimentBadgeProps) {
  if (!sentiment) return null;

  const config = {
    POSITIVE: { icon: Smile, color: "text-green-600 bg-green-50 border-green-200" },
    NEGATIVE: { icon: Frown, color: "text-red-600 bg-red-50 border-red-200" },
    NEUTRAL: { icon: Meh, color: "text-gray-600 bg-gray-50 border-gray-200" },
    MIXED: { icon: HelpCircle, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  };

  const { icon: Icon, color } = config[sentiment] || config.NEUTRAL;

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${color} ${className}`}>
      <Icon className="w-3 h-3" />
      <span className="capitalize">{sentiment.toLowerCase()}</span>
      {score !== undefined && score !== null && (
        <span className="text-xs opacity-70 ml-1">({score.toFixed(1)})</span>
      )}
    </Badge>
  );
}
