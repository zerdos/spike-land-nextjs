"use client";

import type { AttributionModel } from "@/components/admin/marketing/attribution/AttributionModelSelector";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { useState } from "react";

interface ExportButtonProps {
  startDate: Date;
  endDate: Date;
  selectedModel?: AttributionModel;
  className?: string;
}

export function ExportButton({
  startDate,
  endDate,
  selectedModel,
  className,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (
    format: "csv" | "json",
    model: AttributionModel | "ALL",
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0]!,
        endDate: endDate.toISOString().split("T")[0]!,
        format,
        exportType: "attribution",
        attributionModel: model,
      });

      const response = await fetch(
        `/api/admin/marketing/analytics/export?${params}`,
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      if (format === "json") {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attribution-${model.toLowerCase()}-${params.get("startDate")}-to-${params.get("endDate")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // CSV download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attribution-${model.toLowerCase()}-${params.get("startDate")}-to-${params.get("endDate")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={loading}
        >
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {selectedModel && (
          <>
            <DropdownMenuItem onClick={() => handleExport("csv", selectedModel)}>
              CSV (Current Model: {selectedModel})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("json", selectedModel)}>
              JSON (Current Model: {selectedModel})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => handleExport("csv", "ALL")}>
          CSV (All Models)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json", "ALL")}>
          JSON (All Models)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
