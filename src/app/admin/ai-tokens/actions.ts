"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { type Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    throw new Error("Unauthorized");
  }
}

export async function getAIProviders() {
  await ensureAdmin();
  return prisma.aIProvider.findMany({
    orderBy: { name: "asc" },
  });
}

export async function upsertAIProvider(data: {
  id?: string;
  name: string;
  token: string;
  isDefault?: boolean;
  config?: Record<string, unknown> | null;
}) {
  await ensureAdmin();

  const { id: _id, config, ...rest } = data;

  if (rest.isDefault) {
    // Unset other defaults if this one is set as default
    await prisma.aIProvider.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const result = await prisma.aIProvider.upsert({
    where: { name: rest.name },
    update: {
      ...rest,
      config: config as Prisma.InputJsonValue,
    },
    create: {
      ...rest,
      config: config as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/ai-tokens");
  return result;
}

export async function deleteAIProvider(id: string) {
  await ensureAdmin();
  await prisma.aIProvider.delete({
    where: { id },
  });
  revalidatePath("/admin/ai-tokens");
}

export async function setDefaultProvider(id: string) {
  await ensureAdmin();

  await prisma.aIProvider.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });

  await prisma.aIProvider.update({
    where: { id },
    data: { isDefault: true },
  });

  revalidatePath("/admin/ai-tokens");
}
