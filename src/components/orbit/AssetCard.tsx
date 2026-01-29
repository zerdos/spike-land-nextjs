"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { Asset } from "@/lib/assets/asset-client";
import { Copy, Eye, FileImage, FileVideo, MoreVertical, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface AssetCardProps {
  asset: Asset;
  onPreview?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
}

export function AssetCard({ asset, onPreview, onDelete }: AssetCardProps) {
  const [imageError, setImageError] = useState(false);
  const isImage = asset.fileType.startsWith("image/");
  const isVideo = asset.fileType.startsWith("video/");

  const handleCopyUrl = async () => {
    if (asset.url) {
      await navigator.clipboard.writeText(asset.url);
      toast.success("URL copied to clipboard");
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(asset);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(asset);
    }
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div className="relative aspect-square bg-muted">
          {isImage && asset.url && !imageError ? (
            <Image
              src={asset.url}
              alt={asset.altText || asset.filename}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : isVideo && asset.url ? (
            <video
              src={asset.url}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              {isImage ? (
                <FileImage className="h-16 w-16 text-muted-foreground" />
              ) : (
                <FileVideo className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
          )}

          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePreview}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* File type badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs">
              {isImage ? "Image" : isVideo ? "Video" : "File"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <h3 className="font-medium text-sm truncate" title={asset.filename}>
          {asset.filename}
        </h3>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs"
              >
                {tag.name}
              </Badge>
            ))}
            {asset.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{asset.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
        {asset.usage && asset.usage.total > 0 && (
          <span>Used in {asset.usage.total} post{asset.usage.total !== 1 ? "s" : ""}</span>
        )}
      </CardFooter>
    </Card>
  );
}
