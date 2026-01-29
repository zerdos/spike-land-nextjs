/**
 * Audit Log Export - Export dialog with format selection
 * Resolves #522 (ORB-068): Audit Log UI
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AuditLogExportProps {
  workspaceSlug: string;
  filters: Record<string, string>;
}

export function AuditLogExport({ workspaceSlug, filters }: AuditLogExportProps) {
  const [format, setFormat] = useState<"csv" | "json" | "pdf">("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ ...filters, format });
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/audit/export?${params.toString()}`,
      );

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Audit logs exported successfully");
      setDialogOpen(false);
    } catch (_error) {
      toast.error("Failed to export audit logs");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Audit Logs</DialogTitle>
          <DialogDescription>
            Export audit logs in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Label>Export Format</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="font-normal">CSV (Spreadsheet)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="json" />
              <Label htmlFor="json" className="font-normal">JSON (Data)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf" className="font-normal">PDF (Report)</Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
