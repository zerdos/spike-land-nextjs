'use client'

import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

export interface Version {
  id: string
  url: string
  width: number
  height: number
  label: string
  tier?: string
  isOriginal?: boolean
}

interface VersionGridProps {
  versions: Version[]
  selectedVersionId: string | null
  onSelectVersion: (versionId: string) => void
  side: 'left' | 'right'
}

export function VersionGrid({
  versions,
  selectedVersionId,
  onSelectVersion,
  side,
}: VersionGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">
          Select {side === 'left' ? 'Left' : 'Right'} Image
        </h3>
        <Badge variant="outline" className="text-xs">
          {side === 'left' ? 'Before' : 'After'}
        </Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {versions.map((version) => (
          <Card
            key={version.id}
            className={cn(
              'relative overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary',
              selectedVersionId === version.id && 'ring-2 ring-primary'
            )}
            onClick={() => onSelectVersion(version.id)}
          >
            <div className="relative aspect-square">
              <Image
                src={version.url}
                alt={version.label}
                fill
                className="object-cover"
              />
              {selectedVersionId === version.id && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
            <div className="p-2 space-y-1">
              <p className="text-xs font-medium truncate">{version.label}</p>
              <div className="flex items-center gap-1">
                {version.isOriginal && (
                  <Badge variant="secondary" className="text-xs">
                    Original
                  </Badge>
                )}
                {version.tier && (
                  <Badge variant="outline" className="text-xs">
                    {version.tier}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {version.width}x{version.height}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
