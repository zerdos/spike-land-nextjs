"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Coins, Download, GitCompare } from "lucide-react";
import { useState } from "react";
import { VersionCompareModal } from "./version-compare-modal";

export interface Version {
  jobId: string;
  tier: "TIER_1K" | "TIER_2K" | "TIER_4K";
  status: string;
  resultUrl: string | null;
  tokensSpent: number;
  createdAt: string | Date;
  processingTimeMs: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
}

export interface VersionHistoryProps {
  imageId: string;
  imageName: string;
  originalUrl: string;
  versions: Version[];
}

const getTierLabel = (tier: string): string => {
  switch (tier) {
    case "TIER_1K":
      return "1K";
    case "TIER_2K":
      return "2K";
    case "TIER_4K":
      return "4K";
    default:
      return tier;
  }
};

const getTierColor = (tier: string): string => {
  switch (tier) {
    case "TIER_1K":
      return "bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20";
    case "TIER_2K":
      return "bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20";
    case "TIER_4K":
      return "bg-purple-500/10 text-purple-700 border-purple-500/20 hover:bg-purple-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  }
};

const formatDate = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatProcessingTime = (ms: number | null): string => {
  if (ms === null) return "N/A";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const formatFileSize = (bytes: number | null): string => {
  if (bytes === null) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const handleDownload = (url: string | null, imageName: string, tier: string): void => {
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  link.download = `${imageName}-${getTierLabel(tier)}.jpg`;
  link.target = "_blank";
  link.click();
};

export function VersionHistory({ imageId, imageName, originalUrl, versions }: VersionHistoryProps) {
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<{
    version1: Version | null;
    version2: Version | null;
  }>({
    version1: versions.length > 0 ? (versions[0] ?? null) : null,
    version2: versions.length > 1 ? (versions[1] ?? null) : null,
  });

  const openCompareModal = (version1?: Version, version2?: Version) => {
    setSelectedVersions({
      version1: version1 ?? versions[0] ?? null,
      version2: version2 ?? versions[1] ?? null,
    });
    setCompareModalOpen(true);
  };

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>No enhancement versions available yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                {versions.length} enhancement{versions.length !== 1 ? "s" : ""} available
              </CardDescription>
            </div>
            {versions.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCompareModal()}
                data-testid="compare-button"
              >
                <GitCompare className="mr-2 h-4 w-4" />
                Compare Versions
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {versions.map((version, index) => (
              <div
                key={version.jobId}
                className="relative border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                data-testid={`version-item-${index}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getTierColor(version.tier)} variant="outline">
                        {getTierLabel(version.tier)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(version.createdAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Coins className="h-4 w-4" />
                        <span>{version.tokensSpent} tokens</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatProcessingTime(version.processingTimeMs)}</span>
                      </div>
                    </div>

                    {(version.width || version.sizeBytes) && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {version.width && version.height && (
                          <span>
                            {version.width} x {version.height}
                          </span>
                        )}
                        {version.sizeBytes && <span>{formatFileSize(version.sizeBytes)}</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(version.resultUrl, imageName, version.tier)}
                      disabled={!version.resultUrl}
                      data-testid={`download-button-${index}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {index < versions.length - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCompareModal(version, versions[index + 1])}
                        data-testid={`compare-next-button-${index}`}
                      >
                        <GitCompare className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {index < versions.length - 1 && (
                  <div className="absolute left-8 -bottom-4 w-px h-4 bg-border" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <VersionCompareModal
        open={compareModalOpen}
        onOpenChange={setCompareModalOpen}
        imageId={imageId}
        imageName={imageName}
        originalUrl={originalUrl}
        versions={versions}
        initialVersion1={selectedVersions.version1}
        initialVersion2={selectedVersions.version2}
      />
    </>
  );
}
