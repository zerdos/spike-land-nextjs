"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface McpResponseViewerProps {
  response: unknown;
  error: string | null;
  isExecuting: boolean;
  responseType: "json" | "image" | "text";
}

export function McpResponseViewer({
  response,
  error,
  isExecuting,
  responseType,
}: McpResponseViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Response</CardTitle>
      </CardHeader>
      <CardContent>
        {isExecuting ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorDisplay message={error} />
        ) : response === null || response === undefined ? (
          <EmptyState />
        ) : (
          <ResponseContent response={response} responseType={responseType} />
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 space-y-2">
      <div className="flex items-center gap-2 text-destructive font-medium">
        <AlertCircle className="h-4 w-4" />
        Error
      </div>
      <p className="text-sm text-destructive/80">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
      <Sparkles className="h-8 w-8 opacity-40" />
      <p className="text-sm">Execute a tool to see the response</p>
    </div>
  );
}

function ResponseContent({
  response,
  responseType,
}: {
  response: unknown;
  responseType: "json" | "image" | "text";
}) {
  if (responseType === "image" && isImageResponse(response)) {
    const url = getImageUrl(response);
    if (url) {
      return (
        <div className="space-y-3">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <Image
              src={url}
              alt="Tool response image"
              fill
              className="object-contain"
            />
          </div>
          {typeof response === "object" && (
            <JsonBlock data={response} />
          )}
        </div>
      );
    }
  }

  if (responseType === "text" && typeof response === "string") {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <CopyButton text={response} />
        </div>
        <ScrollArea className="max-h-96">
          <pre className="text-sm font-mono whitespace-pre-wrap p-4 rounded-lg bg-muted">
            {response}
          </pre>
        </ScrollArea>
      </div>
    );
  }

  // Default: JSON
  return <JsonBlock data={response} />;
}

function JsonBlock({ data }: { data: unknown }) {
  const formatted = JSON.stringify(data, null, 2);

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <CopyButton text={formatted} />
      </div>
      <ScrollArea className="max-h-96">
        <pre className="text-sm font-mono whitespace-pre-wrap p-4 rounded-lg bg-muted">
          {formatted}
        </pre>
      </ScrollArea>
    </div>
  );
}

function isImageResponse(response: unknown): boolean {
  if (typeof response !== "object" || response === null) return false;
  const r = response as Record<string, unknown>;
  return (
    typeof r["outputImageUrl"] === "string" ||
    typeof r["url"] === "string" ||
    typeof r["image_url"] === "string"
  );
}

function getImageUrl(response: unknown): string | null {
  if (typeof response !== "object" || response === null) return null;
  const r = response as Record<string, unknown>;
  if (typeof r["outputImageUrl"] === "string") return r["outputImageUrl"];
  if (typeof r["url"] === "string") return r["url"];
  if (typeof r["image_url"] === "string") return r["image_url"];
  return null;
}
