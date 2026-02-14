const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All",
  QUALITY: "Quality",
  TESTING: "Testing",
  WORKFLOW: "Workflow",
  SECURITY: "Security",
  PERFORMANCE: "Performance",
  OTHER: "Other",
};

const CATEGORIES = [
  "ALL",
  "QUALITY",
  "TESTING",
  "WORKFLOW",
  "SECURITY",
  "PERFORMANCE",
  "OTHER",
] as const;

type SkillCategory = (typeof CATEGORIES)[number];

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export { CATEGORIES, CATEGORY_LABELS, getCategoryLabel };
export type { SkillCategory };
