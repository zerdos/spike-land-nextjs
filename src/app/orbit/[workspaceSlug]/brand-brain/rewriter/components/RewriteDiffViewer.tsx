"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  applySelectedChanges,
  countChanges,
  countSelectedChanges,
  deselectAllChanges,
  selectAllChanges,
  toggleHunkSelection,
} from "@/lib/brand-brain/apply-selected-changes";
import { cn } from "@/lib/utils";
import type { DiffHunk } from "@/lib/validations/brand-rewrite";
import { Check, Copy, Eye, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface RewriteDiffViewerProps {
  original: string;
  rewritten: string;
  hunks: DiffHunk[];
  onAccept: (finalText: string) => void;
  onReject: () => void;
  characterLimit: number;
}

export function RewriteDiffViewer({
  original: _original,
  rewritten: _rewritten,
  hunks: initialHunks,
  onAccept,
  onReject,
  characterLimit,
}: RewriteDiffViewerProps) {
  const [hunks, setHunks] = useState(initialHunks);
  const [activeTab, setActiveTab] = useState<"diff" | "preview">("diff");
  const [copied, setCopied] = useState(false);

  // Compute stats
  const { added, removed, total } = useMemo(() => countChanges(hunks), [hunks]);
  const { totalSelected } = useMemo(() => countSelectedChanges(hunks), [hunks]);

  // Compute preview text
  const previewText = useMemo(() => applySelectedChanges(hunks), [hunks]);
  const previewLength = previewText.length;
  const isOverLimit = previewLength > characterLimit;

  // Handlers
  const handleToggleHunk = useCallback((hunkId: string) => {
    setHunks((prev) => toggleHunkSelection(prev, hunkId));
  }, []);

  const handleSelectAll = useCallback(() => {
    setHunks((prev) => selectAllChanges(prev));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setHunks((prev) => deselectAllChanges(prev));
  }, []);

  const handleAccept = useCallback(() => {
    onAccept(previewText);
  }, [onAccept, previewText]);

  const handleCopyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [previewText]);

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex gap-4">
          <span className="text-green-600 dark:text-green-400">
            +{added} additions
          </span>
          <span className="text-red-600 dark:text-red-400">
            -{removed} removals
          </span>
          <span>
            {totalSelected}/{total} changes selected
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
            Deselect All
          </Button>
        </div>
      </div>

      {/* Tabs for Diff / Preview */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "diff" | "preview")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="diff">Diff View</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-4 w-4" />
            Preview ({previewLength}/{characterLimit})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diff" className="mt-4">
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="p-4 font-mono text-sm">
              {hunks.map((hunk) => (
                <DiffHunkItem
                  key={hunk.id}
                  hunk={hunk}
                  onToggle={handleToggleHunk}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="p-4">
              <pre
                className={cn(
                  "whitespace-pre-wrap break-words font-mono text-sm",
                  isOverLimit && "text-red-600 dark:text-red-400",
                )}
              >
                {previewText}
              </pre>
            </div>
          </ScrollArea>
          {isOverLimit && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Content exceeds character limit ({previewLength}/{characterLimit})
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleCopyToClipboard}>
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Copied!" : "Copy Result"}
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onReject}>
            <X className="mr-2 h-4 w-4" />
            Reject All
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isOverLimit}
          >
            <Check className="mr-2 h-4 w-4" />
            Accept {totalSelected > 0 && totalSelected < total ? "Selected" : "All"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Individual diff hunk component
interface DiffHunkItemProps {
  hunk: DiffHunk;
  onToggle: (hunkId: string) => void;
}

function DiffHunkItem({ hunk, onToggle }: DiffHunkItemProps) {
  if (hunk.type === "unchanged") {
    return <span className="text-muted-foreground">{hunk.value}</span>;
  }

  const isAddition = hunk.type === "added";
  const isRemoval = hunk.type === "removed";

  return (
    <span
      className={cn(
        "relative inline",
        isAddition && hunk.selected &&
          "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
        isAddition && !hunk.selected &&
          "bg-gray-100 dark:bg-gray-800 text-gray-400 line-through",
        isRemoval && hunk.selected &&
          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 line-through",
        isRemoval && !hunk.selected &&
          "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
      )}
    >
      <span
        className="cursor-pointer hover:opacity-80"
        onClick={() => onToggle(hunk.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle(hunk.id)}
        role="button"
        tabIndex={0}
        title={hunk.selected ? "Click to deselect" : "Click to select"}
      >
        <Checkbox
          checked={hunk.selected}
          className="mr-1 h-3 w-3 align-middle"
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => onToggle(hunk.id)}
        />
        {hunk.value}
      </span>
    </span>
  );
}
