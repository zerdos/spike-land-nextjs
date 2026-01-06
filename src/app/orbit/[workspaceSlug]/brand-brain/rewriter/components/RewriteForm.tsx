"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContentPlatform, ContentRewriteResponse } from "@/lib/validations/brand-rewrite";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { PlatformSelector } from "./PlatformSelector";

interface RewriteFormProps {
  workspaceId: string;
  onRewriteComplete: (result: ContentRewriteResponse) => void;
  onError: (error: string) => void;
}

export function RewriteForm({
  workspaceId,
  onRewriteComplete,
  onError,
}: RewriteFormProps) {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("GENERAL");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      onError("Please enter some content to rewrite");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/brand-brain/rewrite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim(), platform }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to rewrite content");
      }

      const result = await response.json();
      onRewriteComplete(result);
    } catch (error) {
      onError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="content">Draft Content</Label>
        <Textarea
          id="content"
          placeholder="Enter your draft content here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="resize-none font-mono"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Enter the content you want to align with your brand guidelines.
        </p>
      </div>

      <PlatformSelector
        value={platform}
        onChange={setPlatform}
        currentLength={content.length}
        disabled={isLoading}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !content.trim()}
      >
        {isLoading
          ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Rewriting...
            </>
          )
          : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Rewrite with AI
            </>
          )}
      </Button>
    </form>
  );
}
