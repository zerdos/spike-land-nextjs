"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Coins, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type EnhancementTier = "TIER_1K" | "TIER_2K" | "TIER_4K";

interface EnhanceAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albumName: string;
  imageCount: number;
  alreadyEnhancedCount: Record<EnhancementTier, number>;
  userBalance: number;
  onConfirm: (tier: EnhancementTier, skipAlreadyEnhanced: boolean) => void;
  isLoading?: boolean;
}

const TIER_INFO: Record<
  EnhancementTier,
  { label: string; cost: number; description: string; }
> = {
  TIER_1K: {
    label: "1K (1024px)",
    cost: 2,
    description: "Fast processing, good for previews",
  },
  TIER_2K: {
    label: "2K (2048px)",
    cost: 5,
    description: "Balanced quality and speed",
  },
  TIER_4K: {
    label: "4K (4096px)",
    cost: 10,
    description: "Maximum quality output",
  },
};

export function EnhanceAllDialog({
  open,
  onOpenChange,
  albumName,
  imageCount,
  alreadyEnhancedCount,
  userBalance,
  onConfirm,
  isLoading = false,
}: EnhanceAllDialogProps) {
  const [selectedTier, setSelectedTier] = useState<EnhancementTier>("TIER_2K");
  const [skipAlreadyEnhanced, setSkipAlreadyEnhanced] = useState(true);

  const costBreakdown = useMemo(() => {
    const tierCost = TIER_INFO[selectedTier].cost;
    const alreadyEnhanced = alreadyEnhancedCount[selectedTier];
    const rawImagesToEnhance = skipAlreadyEnhanced
      ? imageCount - alreadyEnhanced
      : imageCount;
    const imagesToEnhance = Math.max(0, rawImagesToEnhance);
    const totalCost = imagesToEnhance * tierCost;

    return {
      tierCost,
      alreadyEnhanced,
      imagesToEnhance,
      totalCost,
    };
  }, [selectedTier, imageCount, alreadyEnhancedCount, skipAlreadyEnhanced]);

  const hasInsufficientBalance = userBalance < costBreakdown.totalCost;
  const hasNoImagesToEnhance = costBreakdown.imagesToEnhance === 0;

  const handleConfirm = () => {
    onConfirm(selectedTier, skipAlreadyEnhanced);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enhance All Photos
          </DialogTitle>
          <DialogDescription>
            Batch enhance all photos in this album with AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{albumName}</p>
              <p className="text-sm text-muted-foreground">
                {imageCount} photo{imageCount !== 1 ? "s" : ""} in album
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Select Enhancement Tier
            </Label>
            <RadioGroup
              value={selectedTier}
              onValueChange={(value) => setSelectedTier(value as EnhancementTier)}
              className="space-y-2"
            >
              {(Object.keys(TIER_INFO) as EnhancementTier[]).map((tier) => {
                const info = TIER_INFO[tier];
                return (
                  <div
                    key={tier}
                    className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={tier} id={`tier-${tier}`} />
                    <Label
                      htmlFor={`tier-${tier}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{info.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {info.description}
                          </p>
                        </div>
                        <span className="text-sm font-medium">
                          {info.cost} tokens/image
                        </span>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="skip-enhanced"
              checked={skipAlreadyEnhanced}
              onCheckedChange={(checked) => setSkipAlreadyEnhanced(checked === true)}
            />
            <Label htmlFor="skip-enhanced" className="text-sm cursor-pointer">
              Skip already enhanced at this tier
              {costBreakdown.alreadyEnhanced > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({costBreakdown.alreadyEnhanced}{" "}
                  photo{costBreakdown.alreadyEnhanced !== 1 ? "s" : ""})
                </span>
              )}
            </Label>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Cost Breakdown</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Images to enhance:
                </span>
                <span>{costBreakdown.imagesToEnhance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost per image:</span>
                <span>{costBreakdown.tierCost} tokens</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-medium">
                <span>Total cost:</span>
                <span>{costBreakdown.totalCost} tokens</span>
              </div>
            </div>
          </div>

          <div
            className={`flex items-center justify-between p-3 rounded-lg ${
              hasInsufficientBalance
                ? "bg-destructive/10 border border-destructive/20"
                : "bg-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <Coins
                className={`h-5 w-5 ${
                  hasInsufficientBalance
                    ? "text-destructive"
                    : "text-yellow-500"
                }`}
              />
              <span className="text-sm font-medium">Your Balance</span>
            </div>
            <span
              className={`font-bold ${hasInsufficientBalance ? "text-destructive" : ""}`}
            >
              {userBalance} tokens
            </span>
          </div>

          {hasInsufficientBalance && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Insufficient Balance
                </p>
                <p className="text-sm text-muted-foreground">
                  You need {costBreakdown.totalCost - userBalance}{" "}
                  more tokens to enhance all photos.
                </p>
              </div>
            </div>
          )}

          {hasNoImagesToEnhance && !hasInsufficientBalance && (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                All photos have already been enhanced at the {TIER_INFO[selectedTier].label} tier.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || hasInsufficientBalance ||
              hasNoImagesToEnhance}
          >
            {isLoading
              ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              )
              : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enhance {costBreakdown.imagesToEnhance}{" "}
                  Photo{costBreakdown.imagesToEnhance !== 1 ? "s" : ""}
                </>
              )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
