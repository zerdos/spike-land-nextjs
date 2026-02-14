/**
 * Arena seed script - run with: npx tsx src/lib/arena/seed.ts
 */
import { config } from "dotenv";
import logger from "@/lib/logger";
config({ path: ".env.local" });

async function seed() {
  // Dynamic import so dotenv runs before prisma reads DATABASE_URL
  const { default: prisma } = await import("@/lib/prisma");

  let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    // Fall back to any user if no admin exists
    admin = await prisma.user.findFirst();
  }
  if (!admin) {
    logger.info("No users found in database");
    process.exit(1);
  }
  logger.info(`Using user: ${admin.id} ${admin.name} (role: ${admin.role})`);

  const challenges = [
    {
      title: "Animated Counter",
      description:
        "Build a beautiful counter app with increment, decrement, and reset buttons. Use smooth CSS animations for number transitions. The counter should have a modern, dark-themed UI.",
      category: "basics",
      difficulty: "BEGINNER" as const,
    },
    {
      title: "Kanban Board",
      description:
        "Create a drag-and-drop Kanban board with at least 3 columns (To Do, In Progress, Done). Cards should be movable between columns. Include the ability to add and delete cards. Use only React state - no external drag libraries.",
      category: "productivity",
      difficulty: "ADVANCED" as const,
    },
    {
      title: "Weather Dashboard",
      description:
        "Build a weather dashboard that displays mock weather data for 5 cities. Include temperature, humidity, wind speed, and weather icons. Use a responsive grid layout with cards for each city.",
      category: "data-viz",
      difficulty: "INTERMEDIATE" as const,
    },
    {
      title: "Music Visualizer",
      description:
        "Create an audio visualizer with animated bars that react to a simulated audio signal. Use requestAnimationFrame for smooth 60fps animations. Include play/pause controls and color theme options.",
      category: "creative",
      difficulty: "EXPERT" as const,
    },
  ];

  for (const c of challenges) {
    const existing = await prisma.arenaChallenge.findFirst({
      where: { title: c.title },
    });
    if (existing) {
      logger.info(`Skipping (exists): ${c.title}`);
      continue;
    }
    const created = await prisma.arenaChallenge.create({
      data: { ...c, createdById: admin.id },
    });
    logger.info(`Created: ${created.id} ${created.title}`);
  }

  logger.info("Done!");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error("Seed failed", { error: e });
    process.exit(1);
  });
