/**
 * ImageGenerationDialog Component
 *
 * Main dialog for generating new images from text prompts with Brand Brain integration.
 * Part of #843: AI Image Generation for Posts
 */

"use client";

import { Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { AspectRatio } from "@/lib/ai/aspect-ratio";
import { SUPPORTED_ASPECT_RATIOS } from "@/lib/ai/aspect-ratio";
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

export interface ImageGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  brandProfile?: BrandProfileFormData | null;
  onImageGenerated?: (jobId: string, imageUrl?: string) => void;
}

const MAX_PROMPT_LENGTH = 4000;

const TIER_OPTIONS: { value: EnhancementTier; label: string; resolution: string }[] = [
  { value: "TIER_1K", label: "Standard (1024px)", resolution: "1024px" },
  { value: "TIER_2K", label: "High (2048px)", resolution: "2048px" },
  { value: "TIER_4K", label: "Ultra (4096px)", resolution: "4096px" },
];

const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  "1:1": "Square (1:1)",
  "3:2": "Landscape 3:2",
  "2:3": "Portrait 2:3",
  "3:4": "Portrait 3:4",
  "4:3": "Landscape 4:3",
  "4:5": "Portrait 4:5",
  "5:4": "Landscape 5:4",
  "9:16": "Portrait 9:16",
  "16:9": "Landscape 16:9",
  "21:9": "Ultra-wide 21:9",
};

export function ImageGenerationDialog({
  open,
  onOpenChange,
  workspaceId: _workspaceId,
  brandProfile,
  onImageGenerated,
}: ImageGenerationDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [tier, setTier] = useState<EnhancementTier>("TIER_1K");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [useBrandVoice, setUseBrandVoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBrandProfile = !!brandProfile;

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setPrompt("");
      setNegativePrompt("");
      setTier("TIER_1K");
      setAspectRatio("1:1");
      setUseBrandVoice(false);
      setIsLoading(false);
      setError(null);
    }
  }, [open]);

  const tokenCost = MCP_GENERATION_COSTS[tier];

  const handleGenerate = async () => {
    setError(null);

    // Validation
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      setError(`Prompt must be ${MAX_PROMPT_LENGTH} characters or less`);
      return;
    }

    setIsLoading(true);

    try {
      // Build brand-aware prompt if enabled
      const finalPrompt = useBrandVoice && brandProfile
        ? buildBrandAwarePrompt(prompt, brandProfile).enrichedPrompt
        : prompt;

      const response = await fetch("/api/mcp/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          tier,
          negativePrompt: negativePrompt.trim() || undefined,
          aspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError("Insufficient tokens. Please add more tokens to continue.");
        } else if (response.status === 429) {
          setError(`Rate limit exceeded. Please try again in ${data.retryAfter} seconds.`);
        } else {
          setError(data.error || "Failed to start image generation");
        }
        return;
      }

      // Success - return job ID
      if (onImageGenerated) {
        onImageGenerated(data.jobId);
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Error generating image:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="image-generation-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Image
          </DialogTitle>
          <DialogDescription>
            Create an AI-generated image from your text description
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error message */}
          {error && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="generation-error"
            >
              {error}
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt *</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              rows={4}
              maxLength={MAX_PROMPT_LENGTH}
              data-testid="prompt-input"
            />
            <p className="text-xs text-muted-foreground">
              {prompt.length} / {MAX_PROMPT_LENGTH} characters
            </p>
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
            <Textarea
              id="negative-prompt"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Things to avoid in the image..."
              rows={2}
              data-testid="negative-prompt-input"
            />
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

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={(value) => setAspectRatio(value as AspectRatio)}>
              <SelectTrigger id="aspect-ratio" data-testid="aspect-ratio-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {ASPECT_RATIO_LABELS[ratio]}
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
              Higher quality tiers produce sharper, more detailed images
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
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            data-testid="generate-button"
          >
            {isLoading ? "Generating..." : "Generate Image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
