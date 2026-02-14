/**
 * Seed built-in permission templates
 *
 * Run: npx tsx prisma/seed-templates.ts
 */

import prisma from "@/lib/prisma";

const TEMPLATES = [
  {
    name: "viewer",
    displayName: "Viewer",
    description: "Read-only access to public content and navigation tools.",
    allowedCategories: ["gateway-meta", "auth", "blog", "learnit"],
    allowedTools: [] as string[],
    deniedTools: [] as string[],
    maxTokenBudget: 1000,
    maxApiCalls: 100,
    maxStorageMb: 0,
    isSystem: true,
  },
  {
    name: "code-editor",
    displayName: "Code Editor",
    description: "Access to codespace and app development tools.",
    allowedCategories: ["gateway-meta", "codespace", "apps", "auth", "create"],
    allowedTools: [] as string[],
    deniedTools: [] as string[],
    maxTokenBudget: 50000,
    maxApiCalls: 1000,
    maxStorageMb: 100,
    isSystem: true,
  },
  {
    name: "image-creator",
    displayName: "Image Creator",
    description: "Access to image generation and album management tools.",
    allowedCategories: ["gateway-meta", "image", "album-images", "album-management", "batch-enhance", "enhancement-jobs", "auth"],
    allowedTools: [] as string[],
    deniedTools: [] as string[],
    maxTokenBudget: 100000,
    maxApiCalls: 500,
    maxStorageMb: 500,
    isSystem: true,
  },
  {
    name: "full-workspace",
    displayName: "Full Workspace",
    description: "Full access to all tools except admin and vault.",
    allowedCategories: [
      "gateway-meta", "image", "codespace", "apps", "arena",
      "album-images", "album-management", "batch-enhance", "enhancement-jobs",
      "create", "learnit", "auth", "workspaces", "agents", "settings",
      "credits", "billing", "pipelines", "blog", "reports", "audio",
      "chat", "newsletter", "tts", "capabilities", "skill-store",
    ],
    allowedTools: [] as string[],
    deniedTools: [] as string[],
    maxTokenBudget: 500000,
    maxApiCalls: 5000,
    maxStorageMb: 1000,
    isSystem: true,
  },
];

export async function seedPermissionTemplates(): Promise<void> {
  for (const template of TEMPLATES) {
    await prisma.permissionTemplate.upsert({
      where: { name: template.name },
      update: {
        displayName: template.displayName,
        description: template.description,
        allowedCategories: template.allowedCategories,
        allowedTools: template.allowedTools,
        deniedTools: template.deniedTools,
        maxTokenBudget: template.maxTokenBudget,
        maxApiCalls: template.maxApiCalls,
        maxStorageMb: template.maxStorageMb,
        isSystem: template.isSystem,
      },
      create: template,
    });
  }
  console.log(`Seeded ${TEMPLATES.length} permission templates`);
}
