"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { EnhancementTier } from "@prisma/client"

interface EnhancementSettingsProps {
  onEnhance: (tier: EnhancementTier) => Promise<void>
  currentBalance: number
  isProcessing: boolean
  completedVersions: Array<{ tier: EnhancementTier; url: string }>
}

const TIER_INFO = {
  TIER_1K: { label: "1K (1024px)", cost: 2, description: "Fast, good for previews" },
  TIER_2K: { label: "2K (2048px)", cost: 5, description: "Balanced quality and speed" },
  TIER_4K: { label: "4K (4096px)", cost: 10, description: "Maximum quality" },
}

export function EnhancementSettings({
  onEnhance,
  currentBalance,
  isProcessing,
  completedVersions,
}: EnhancementSettingsProps) {
  const [selectedTier, setSelectedTier] = useState<EnhancementTier>("TIER_2K")

  const handleEnhance = async () => {
    await onEnhance(selectedTier)
  }

  // Check if a version already exists for the selected tier
  const versionExists = completedVersions.some((v) => v.tier === selectedTier)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enhancement Settings</CardTitle>
        <CardDescription>
          Choose the quality tier for AI enhancement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={selectedTier}
          onValueChange={(value) => setSelectedTier(value as EnhancementTier)}
        >
          {(Object.keys(TIER_INFO) as EnhancementTier[]).map((tier) => {
            const info = TIER_INFO[tier]
            const canAfford = currentBalance >= info.cost

            return (
              <div key={tier} className="flex items-center space-x-2">
                <RadioGroupItem value={tier} id={tier} disabled={!canAfford} />
                <Label
                  htmlFor={tier}
                  className={`flex-1 cursor-pointer ${!canAfford ? "opacity-50" : ""}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{info.label}</p>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                    </div>
                    <p className="text-sm font-medium">
                      {info.cost} tokens
                      {!canAfford && (
                        <span className="text-destructive ml-2">(Insufficient)</span>
                      )}
                    </p>
                  </div>
                </Label>
              </div>
            )
          })}
        </RadioGroup>

        {versionExists && (
          <p className="text-sm text-muted-foreground">
            Note: A {TIER_INFO[selectedTier].label} version already exists. Creating another will use additional tokens.
          </p>
        )}

        <Button
          onClick={handleEnhance}
          disabled={isProcessing || currentBalance < TIER_INFO[selectedTier].cost}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enhancing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Enhance Image ({TIER_INFO[selectedTier].cost} tokens)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
