import prisma from "@/lib/prisma";
import type { Prisma, SocialPlatform } from "@prisma/client";

export async function syncInboxConnections(workspaceId: string) {
  // 1. Get all unique sender handles from InboxItems in this workspace
  // that don't belong to the workspace itself

  // Group by senderHandle + platform to find unique people
  const uniqueSenders = await prisma.inboxItem.groupBy({
    by: ["senderHandle", "platform", "senderName", "senderAvatarUrl"],
    where: {
      workspaceId,
      senderHandle: { not: null },
    },
    // We only want items that are interactions from others
    // Assuming 'senderHandle' is the external user
  });

  let createdCount = 0;
  const updatedCount = 0;

  for (const sender of uniqueSenders) {
    if (!sender.senderHandle) continue;

    // Check if a connection with this handle already exists
    // We check ConnectionPlatformPresence
    const existingPresence = await prisma.connectionPlatformPresence.findFirst({
      where: {
        handle: sender.senderHandle,
        platform: sender.platform as SocialPlatform,
        connection: {
          workspaceId,
        },
      },
      include: {
        connection: true,
      },
    });

    if (existingPresence) {
      // Already exists, maybe update last seen
      // Could verify latest inbox item time
      continue;
    }

    // Check if we have a connection with this name maybe?
    // For now, simple logic: Create new connection if no presence found

    // Create new connection
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create Connection
      const newConnection = await tx.connection.create({
        data: {
          workspaceId,
          displayName: sender.senderName || sender.senderHandle!,
          avatarUrl: sender.senderAvatarUrl,
          // Initial warmth 0, will be calculated later
        },
      });

      // 2. Create Platform Presence
      await tx.connectionPlatformPresence.create({
        data: {
          connectionId: newConnection.id,
          platform: sender.platform as SocialPlatform,
          handle: sender.senderHandle!,
          profileUrl: `https://${sender.platform.toLowerCase()}.com/${sender.senderHandle}`, // Naive URL gen
          lastSeenAt: new Date(),
        },
      });
    });

    createdCount++;
  }

  return { created: createdCount, updated: updatedCount };
}
