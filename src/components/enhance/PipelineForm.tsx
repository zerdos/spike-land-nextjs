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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  AnalysisConfig,
  AutoCropConfig,
  GenerationConfig,
  PromptConfig,
  ReferenceImage,
} from "@/lib/ai/pipeline-types";
import { SYSTEM_DEFAULT_PIPELINE } from "@/lib/ai/pipeline-types";
import type { EnhancementTier, PipelineVisibility } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ReferenceImageUpload } from "./ReferenceImageUpload";

interface PipelineFormData {
  name: string;
  description: string;
  tier: EnhancementTier;
  visibility: PipelineVisibility;
  analysisConfig: AnalysisConfig;
  autoCropConfig: AutoCropConfig;
  promptConfig: PromptConfig;
  generationConfig: GenerationConfig;
}

interface PipelineFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<PipelineFormData> & { id?: string; };
  onSubmit: (data: PipelineFormData) => Promise<void>;
  mode: "create" | "edit" | "fork";
}

const DEFAULT_FORM_DATA: PipelineFormData = {
  name: "",
  description: "",
  tier: "TIER_2K",
  visibility: "PRIVATE",
  analysisConfig: SYSTEM_DEFAULT_PIPELINE.analysis,
  autoCropConfig: SYSTEM_DEFAULT_PIPELINE.autoCrop,
  promptConfig: SYSTEM_DEFAULT_PIPELINE.prompt,
  generationConfig: SYSTEM_DEFAULT_PIPELINE.generation,
};

