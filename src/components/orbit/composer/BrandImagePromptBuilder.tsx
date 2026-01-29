/**
 * BrandImagePromptBuilder Component
 *
 * Enriches user prompts with Brand Brain settings to create brand-aware image generation prompts.
 * Part of #843: AI Image Generation for Posts
 */

"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import type {
  BrandProfileFormData,
  ToneDescriptors,
} from "@/lib/validations/brand-brain";

export interface BrandImagePromptBuilderProps {
  userPrompt: string;
  brandProfile?: BrandProfileFormData | null;
  children?: (enrichedPrompt: string, brandAttributes: string[]) => ReactNode;
}

/**
 * Describes tone from tone descriptors as a comma-separated string
 */
function describeTone(toneDescriptors: ToneDescriptors): string {
  const {
    formalCasual,
    technicalSimple,
    seriousPlayful,
    reservedEnthusiastic,
  } = toneDescriptors;

  const tone: string[] = [];

  if (formalCasual < 40) tone.push("formal");
  else if (formalCasual > 60) tone.push("casual");

  if (technicalSimple < 40) tone.push("technical");
  else if (technicalSimple > 60) tone.push("simple");

  if (seriousPlayful < 40) tone.push("serious");
  else if (seriousPlayful > 60) tone.push("playful");

  if (reservedEnthusiastic < 40) tone.push("reserved");
  else if (reservedEnthusiastic > 60) tone.push("enthusiastic");

  return tone.join(", ") || "balanced";
}

/**
 * Builds a brand-aware prompt by enriching user input with Brand Brain settings
 */
export function buildBrandAwarePrompt(
  userPrompt: string,
  brandProfile?: BrandProfileFormData | null
): { enrichedPrompt: string; brandAttributes: string[] } {
  if (!brandProfile) {
    return {
      enrichedPrompt: userPrompt,
      brandAttributes: [],
    };
  }

  const enrichments: string[] = [];
  const attributes: string[] = [];

  // Add tone descriptors
  if (brandProfile.toneDescriptors) {
    const tone = describeTone(brandProfile.toneDescriptors);
    if (tone !== "balanced") {
      enrichments.push(`Style: ${tone}`);
      attributes.push(`Tone: ${tone}`);
    }
  }

  // Add color palette
  if (brandProfile.colorPalette && brandProfile.colorPalette.length > 0) {
    const colors = brandProfile.colorPalette
      .slice(0, 5) // Limit to top 5 colors to avoid overwhelming the prompt
      .map((c) => `${c.name} (${c.hex})`)
      .join(", ");
    enrichments.push(`Brand colors: ${colors}`);
    attributes.push(`Colors: ${brandProfile.colorPalette.length} defined`);
  }

  // Add brand values for thematic consistency
  if (brandProfile.values && brandProfile.values.length > 0) {
    const values = brandProfile.values.slice(0, 5).join(", ");
    enrichments.push(`Themes: ${values}`);
    attributes.push(`Values: ${brandProfile.values.join(", ")}`);
  }

  if (enrichments.length === 0) {
    return {
      enrichedPrompt: userPrompt,
      brandAttributes: [],
    };
  }

  return {
    enrichedPrompt: `${userPrompt}\n\n${enrichments.join("\n")}`,
    brandAttributes: attributes,
  };
}

/**
 * Component that enriches prompts with Brand Brain data
 * Uses render props pattern to provide enriched prompt and attributes
 */
export function BrandImagePromptBuilder({
  userPrompt,
  brandProfile,
  children,
}: BrandImagePromptBuilderProps) {
  const { enrichedPrompt, brandAttributes } = useMemo(
    () => buildBrandAwarePrompt(userPrompt, brandProfile),
    [userPrompt, brandProfile]
  );

  if (!children) {
    return null;
  }

  return <>{children(enrichedPrompt, brandAttributes)}</>;
}
