/**
 * Content Suggestion Card Component
 * Display individual content suggestion with actions
 * Issue #841
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Edit, Clock, TrendingUp } from "lucide-react";
import type { CalendarContentSuggestion } from "@/types/ai-calendar";
import { formatDistanceToNow } from "date-fns";

interface ContentSuggestionCardProps {
  suggestion: CalendarContentSuggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string, content: string) => void;
}

export function ContentSuggestionCard({
  suggestion,
  onAccept,
  onReject,
  onEdit,
}: ContentSuggestionCardProps) {
  const getStatusColor = () => {
    switch (suggestion.status) {
      case "ACCEPTED":
        return "bg-green-500";
      case "REJECTED":
        return "bg-red-500";
      case "MODIFIED":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getConfidenceColor = () => {
    if (suggestion.confidence >= 80) return "text-green-600";
    if (suggestion.confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{suggestion.content}</CardTitle>
            <CardDescription className="mt-2 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>
                Suggested for{" "}
                {formatDistanceToNow(suggestion.suggestedFor, {
                  addSuffix: true,
                })}
              </span>
            </CardDescription>
          </div>
          <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{suggestion.platform}</Badge>
          <div className="flex items-center gap-1">
            <TrendingUp className={`h-3 w-3 ${getConfidenceColor()}`} />
            <span className={`text-sm font-medium ${getConfidenceColor()}`}>
              {suggestion.confidence}% confidence
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{suggestion.reason}</p>

        {suggestion.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestion.keywords.map((keyword, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                #{keyword}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      {suggestion.status === "PENDING" && (
        <CardFooter className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAccept(suggestion.id)}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(suggestion.id, suggestion.content)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onReject(suggestion.id)}
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
