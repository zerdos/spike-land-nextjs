import prisma from "@/lib/prisma";
import { CreatedAppStatus } from "@/generated/prisma";
import { tryCatch } from "@/lib/try-catch";

export interface CreationStats {
  appsCreated: number;
  creatorCount: number;
}

export async function getCreationStats(): Promise<CreationStats> {
  const { data, error } = await tryCatch(
    Promise.all([
      prisma.createdApp.count({
        where: { status: CreatedAppStatus.PUBLISHED },
      }),
      prisma.user.count(),
    ]),
  );

  if (error) {
    console.error("Failed to fetch creation stats:", error);
    return { appsCreated: 0, creatorCount: 0 };
  }

  const [appsCreated, creatorCount] = data;
  return { appsCreated, creatorCount };
}
