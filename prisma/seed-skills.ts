import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local", quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedSkills() {
  console.log("Seeding skills...");

  const skill = await prisma.skill.upsert({
    where: { slug: "bazdmeg" },
    update: {
      displayName: "BAZDMEG Method",
      description:
        "Seven principles for AI-assisted development. Born from pain. Tested in production.",
      longDescription: `# BAZDMEG Method

The BAZDMEG method is a quality-first framework for AI-assisted software development. It provides structured checkpoints, planning interviews, and testing models that ensure AI-generated code meets production standards.

## Why BAZDMEG?

When AI writes your code, discipline becomes your only competitive advantage. BAZDMEG enforces quality gates at three critical phases:

1. **Pre-Code** - Requirements validation and planning interview
2. **Post-Code** - Code review checklist and test verification
3. **Pre-PR** - Final audit before merge

## The Seven Principles

1. Requirements Are The Product
2. Discipline Before Automation
3. Context Is Architecture
4. Test The Lies
5. Orchestrate, Do Not Operate
6. Trust Is Earned In PRs
7. Own What You Ship`,
      category: "QUALITY",
      status: "PUBLISHED",
      version: "1.0.0",
      author: "Spike Land",
      authorUrl: "https://spike.land",
      repoUrl: "https://github.com/zerdos/spike-land-nextjs",
      color: "#F59E0B",
      tags: ["quality", "testing", "ai-development", "claude-code"],
      isActive: true,
      isFeatured: true,
    },
    create: {
      name: "bazdmeg",
      slug: "bazdmeg",
      displayName: "BAZDMEG Method",
      description:
        "Seven principles for AI-assisted development. Born from pain. Tested in production.",
      longDescription: `# BAZDMEG Method

The BAZDMEG method is a quality-first framework for AI-assisted software development. It provides structured checkpoints, planning interviews, and testing models that ensure AI-generated code meets production standards.

## Why BAZDMEG?

When AI writes your code, discipline becomes your only competitive advantage. BAZDMEG enforces quality gates at three critical phases:

1. **Pre-Code** - Requirements validation and planning interview
2. **Post-Code** - Code review checklist and test verification
3. **Pre-PR** - Final audit before merge

## The Seven Principles

1. Requirements Are The Product
2. Discipline Before Automation
3. Context Is Architecture
4. Test The Lies
5. Orchestrate, Do Not Operate
6. Trust Is Earned In PRs
7. Own What You Ship`,
      category: "QUALITY",
      status: "PUBLISHED",
      version: "1.0.0",
      author: "Spike Land",
      authorUrl: "https://spike.land",
      repoUrl: "https://github.com/zerdos/spike-land-nextjs",
      color: "#F59E0B",
      tags: ["quality", "testing", "ai-development", "claude-code"],
      isActive: true,
      isFeatured: true,
    },
  });

  console.log(`Upserted skill: ${skill.displayName} (${skill.id})`);

  const features = [
    {
      title: "Planning Interview",
      description:
        "7-question workflow that extracts real requirements before any code is written",
      icon: "MessageSquare",
      sortOrder: 0,
    },
    {
      title: "3 Quality Gate Checklists",
      description:
        "Pre-code, post-code, and pre-PR checklists that catch AI slop before it ships",
      icon: "CheckSquare",
      sortOrder: 1,
    },
    {
      title: "Hourglass Testing Model",
      description:
        "80% unit / 15% integration / 5% E2E testing strategy optimized for AI-generated code",
      icon: "Timer",
      sortOrder: 2,
    },
    {
      title: "Automation-Ready Audit",
      description:
        "Structured audit trail for every AI-generated change with traceability to requirements",
      icon: "ShieldCheck",
      sortOrder: 3,
    },
    {
      title: "7 Deep-Dive References",
      description:
        "Complete principle breakdowns with real-world examples and anti-patterns",
      icon: "BookOpen",
      sortOrder: 4,
    },
  ];

  for (const feature of features) {
    await prisma.skillFeature.upsert({
      where: {
        id: `${skill.id}-feature-${feature.sortOrder}`,
      },
      update: {
        title: feature.title,
        description: feature.description,
        icon: feature.icon,
        sortOrder: feature.sortOrder,
      },
      create: {
        id: `${skill.id}-feature-${feature.sortOrder}`,
        skillId: skill.id,
        title: feature.title,
        description: feature.description,
        icon: feature.icon,
        sortOrder: feature.sortOrder,
      },
    });
    console.log(`  Upserted feature: ${feature.title}`);
  }

  console.log("Skill seeding complete!");
}

seedSkills()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
