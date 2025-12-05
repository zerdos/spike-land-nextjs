"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { estimateFileSize, type ExportFormat } from "@/lib/images/format-utils";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface ExportSelectorProps {
  imageId: string;
  fileName: string;
  originalSizeBytes?: number;
}

interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "jpeg",
    label: "JPEG",
    description: "Best for photos, smaller file size",
  },
  {
    value: "png",
    label: "PNG",
    description: "Lossless quality, larger file size",
  },
  {
    value: "webp",
    label: "WebP",
    description: "Modern format, excellent compression",
  },
];

export function ExportSelector({
  imageId,
  fileName,
  originalSizeBytes = 1000000,
}: ExportSelectorProps) {
  const [format, setFormat] = useState<ExportFormat>("jpeg");
  const [quality, setQuality] = useState([95]);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedSize = estimateFileSize(
    originalSizeBytes,
    format,
    format === "jpeg" ? quality[0] : undefined,
  );

  const formatSizeDisplay = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/images/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId,
          format,
          quality: format === "jpeg" ? quality[0] : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const contentDisposition = response.headers.get("Content-Disposition");
      let downloadFileName = fileName;
      if (contentDisposition) {
        const matches = /filename="(.+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          downloadFileName = matches[1];
        }
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Enhanced Image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="format-select">Format</Label>
          <Select
            value={format}
            onValueChange={(value) => setFormat(value as ExportFormat)}
          >
            <SelectTrigger id="format-select">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {format === "jpeg" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quality-slider">JPEG Quality</Label>
              <span className="text-sm text-muted-foreground">
                {quality[0]}%
              </span>
            </div>
            <Slider
              id="quality-slider"
              min={70}
              max={100}
              step={5}
              value={quality}
              onValueChange={setQuality}
            />
            <p className="text-xs text-muted-foreground">
              Higher quality = larger file size
            </p>
          </div>
        )}

        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated file size:</span>
            <span className="font-medium">{formatSizeDisplay(estimatedSize)}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
        >
          {isExporting
            ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            )
            : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download {format.toUpperCase()}
              </>
            )}
        </Button>
      </CardContent>
    </Card>
  );
}
