"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExportButton } from "./ExportButton"
import type { EnhancementTier, JobStatus } from "@prisma/client"

interface EnhancementVersion {
  id: string
  tier: EnhancementTier
  enhancedUrl: string
  width: number
  height: number
  createdAt: Date
  status: JobStatus
}

interface VersionGridProps {
  versions: EnhancementVersion[]
  onVersionSelect?: (versionId: string) => void
  selectedVersionId?: string
}

const tierLabels: Record<EnhancementTier, string> = {
  TIER_1K: "1K",
  TIER_2K: "2K",
  TIER_4K: "4K",
}

export function VersionGrid({
  versions,
  onVersionSelect,
  selectedVersionId,
}: VersionGridProps) {
  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No enhancement versions yet. Create your first enhancement above.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {versions.map((version) => (
        <Card
          key={version.id}
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedVersionId === version.id
              ? "ring-2 ring-primary"
              : ""
          }`}
          onClick={() => onVersionSelect?.(version.id)}
        >
          <CardContent className="p-4">
            <div className="relative aspect-video mb-3 bg-muted rounded-md overflow-hidden">
              {version.status === "COMPLETED" && (
                <Image
                  src={version.enhancedUrl}
                  alt={`Enhanced version ${tierLabels[version.tier]}`}
                  fill
                  className="object-contain"
                />
              )}
              {version.status === "PROCESSING" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Processing...</p>
                  </div>
                </div>
              )}
              {version.status === "FAILED" && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                  <p className="text-sm text-destructive">Enhancement Failed</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary">{tierLabels[version.tier]}</Badge>
              <span className="text-xs text-muted-foreground">
                {version.width} × {version.height}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              {new Date(version.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            {version.status === "COMPLETED" && (
              <ExportButton
                imageUrl={version.enhancedUrl}
                fileName={`enhanced-${tierLabels[version.tier]}-${version.id}.jpg`}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
