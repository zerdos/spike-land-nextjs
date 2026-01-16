"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DraftEditType } from "@prisma/client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface EditHistoryEntry {
  id: string;
  draftId: string;
  originalContent: string;
  editedContent: string;
  editType: DraftEditType;
  changesSummary: string | null;
  editDistance: number | null;
  editedById: string;
  createdAt: string;
  editedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface EditHistoryViewerProps {
  editHistory: EditHistoryEntry[];
}

const editTypeConfig: Record<DraftEditType, { label: string; color: string; }> = {
  MINOR_TWEAK: {
    label: "Minor Tweak",
    color: "bg-gray-100 text-gray-800 border-gray-200",
  },
  TONE_ADJUSTMENT: {
    label: "Tone Adjustment",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  CONTENT_REVISION: {
    label: "Content Revision",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  COMPLETE_REWRITE: {
    label: "Complete Rewrite",
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  PLATFORM_FORMATTING: {
    label: "Platform Formatting",
    color: "bg-green-100 text-green-800 border-green-200",
  },
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function EditHistoryItem({ entry }: { entry: EditHistoryEntry; }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = editTypeConfig[entry.editType] || editTypeConfig.MINOR_TWEAK;

  const editPercentage = entry.editDistance !== null
    ? Math.round(
      (entry.editDistance /
        Math.max(entry.originalContent.length, entry.editedContent.length)) *
        100,
    )
    : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            {isOpen
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <Badge variant="outline" className={`text-xs ${config.color}`}>
              {config.label}
            </Badge>
            {editPercentage !== null && (
              <span className="text-xs text-muted-foreground">
                {editPercentage}% changed
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTimestamp(entry.createdAt)}
            {entry.editedBy && (
              <span className="ml-2">
                by {entry.editedBy.name || entry.editedBy.email || "Unknown"}
              </span>
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-3">
          {entry.changesSummary && (
            <p className="text-sm text-muted-foreground italic">
              {entry.changesSummary}
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Original
              </p>
              <div className="p-2 rounded bg-red-50 border border-red-200 text-sm">
                {entry.originalContent}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Edited
              </p>
              <div className="p-2 rounded bg-green-50 border border-green-200 text-sm">
                {entry.editedContent}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function EditHistoryViewer({ editHistory }: EditHistoryViewerProps) {
  if (!editHistory || editHistory.length === 0) {
    return null;
  }

  return (
    <Card data-testid="edit-history">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Edit History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {editHistory.map((entry) => <EditHistoryItem key={entry.id} entry={entry} />)}
        </div>
      </CardContent>
    </Card>
  );
}
