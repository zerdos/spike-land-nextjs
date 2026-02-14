"use server";

import { auth } from "@/auth";
import { verifyAdminAccess } from "@/lib/auth/admin-middleware";

export async function spawnAgent(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const hasAccess = await verifyAdminAccess(session);
  if (!hasAccess) throw new Error("Forbidden");

  const prisma = (await import("@/lib/prisma")).default;
  const name = formData.get("name") as string;

  const agent = await prisma.claudeCodeAgent.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      machineId: "web",
      sessionId: crypto.randomUUID(),
      displayName: name || "New Agent",
      lastSeenAt: new Date(),
    },
  });

  return { success: true, agentId: agent.id };
}

export async function stopAgent(agentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const hasAccess = await verifyAdminAccess(session);
  if (!hasAccess) throw new Error("Forbidden");

  const prisma = (await import("@/lib/prisma")).default;
  await prisma.claudeCodeAgent.update({
    where: { id: agentId },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}
