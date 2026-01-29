"use client";

/**
 * Dialog for creating new A/B tests
 *
 * Allows users to select content, choose variation types, and generate AI variations.
 * Resolves #840
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VariationType } from "@/types/ab-test";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateAbTestDialogProps {
  workspaceSlug: string;
}

const VARIATION_TYPES: { value: VariationType; label: string }[] = [
  { value: "headline", label: "Headline" },
  { value: "cta", label: "Call to Action" },
  { value: "emoji", label: "Emoji" },
  { value: "hashtags", label: "Hashtags" },
  { value: "tone", label: "Tone" },
];

export function CreateAbTestDialog({ workspaceSlug }: CreateAbTestDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedVariations, setGeneratedVariations] = useState<
    { type: VariationType; content: string }[]
  >([]);

  const handleGenerateVariations = async () => {
    if (!originalContent || variationTypes.length === 0) {
      toast.error("Please enter content and select at least one variation type");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/ab-tests/generate-variations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalContent,
            variationTypes,
            count: 2,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate variations");
      }

      const data = await response.json();
      setGeneratedVariations(data.variations);
      toast.success("Variations generated successfully");
    } catch (error) {
      console.error("Failed to generate variations:", error);
      toast.error("Failed to generate variations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    if (!name || generatedVariations.length < 2) {
      toast.error("Please provide a name and generate at least 2 variations");
      return;
    }

    setLoading(true);
    try {
      // Note: In a real implementation, we would need an originalPostId
      // For now, this is a placeholder
      const response = await fetch(`/api/orbit/${workspaceSlug}/ab-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          originalPostId: "placeholder", // Would be selected from existing posts
          significanceLevel: 0.95,
          variants: generatedVariations,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create test");
      }

      toast.success("A/B test created successfully");
      setOpen(false);
      // Reset form
      setName("");
      setOriginalContent("");
      setVariationTypes([]);
      setGeneratedVariations([]);
      // Refresh the page to show new test
      window.location.reload();
    } catch (error) {
      console.error("Failed to create test:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create test"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleVariationType = (type: VariationType) => {
    setVariationTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create A/B Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create A/B Test</DialogTitle>
          <DialogDescription>
            Generate variations of your content to test what performs best
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Test Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Test Name</Label>
            <Input
              id="name"
              placeholder="e.g., Summer Campaign Headline Test"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Original Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Original Content</Label>
            <Textarea
              id="content"
              placeholder="Enter the content you want to test..."
              value={originalContent}
              onChange={(e) => setOriginalContent(e.target.value)}
              rows={4}
            />
          </div>

          {/* Variation Types */}
          <div className="space-y-2">
            <Label>Variation Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {VARIATION_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.value}
                    checked={variationTypes.includes(type.value)}
                    onCheckedChange={() => toggleVariationType(type.value)}
                  />
                  <label
                    htmlFor={type.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateVariations}
            disabled={loading || !originalContent || variationTypes.length === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Variations"
            )}
          </Button>

          {/* Generated Variations Preview */}
          {generatedVariations.length > 0 && (
            <div className="space-y-2">
              <Label>Generated Variations ({generatedVariations.length})</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {generatedVariations.map((variation, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-md bg-muted/50"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {variation.type}
                    </div>
                    <div className="text-sm">{variation.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Test Button */}
          {generatedVariations.length > 0 && (
            <Button
              onClick={handleCreateTest}
              disabled={loading || !name}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Test"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
