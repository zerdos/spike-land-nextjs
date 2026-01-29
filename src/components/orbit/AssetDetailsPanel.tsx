"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAsset, useUpdateAsset, useDeleteAsset, useAnalyzeAsset } from "@/hooks/use-assets";
import { Copy, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AssetTagSelector } from "./AssetTagSelector";

interface AssetDetailsPanelProps {
  assetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetDetailsPanel({
  assetId,
  open,
  onOpenChange,
}: AssetDetailsPanelProps) {
  const { data: asset } = useAsset(assetId);
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();
  const analyzeMutation = useAnalyzeAsset();

  const [filename, setFilename] = useState("");
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (asset) {
      setFilename(asset.filename);
      setAltText(asset.altText || "");
      setTags(asset.tags.map((t) => t.tag.name));
    }
  }, [asset]);

  if (!asset) return null;

  const isImage = asset.fileType.startsWith("image/");

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        assetId: asset.id,
        filename,
        altText,
        tags,
      });
      toast.success("Asset updated");
    } catch (_error) {
      toast.error("Failed to update asset");
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this asset?")) {
      try {
        await deleteMutation.mutateAsync(asset.id);
        toast.success("Asset deleted");
        onOpenChange(false);
      } catch (_error) {
        toast.error("Failed to delete asset");
      }
    }
  };

  const handleAnalyze = async () => {
    try {
      const result = await analyzeMutation.mutateAsync(asset.id);
      setAltText(result.analysis.altText);
      setTags(result.analysis.suggestedTags);
      toast.success("Analysis complete");
    } catch (_error) {
      toast.error("Failed to analyze asset");
    }
  };

  const handleCopyUrl = () => {
    if (asset.url) {
      navigator.clipboard.writeText(asset.url);
      toast.success("URL copied");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Asset Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Preview */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {isImage && asset.url ? (
              <Image
                src={asset.url}
                alt={asset.altText || asset.filename}
                fill
                className="object-contain"
              />
            ) : asset.url ? (
              <video src={asset.url} controls className="w-full h-full">
                <track kind="captions" />
              </video>
            ) : null}
          </div>

          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </div>

          {/* Alt Text */}
          {isImage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="altText">Alt Text</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Analyze
                </Button>
              </div>
              <Textarea
                id="altText"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for accessibility"
                rows={3}
              />
            </div>
          )}

          {/* Quality Score */}
          {asset.qualityScore && (
            <div>
              <Label>Quality Score</Label>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{asset.qualityScore}/100</Badge>
                <span className="text-sm text-muted-foreground">
                  {asset.qualityScore >= 80 ? "Excellent" : asset.qualityScore >= 60 ? "Good" : "Fair"}
                </span>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <AssetTagSelector
              selectedTags={tags}
              onTagsChange={setTags}
            />
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Label>Metadata</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Size: {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
              {asset.width && asset.height && (
                <p>Dimensions: {asset.width} × {asset.height}px</p>
              )}
              <p>Uploaded: {new Date(asset.createdAt).toLocaleDateString()}</p>
              {asset.usageCount !== undefined && (
                <p>Used in {asset.usageCount} posts</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCopyUrl}>
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
