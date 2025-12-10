"use client";

import { PurchaseModal } from "@/components/tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { EnhancementTier } from "@prisma/client";
import { AlertTriangle, Coins, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

interface EnhancementSettingsProps {
  onEnhance: (tier: EnhancementTier) => Promise<void>;
  currentBalance: number;
  isProcessing: boolean;
  completedVersions: Array<{ tier: EnhancementTier; url: string; }>;
  onBalanceRefresh?: () => void;
  asCard?: boolean;
}

const TIER_INFO = {
  TIER_1K: { label: "1K (1024px)", cost: 2, description: "Fast, good for previews" },
  TIER_2K: { label: "2K (2048px)", cost: 5, description: "Balanced quality and speed" },
  TIER_4K: { label: "4K (4096px)", cost: 10, description: "Maximum quality" },
};

export function EnhancementSettings({
  onEnhance,
  currentBalance,
  isProcessing,
  completedVersions,
  onBalanceRefresh,
  asCard = true,
}: EnhancementSettingsProps) {
  const [selectedTier, setSelectedTier] = useState<EnhancementTier>("TIER_2K");

  const handleEnhance = async () => {
    await onEnhance(selectedTier);
  };

  // Check if a version already exists for the selected tier
  const versionExists = completedVersions.some((v) => v.tier === selectedTier);

  // Check if user has enough tokens for the selected tier
  const tierCost = TIER_INFO[selectedTier].cost;
  const hasEnoughTokens = currentBalance >= tierCost;

  const content = (
    <div className="space-y-6">
      {asCard && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Your Balance</span>
          </div>
          <span className="text-lg font-bold">{currentBalance} tokens</span>
        </div>
      )}

      {!hasEnoughTokens && (
        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Insufficient Tokens</p>
              <p className="text-sm text-muted-foreground">
                You need {tierCost} tokens but only have {currentBalance}
              </p>
            </div>
          </div>
          <PurchaseModal
            trigger={
              <Button size="sm" variant="destructive" className="w-full mt-2">
                <Coins className="mr-2 h-4 w-4" />
                Get Tokens
              </Button>
            }
            onPurchaseComplete={onBalanceRefresh}
          />
        </div>
      )}

      <div>
        {!asCard && <h3 className="text-sm font-medium mb-3">Enhancement Settings</h3>}
        <RadioGroup
          value={selectedTier}
          onValueChange={(value) => setSelectedTier(value as EnhancementTier)}
        >
          {(Object.keys(TIER_INFO) as EnhancementTier[]).map((tier) => {
            const info = TIER_INFO[tier];
            const canAfford = currentBalance >= info.cost;

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
                    </div>
                    <p className="text-sm font-medium">
                      {info.cost} tokens
                      {!canAfford && <span className="text-destructive ml-2">(Insufficient)</span>}
                    </p>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {versionExists && (
        <p className="text-sm text-muted-foreground">
          Note: A {TIER_INFO[selectedTier].label}{" "}
          version already exists. Creating another will use additional tokens.
        </p>
      )}

      <Button
        onClick={handleEnhance}
        disabled={isProcessing || currentBalance < TIER_INFO[selectedTier].cost}
        className="w-full"
      >
        {isProcessing
          ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enhancing...
            </>
          )
          : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Enhance Image ({TIER_INFO[selectedTier].cost} tokens)
            </>
          )}
      </Button>
    </div>
  );

  if (!asCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enhancement Settings</CardTitle>
        <CardDescription>
          Choose the quality tier for AI enhancement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
