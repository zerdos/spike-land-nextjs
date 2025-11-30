'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles } from 'lucide-react'
import { EnhancementTier } from '@prisma/client'

const TIER_OPTIONS = [
  {
    value: 'TIER_1K',
    label: '1K (1024px)',
    cost: 2,
    description: 'Good for social media',
  },
  {
    value: 'TIER_2K',
    label: '2K (2048px)',
    cost: 5,
    description: 'High quality prints',
  },
  {
    value: 'TIER_4K',
    label: '4K (4096px)',
    cost: 10,
    description: 'Professional grade',
  },
]

interface EnhancementSettingsProps {
  imageId: string
  onEnhancementStart: (jobId: string) => void
  disabled?: boolean
}

export function EnhancementSettings({
  imageId,
  onEnhancementStart,
  disabled = false,
}: EnhancementSettingsProps) {
  const [tier, setTier] = useState<EnhancementTier>('TIER_1K')
  const [prompt, setPrompt] = useState(
    'Create a high resolution version of this photo with perfect focus, lighting, and colors.'
  )
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTier = TIER_OPTIONS.find((t) => t.value === tier)

  const handleEnhance = async () => {
    try {
      setIsEnhancing(true)
      setError(null)

      const response = await fetch('/api/images/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, tier }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Enhancement failed')
      }

      const data = await response.json()
      onEnhancementStart(data.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed')
    } finally {
      setIsEnhancing(false)
    }
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Enhancement Settings
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure the enhancement quality and output resolution
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Resolution Tier</Label>
          <RadioGroup
            value={tier}
            onValueChange={(value) => setTier(value as EnhancementTier)}
            disabled={disabled || isEnhancing}
          >
            {TIER_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent"
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <Label
                  htmlFor={option.value}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                    <Badge variant="secondary">{option.cost} tokens</Badge>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label htmlFor="prompt">Enhancement Prompt (Preview Only)</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            disabled={true}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Prompt customization coming soon. Currently using default
            professional enhancement.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        onClick={handleEnhance}
        disabled={disabled || isEnhancing}
        className="w-full"
        size="lg"
      >
        {isEnhancing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enhancing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Enhance Image ({selectedTier?.cost} tokens)
          </>
        )}
      </Button>
    </Card>
  )
}
