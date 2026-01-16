"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { ImageComparisonSlider } from "./ImageComparisonSlider";
import type { Version } from "./version-history";

interface VersionCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId: string;
  imageName: string;
  originalUrl: string;
  versions: Version[];
  initialVersion1?: Version | null;
  initialVersion2?: Version | null;
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
      return "bg-green-500/10 text-green-700 border-green-500/20";
    case "TIER_2K":
      return "bg-blue-500/10 text-blue-700 border-blue-500/20";
    case "TIER_4K":
      return "bg-purple-500/10 text-purple-700 border-purple-500/20";
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

const handleDownload = (
  url: string | null,
  imageName: string,
  tier: string,
): void => {
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  link.download = `${imageName}-${getTierLabel(tier)}.jpg`;
  link.target = "_blank";
  link.click();
};

export function VersionCompareModal({
  open,
  onOpenChange,
  imageId: _imageId,
  imageName,
  originalUrl,
  versions,
  initialVersion1,
  initialVersion2,
}: VersionCompareModalProps) {
  const [version1, setVersion1] = useState<Version | null>(null);
  const [version2, setVersion2] = useState<Version | null>(null);

  useEffect(() => {
    if (open) {
      setVersion1(
        initialVersion1 ?? (versions.length > 0 ? versions[0] : null) ?? null,
      );
      setVersion2(
        initialVersion2 ?? (versions.length > 1 ? versions[1] : null) ?? null,
      );
    }
  }, [open, initialVersion1, initialVersion2, versions]);

  if (versions.length === 0) {
    return null;
  }

  const getVersionById = (jobId: string): Version | null => {
    return versions.find((v) => v.jobId === jobId) || null;
  };

  const getImageUrl = (version: Version | null): string => {
    return version?.resultUrl || originalUrl;
  };

  const getImageLabel = (version: Version | null): string => {
    return version
      ? `${getTierLabel(version.tier)} - ${formatDate(version.createdAt)}`
      : "Original";
  };

  const getImageDimensions = (version: Version | null) => {
    if (!version) return { width: 16, height: 9 };
    return {
      width: version.width || 16,
      height: version.height || 9,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Versions</DialogTitle>
          <DialogDescription>
            Compare different enhancement versions of {imageName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="version1-select" className="text-sm font-medium">Left Image</label>
              <Select
                value={version1?.jobId || "original"}
                onValueChange={(jobId) =>
                  setVersion1(
                    jobId === "original" ? null : getVersionById(jobId),
                  )}
              >
                <SelectTrigger id="version1-select" data-testid="version1-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  {versions.map((version) => (
                    <SelectItem key={version.jobId} value={version.jobId}>
                      {getTierLabel(version.tier)} - {formatDate(version.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {version1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={getTierColor(version1.tier)}
                    variant="outline"
                  >
                    {getTierLabel(version1.tier)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {version1.tokensSpent} tokens
                  </span>
                  {version1.width && version1.height && (
                    <span className="text-xs text-muted-foreground">
                      {version1.width} x {version1.height}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleDownload(
                        version1.resultUrl,
                        imageName,
                        version1.tier,
                      )}
                    disabled={!version1.resultUrl}
                    className="h-6 px-2"
                    data-testid="download-version1"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="version2-select" className="text-sm font-medium">Right Image</label>
              <Select
                value={version2?.jobId || "original"}
                onValueChange={(jobId) =>
                  setVersion2(
                    jobId === "original" ? null : getVersionById(jobId),
                  )}
              >
                <SelectTrigger id="version2-select" data-testid="version2-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  {versions.map((version) => (
                    <SelectItem key={version.jobId} value={version.jobId}>
                      {getTierLabel(version.tier)} - {formatDate(version.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {version2 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={getTierColor(version2.tier)}
                    variant="outline"
                  >
                    {getTierLabel(version2.tier)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {version2.tokensSpent} tokens
                  </span>
                  {version2.width && version2.height && (
                    <span className="text-xs text-muted-foreground">
                      {version2.width} x {version2.height}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleDownload(
                        version2.resultUrl,
                        imageName,
                        version2.tier,
                      )}
                    disabled={!version2.resultUrl}
                    className="h-6 px-2"
                    data-testid="download-version2"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <ImageComparisonSlider
            originalUrl={getImageUrl(version1)}
            enhancedUrl={getImageUrl(version2)}
            originalLabel={getImageLabel(version1)}
            enhancedLabel={getImageLabel(version2)}
            width={getImageDimensions(version2).width}
            height={getImageDimensions(version2).height}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
