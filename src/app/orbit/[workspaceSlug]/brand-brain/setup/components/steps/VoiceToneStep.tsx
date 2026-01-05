"use client";

import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import type { BrandProfileFormData } from "@/lib/validations/brand-brain";
import { VOICE_DIMENSION_LABELS, VOICE_DIMENSIONS } from "@/lib/validations/brand-brain";
import { useFormContext } from "react-hook-form";
import { VoiceSlider } from "../ui/VoiceSlider";

interface VoiceToneStepProps {
  disabled?: boolean;
}

export function VoiceToneStep({ disabled = false }: VoiceToneStepProps) {
  const form = useFormContext<BrandProfileFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Voice & Tone</h2>
        <p className="text-sm text-muted-foreground">
          Define how your brand communicates. Adjust the sliders to set your brand&apos;s voice
          characteristics.
        </p>
      </div>

      <div className="space-y-8">
        {VOICE_DIMENSIONS.map((dimension) => {
          const labels = VOICE_DIMENSION_LABELS[dimension];
          return (
            <FormField
              key={dimension}
              control={form.control}
              name={`toneDescriptors.${dimension}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">
                    {labels.left} to {labels.right}
                  </FormLabel>
                  <FormControl>
                    <VoiceSlider
                      leftLabel={labels.left}
                      rightLabel={labels.right}
                      value={field.value ?? 50}
                      onChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {getVoiceDescription(dimension, field.value ?? 50)}
                  </FormDescription>
                </FormItem>
              )}
            />
          );
        })}
      </div>

      {/* Voice Preview */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="mb-2 font-medium">Voice Preview</h3>
        <p className="text-sm text-muted-foreground">
          Based on your settings, your brand voice is <VoiceSummary form={form} />.
        </p>
      </div>
    </div>
  );
}

function VoiceSummary(
  { form }: { form: ReturnType<typeof useFormContext<BrandProfileFormData>>; },
) {
  const toneDescriptors = form.watch("toneDescriptors");

  if (!toneDescriptors) {
    return <span>balanced and neutral</span>;
  }

  const descriptors: string[] = [];

  // Formal/Casual
  if (toneDescriptors.formalCasual < 30) {
    descriptors.push("formal");
  } else if (toneDescriptors.formalCasual > 70) {
    descriptors.push("casual");
  }

  // Technical/Simple
  if (toneDescriptors.technicalSimple < 30) {
    descriptors.push("technical");
  } else if (toneDescriptors.technicalSimple > 70) {
    descriptors.push("simple");
  }

  // Serious/Playful
  if (toneDescriptors.seriousPlayful < 30) {
    descriptors.push("serious");
  } else if (toneDescriptors.seriousPlayful > 70) {
    descriptors.push("playful");
  }

  // Reserved/Enthusiastic
  if (toneDescriptors.reservedEnthusiastic < 30) {
    descriptors.push("reserved");
  } else if (toneDescriptors.reservedEnthusiastic > 70) {
    descriptors.push("enthusiastic");
  }

  if (descriptors.length === 0) {
    return <span>balanced and adaptable</span>;
  }

  return <span className="font-medium">{descriptors.join(", ")}</span>;
}

function getVoiceDescription(dimension: string, value: number): string {
  switch (dimension) {
    case "formalCasual":
      if (value < 30) return "Professional language with proper titles and structure";
      if (value > 70) return "Friendly, conversational tone like talking to a colleague";
      return "Balanced mix of professional and approachable";

    case "technicalSimple":
      if (value < 30) return "Industry jargon and detailed technical explanations";
      if (value > 70) return "Plain language anyone can understand";
      return "Technical when needed, simple when possible";

    case "seriousPlayful":
      if (value < 30) return "Focused and business-like communication";
      if (value > 70) return "Light-hearted with occasional humor";
      return "Professional but not stiff";

    case "reservedEnthusiastic":
      if (value < 30) return "Measured and understated expressions";
      if (value > 70) return "Energetic and expressive communication";
      return "Confident without being over-the-top";

    default:
      return "";
  }
}
