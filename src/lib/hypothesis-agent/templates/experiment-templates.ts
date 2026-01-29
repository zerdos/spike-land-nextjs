/**
 * Experiment Templates
 * Epic #516
 *
 * Pre-configured templates for common experiment types.
 */

import type { ExperimentTemplate } from "@/types/hypothesis-agent";

export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    id: "social-post-headline",
    name: "Social Post Headline Test",
    description: "Test different headlines for social media posts to maximize engagement",
    contentType: "social_post",
    category: "marketing",
    hypothesis: "Changing the headline will improve click-through rate",
    suggestedVariants: [
      {
        name: "Control",
        description: "Original headline",
        isControl: true,
      },
      {
        name: "Question Format",
        description: "Headline as a question to increase curiosity",
        isControl: false,
      },
      {
        name: "Benefit-Focused",
        description: "Headline emphasizing key benefit",
        isControl: false,
      },
    ],
    config: {
      significanceLevel: 0.95,
      minimumSampleSize: 200,
      winnerStrategy: "CONSERVATIVE",
      durationDays: 7,
    },
    tags: ["social", "headline", "engagement"],
  },
  {
    id: "cta-button-test",
    name: "CTA Button Test",
    description: "Test different call-to-action button text and styling",
    contentType: "generic",
    category: "product",
    hypothesis: "More action-oriented CTA text will increase conversions",
    suggestedVariants: [
      {
        name: "Control",
        description: "Current CTA",
        isControl: true,
      },
      {
        name: "Action-Oriented",
        description: "Strong action verb (e.g., 'Get Started Now')",
        isControl: false,
      },
      {
        name: "Value-Focused",
        description: "Emphasize value (e.g., 'Start Free Trial')",
        isControl: false,
      },
    ],
    config: {
      significanceLevel: 0.95,
      minimumSampleSize: 500,
      winnerStrategy: "ECONOMIC",
      durationDays: 14,
    },
    tags: ["cta", "conversion", "button"],
  },
];

export function getTemplate(templateId: string): ExperimentTemplate | null {
  return EXPERIMENT_TEMPLATES.find((t) => t.id === templateId) ?? null;
}

export function listTemplates(filters?: {
  category?: string;
  contentType?: string;
}): ExperimentTemplate[] {
  let templates = EXPERIMENT_TEMPLATES;

  if (filters?.category) {
    templates = templates.filter((t) => t.category === filters.category);
  }

  if (filters?.contentType) {
    templates = templates.filter((t) => t.contentType === filters.contentType);
  }

  return templates;
}