export function PipelineForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  mode,
}: PipelineFormProps) {
  const [formData, setFormData] = useState<PipelineFormData>(() => ({
    ...DEFAULT_FORM_DATA,
    ...initialData,
    name: mode === "fork" ? `${initialData?.name || ""} (Copy)` : initialData?.name || "",
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof PipelineFormData>(
    field: K,
    value: PipelineFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const title = {
    create: "Create Pipeline",
    edit: "Edit Pipeline",
    fork: "Fork Pipeline",
  }[mode];

  const description = {
    create: "Create a new enhancement pipeline configuration",
    edit: "Update your pipeline settings",
    fork: "Create your own copy of this pipeline",
  }[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="My Enhancement Pipeline"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe what this pipeline is optimized for..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Tier & Visibility */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(v) => updateField("tier", v as EnhancementTier)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TIER_1K">1K (1024px) - 2 tokens</SelectItem>
                    <SelectItem value="TIER_2K">2K (2048px) - 5 tokens</SelectItem>
                    <SelectItem value="TIER_4K">4K (4096px) - 10 tokens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(v) => updateField("visibility", v as PipelineVisibility)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">Private (only you)</SelectItem>
                    <SelectItem value="PUBLIC">Public (visible to all)</SelectItem>
                    <SelectItem value="LINK">Unlisted (via link)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Pipeline Stages */}
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="autocrop">Auto-Crop</TabsTrigger>
                <TabsTrigger value="prompt">Prompt</TabsTrigger>
                <TabsTrigger value="generation">Generation</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Enable Analysis</Label>
                    <p className="text-xs text-muted-foreground">
                      AI analyzes the image to detect defects
                    </p>
                  </div>
                  <Checkbox
                    checked={formData.analysisConfig.enabled}
                    onCheckedChange={(checked) =>
                      updateField("analysisConfig", {
                        ...formData.analysisConfig,
                        enabled: checked === true,
                      })}
                  />
                </div>
                {formData.analysisConfig.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <div className="space-y-2">
                      <Label className="text-sm">Temperature</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[formData.analysisConfig.temperature ?? 0.1]}
                          onValueChange={([v]) =>
                            updateField("analysisConfig", {
                              ...formData.analysisConfig,
                              temperature: v,
                            })}
                          min={0}
                          max={1}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-sm w-8 text-right">
                          {formData.analysisConfig.temperature ?? 0.1}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lower values = more consistent results
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="autocrop" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Enable Auto-Crop</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically crop detected problem areas
                    </p>
                  </div>
                  <Checkbox
                    checked={formData.autoCropConfig.enabled}
                    onCheckedChange={(checked) =>
                      updateField("autoCropConfig", {
                        ...formData.autoCropConfig,
                        enabled: checked === true,
                      })}
                  />
                </div>
                {formData.autoCropConfig.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Remove Black Bars</Label>
                        <p className="text-xs text-muted-foreground">
                          Crop black bars from edges
                        </p>
                      </div>
                      <Checkbox
                        checked={formData.autoCropConfig.allowBlackBarRemoval ?? true}
                        onCheckedChange={(checked) =>
                          updateField("autoCropConfig", {
                            ...formData.autoCropConfig,
                            allowBlackBarRemoval: checked === true,
                          })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Remove UI Elements</Label>
                        <p className="text-xs text-muted-foreground">
                          Crop out UI overlays and watermarks
                        </p>
                      </div>
                      <Checkbox
                        checked={formData.autoCropConfig.allowUIElementCrop ?? true}
                        onCheckedChange={(checked) =>
                          updateField("autoCropConfig", {
                            ...formData.autoCropConfig,
                            allowUIElementCrop: checked === true,
                          })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Minimum Crop Ratio</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[(formData.autoCropConfig.minCropRatio ?? 0.05) * 100]}
                          onValueChange={(values) => {
                            const v = values[0] ?? 5;
                            updateField("autoCropConfig", {
                              ...formData.autoCropConfig,
                              minCropRatio: v / 100,
                            });
                          }}
                          min={1}
                          max={20}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm w-12 text-right">
                          {((formData.autoCropConfig.minCropRatio ?? 0.05) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Minimum amount to crop before applying
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="prompt" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custom Instructions</Label>
                  <Textarea
                    value={formData.promptConfig.customInstructions ?? ""}
                    onChange={(e) =>
                      updateField("promptConfig", {
                        ...formData.promptConfig,
                        customInstructions: e.target.value || undefined,
                      })}
                    placeholder="Add custom enhancement instructions (e.g., 'Preserve film grain', 'Enhance faces')..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional instructions appended to the AI prompt
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Skip Corrections</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Disable automatic correction for specific defects
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: "isDark", label: "Dark images" },
                        { key: "isBlurry", label: "Blurry images" },
                        { key: "hasNoise", label: "Noise/grain" },
                        { key: "hasVHSArtifacts", label: "VHS artifacts" },
                        { key: "isLowResolution", label: "Low resolution" },
                        { key: "isOverexposed", label: "Overexposed" },
                        { key: "hasColorCast", label: "Color cast" },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={key}
                          checked={formData.promptConfig.skipCorrections?.includes(key) ?? false}
                          onCheckedChange={(checked) => {
                            const current = formData.promptConfig.skipCorrections ?? [];
                            const updated = checked
                              ? [...current, key]
                              : current.filter((k) => k !== key);
                            updateField("promptConfig", {
                              ...formData.promptConfig,
                              skipCorrections: updated.length > 0 ? updated : undefined,
                            });
                          }}
                        />
                        <Label htmlFor={key} className="text-sm font-normal">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Reference Images - only available when editing existing pipeline */}
                {initialData?.id
                  ? (
                    <ReferenceImageUpload
                      pipelineId={initialData.id}
                      referenceImages={formData.promptConfig.referenceImages ?? []}
                      onImagesChange={(images: ReferenceImage[]) =>
                        updateField("promptConfig", {
                          ...formData.promptConfig,
                          referenceImages: images.length > 0 ? images : undefined,
                        })}
                      disabled={isSubmitting}
                    />
                  )
                  : (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Reference Images
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Reference images can be added after creating the pipeline. Edit your
                        pipeline to add style guidance images.
                      </p>
                    </div>
                  )}
              </TabsContent>

              <TabsContent value="generation" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Retry Attempts</Label>
                  <RadioGroup
                    value={String(formData.generationConfig.retryAttempts ?? 3)}
                    onValueChange={(v) =>
                      updateField("generationConfig", {
                        ...formData.generationConfig,
                        retryAttempts: parseInt(v),
                      })}
                    className="flex gap-4"
                  >
                    {[1, 2, 3, 5].map((n) => (
                      <div key={n} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(n)} id={`retry-${n}`} />
                        <Label htmlFor={`retry-${n}`} className="font-normal">
                          {n}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Number of retry attempts if generation fails
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Generation Temperature</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[formData.generationConfig.temperature ?? 0.7]}
                      onValueChange={([v]) =>
                        updateField("generationConfig", {
                          ...formData.generationConfig,
                          temperature: v,
                        })}
                      min={0}
                      max={1}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-sm w-8 text-right">
                      {formData.generationConfig.temperature ?? 0.7}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Higher values = more creative, lower = more consistent
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create"
                ? "Create Pipeline"
                : mode === "edit"
                ? "Save Changes"
                : "Create Fork"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
