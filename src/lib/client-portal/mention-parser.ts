/**
 * Mention Parser for Comments
 *
 * Utilities for parsing @mentions from comment text
 */

/**
 * Parse @mentions from text
 * Matches patterns like @[userId:userName] or @userId
 */
export function parseMentions(text: string): string[] {
  const mentions = new Set<string>();

  // Match @[userId:userName] format (rich editor format)
  const richMentionPattern = /@\[([a-z0-9]+):[^\]]+\]/gi;
  let match = richMentionPattern.exec(text);
  while (match) {
    mentions.add(match[1]!);
    match = richMentionPattern.exec(text);
  }

  // Match @userId format (simple format)
  const simpleMentionPattern = /@([a-z0-9]{25})/gi;
  match = simpleMentionPattern.exec(text);
  while (match) {
    mentions.add(match[1]!);
    match = simpleMentionPattern.exec(text);
  }

  return Array.from(mentions);
}

/**
 * Validate user IDs exist and have access to the workspace
 */
export async function validateMentions(
  userIds: string[],
  workspaceId: string,
): Promise<string[]> {
  const { default: prisma } = await import("@/lib/prisma");

  // Check which users exist and have access to workspace
  const validUsers = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      OR: [
        // Workspace members
        {
          workspaceMembers: {
            some: {
              workspaceId,
              joinedAt: { not: null },
            },
          },
        },
        // Clients with access
        {
          clientAccess: {
            some: {
              workspaceId,
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return validUsers.map((u) => u.id);
}
