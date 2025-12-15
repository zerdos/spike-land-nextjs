"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnhancementTier, PipelineVisibility } from "@prisma/client";
import { Copy, Edit, Eye, Globe, Lock, MoreVertical, Trash2 } from "lucide-react";

export interface PipelineData {
  id: string;
  name: string;
  description: string | null;
  tier: EnhancementTier;
  visibility: PipelineVisibility;
  usageCount: number;
  isOwner: boolean;
  isSystemDefault: boolean;
  createdAt: string;
}

interface PipelineCardProps {
  pipeline: PipelineData;
  onEdit?: (pipeline: PipelineData) => void;
  onDelete?: (pipeline: PipelineData) => void;
  onFork?: (pipeline: PipelineData) => void;
  onSelect?: (pipeline: PipelineData) => void;
  selected?: boolean;
}

const TIER_LABELS: Record<EnhancementTier, string> = {
  TIER_1K: "1K",
  TIER_2K: "2K",
  TIER_4K: "4K",
};

const TIER_COLORS: Record<EnhancementTier, string> = {
  TIER_1K: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  TIER_2K: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  TIER_4K: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export function PipelineCard({
  pipeline,
  onEdit,
  onDelete,
  onFork,
  onSelect,
  selected,
}: PipelineCardProps) {
  const visibilityIcon = {
    PRIVATE: <Lock className="h-3 w-3" />,
    PUBLIC: <Globe className="h-3 w-3" />,
    LINK: <Eye className="h-3 w-3" />,
  };

  return (
    <Card
      className={`relative transition-all ${
        onSelect ? "cursor-pointer hover:border-primary/50" : ""
      } ${selected ? "border-primary ring-2 ring-primary/20" : ""}`}
      onClick={() => onSelect?.(pipeline)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">
                {pipeline.name}
              </CardTitle>
              {pipeline.isSystemDefault && (
                <Badge variant="secondary" className="text-xs">
                  System
                </Badge>
              )}
            </div>
            {pipeline.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {pipeline.description}
              </CardDescription>
            )}
          </div>
          {(pipeline.isOwner || !pipeline.isSystemDefault) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {pipeline.isOwner && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(pipeline);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onFork?.(pipeline);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Fork
                </DropdownMenuItem>
                {pipeline.isOwner && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(pipeline);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className={TIER_COLORS[pipeline.tier]}>
            {TIER_LABELS[pipeline.tier]}
          </Badge>
          <div className="flex items-center gap-1">
            {visibilityIcon[pipeline.visibility]}
            <span className="capitalize">
              {pipeline.visibility.toLowerCase()}
            </span>
          </div>
          <span className="text-xs">•</span>
          <span>{pipeline.usageCount} uses</span>
        </div>
      </CardContent>
    </Card>
  );
}
