/**
 * ImageEnhancementDialog Component
 *
 * Dialog for enhancing existing images with AI modifications and Brand Brain integration.
 * Part of #843: AI Image Generation for Posts
 */

"use client";

import { ImagePlus, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { EnhancementTier } from "@/lib/tokens/costs";
import { MCP_GENERATION_COSTS } from "@/lib/tokens/costs";
import type { BrandProfileFormData } from "@/lib/validations/brand-brain";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { buildBrandAwarePrompt } from "./BrandImagePromptBuilder";

export interface ImageEnhancementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  imageUrl?: string; // URL of image to enhance
  imageBase64?: string; // Or base64 encoded image
  imageMimeType?: string; // MIME type for base64 images
  brandProfile?: BrandProfileFormData | null;
  onImageEnhanced?: (jobId: string, imageUrl?: string) => void;
}

const MAX_PROMPT_LENGTH = 4000;

const TIER_OPTIONS: { value: EnhancementTier; label: string; resolution: string }[] = [
  { value: "TIER_1K", label: "Standard (1024px)", resolution: "1024px" },
  { value: "TIER_2K", label: "High (2048px)", resolution: "2048px" },
  { value: "TIER_4K", label: "Ultra (4096px)", resolution: "4096px" },
];

export function ImageEnhancementDialog({
  open,
  onOpenChange,
  workspaceId: _workspaceId,
  imageUrl,
  imageBase64,
  imageMimeType,
  brandProfile,
  onImageEnhanced,
}: ImageEnhancementDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState<EnhancementTier>("TIER_1K");
  const [useBrandVoice, setUseBrandVoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBrandProfile = !!brandProfile;
  const hasImage = !!(imageUrl || imageBase64);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setPrompt("");
      setTier("TIER_1K");
      setUseBrandVoice(false);
      setIsLoading(false);
      setError(null);
    }
  }, [open]);

  const tokenCost = MCP_GENERATION_COSTS[tier];

  const handleEnhance = async () => {
    setError(null);

    // Validation
    if (!hasImage) {
      setError("No image provided");
      return;
    }

    if (!prompt.trim()) {
      setError("Please enter enhancement instructions");
      return;
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      setError(`Prompt must be ${MAX_PROMPT_LENGTH} characters or less`);
      return;
    }

    // If using base64, ensure mimeType is provided
    if (imageBase64 && !imageMimeType) {
      setError("Image MIME type is required for base64 images");
      return;
    }

    setIsLoading(true);

    try {
      // Build brand-aware prompt if enabled
      const finalPrompt = useBrandVoice && brandProfile
        ? buildBrandAwarePrompt(prompt, brandProfile).enrichedPrompt
        : prompt;

      const requestBody: {
        prompt: string;
        tier: string;
        imageUrl?: string;
        image?: string;
        mimeType?: string;
      } = {
        prompt: finalPrompt,
        tier,
      };

      // Add image data
      if (imageUrl) {
        requestBody.imageUrl = imageUrl;
      } else if (imageBase64) {
        requestBody.image = imageBase64;
        requestBody.mimeType = imageMimeType;
      }

      const response = await fetch("/api/mcp/modify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError("Insufficient tokens. Please add more tokens to continue.");
        } else if (response.status === 429) {
          setError(`Rate limit exceeded. Please try again in ${data.retryAfter} seconds.`);
        } else {
          setError(data.error || "Failed to start image enhancement");
        }
        return;
      }

      // Success - return job ID
      if (onImageEnhanced) {
        onImageEnhanced(data.jobId);
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Error enhancing image:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="image-enhancement-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-primary" />
            Enhance Image
          </DialogTitle>
          <DialogDescription>
            Modify and enhance your image with AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error message */}
          {error && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="enhancement-error"
            >
              {error}
            </div>
          )}

          {/* Image Preview */}
          {imageUrl && (
            <div className="space-y-2">
              <Label>Original Image</Label>
              <div className="relative overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Original"
                  className="max-h-48 w-full object-contain"
                  data-testid="image-preview"
                />
              </div>
            </div>
          )}

          {/* Enhancement Prompt */}
          <div className="space-y-2">
            <Label htmlFor="enhancement-prompt">Enhancement Instructions *</Label>
            <Textarea
              id="enhancement-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want to enhance this image..."
              rows={4}
              maxLength={MAX_PROMPT_LENGTH}
              data-testid="enhancement-prompt-input"
            />
            <p className="text-xs text-muted-foreground">
              {prompt.length} / {MAX_PROMPT_LENGTH} characters
            </p>
          </div>

          {/* Tier Selection */}
          <div className="space-y-2">
            <Label htmlFor="tier">Quality Tier</Label>
            <Select value={tier} onValueChange={(value) => setTier(value as EnhancementTier)}>
              <SelectTrigger id="tier" data-testid="tier-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} - {MCP_GENERATION_COSTS[option.value]} tokens
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Voice Toggle */}
          <div
            className={cn(
              "flex items-center justify-between rounded-lg border p-3",
              hasBrandProfile ? "border-muted" : "border-muted bg-muted/30"
            )}
          >
            <div className="flex-1">
              <Label htmlFor="use-brand-voice" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Use Brand Voice
              </Label>
              <p className="text-xs text-muted-foreground">
                {hasBrandProfile
                  ? "Enhance prompt with brand settings"
                  : "Configure Brand Brain to enable"}
              </p>
            </div>
            <Switch
              id="use-brand-voice"
              checked={useBrandVoice}
              onCheckedChange={setUseBrandVoice}
              disabled={!hasBrandProfile}
              data-testid="brand-voice-toggle"
            />
          </div>

          {/* Token Cost Display */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">Cost: {tokenCost} tokens</p>
            <p className="text-xs text-muted-foreground">
              Higher quality tiers produce sharper, more detailed enhancements
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEnhance}
            disabled={isLoading || !prompt.trim() || !hasImage}
            data-testid="enhance-button"
          >
            {isLoading ? "Enhancing..." : "Enhance Image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
