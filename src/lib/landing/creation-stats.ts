import prisma from "@/lib/prisma";
import { CreatedAppStatus } from "@/generated/prisma";

export interface CreationStats {
  appsCreated: number;
  creatorCount: number;
}

export async function getCreationStats(): Promise<CreationStats> {
  const [appsCreated, creatorCount] = await Promise.all([
    prisma.createdApp.count({
      where: { status: CreatedAppStatus.PUBLISHED },
    }),
    prisma.user.count(),
  ]);

  return { appsCreated, creatorCount };
}
