"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface ExportSelectorProps {
  imageId: string;
  fileName: string;
  originalSizeBytes?: number;
}

export function ExportSelector({
  imageId,
  fileName,
}: ExportSelectorProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          format: "jpeg",
          quality: 95,
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
                Download JPEG
              </>
            )}
        </Button>
      </CardContent>
    </Card>
  );
}
