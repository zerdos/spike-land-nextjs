import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InboxSuggestedResponse } from "@prisma/client";
import { RefreshCw, Sparkles } from "lucide-react";

interface InboxSuggestionsPanelProps {
  suggestions: InboxSuggestedResponse[];
  onSelect: (content: string) => void;
  onRegenerate: () => void;
  isLoading?: boolean;
}

export function InboxSuggestionsPanel(
  { suggestions, onSelect, onRegenerate, isLoading }: InboxSuggestionsPanelProps,
) {
  if (!suggestions.length && !isLoading) return null;

  return (
    <Card className="bg-blue-50/50 border-blue-100 mb-4">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800">
          <Sparkles className="w-4 h-4 text-blue-500" />
          AI Suggestions
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRegenerate}
          disabled={isLoading}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {isLoading ? <div className="text-xs text-gray-500 italic">Thinking...</div> : (
          suggestions.map((s) => (
            <div
              key={s.id}
              className="bg-white p-3 rounded-md border border-blue-100 text-sm hover:border-blue-300 cursor-pointer transition-colors shadow-sm text-gray-700"
              onClick={() => onSelect(s.content)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(s.content);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {s.content}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
