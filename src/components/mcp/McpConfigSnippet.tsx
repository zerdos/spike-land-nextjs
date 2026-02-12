"use client";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

interface McpConfigSnippetProps {
  code: string;
  language?: "json" | "bash";
  className?: string;
}

export function McpConfigSnippet({
  code,
  language,
  className,
}: McpConfigSnippetProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl bg-black/40 backdrop-blur p-4",
        className,
      )}
    >
      {language && (
        <Badge variant="outline" className="absolute top-2 left-2 text-xs">
          {language}
        </Badge>
      )}
      <CopyButton text={code} className="absolute top-2 right-2" />
      <pre className="overflow-x-auto pt-6">
        <code className="font-mono text-sm text-green-400/80">{code}</code>
      </pre>
    </div>
  );
}
