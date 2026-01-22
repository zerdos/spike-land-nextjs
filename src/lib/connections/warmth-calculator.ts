import prisma from "@/lib/prisma";

/**
 * Calculates a warmth score (0-100) for a connection based on 4 factors:
 * 1. Recency (0-25): How recently did we interact?
 * 2. Frequency (0-25): How often do we interact?
 * 3. Sentiment (0-25): How positive are the interactions?
 * 4. Depth (0-25): How substantial are the interactions?
 */
export async function calculateWarmth(connectionId: string): Promise<number> {
  // Fetch connection interactions from InboxItems
  // We look for items associated with the connection's platform presence
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: { platformPresence: true },
  });

  if (!connection || connection.platformPresence.length === 0) return 0;

  // Find all inbox items linked to these handles
  // Note: This matches based on sender/recipient handles
  // In a real implementation, we might have a direct relation if we link InboxItems to Connection
  const handles = connection.platformPresence.map((p: { handle: string; }) => p.handle);

  const interactions = await prisma.inboxItem.findMany({
    where: {
      OR: [
        { senderHandle: { in: handles } },
        // We could also check recipient if we track outgoing items similarly
      ],
      workspaceId: connection.workspaceId,
    },
    orderBy: { receivedAt: "desc" },
    take: 50, // Analyze last 50 interactions
  });

  if (interactions.length === 0) return 0;

  // 1. Recency (Max 25)
  // 25 points if < 2 days, decays to 0 at 90 days
  const lastInteraction = interactions[0]?.receivedAt;
  if (!lastInteraction) return 0;
  const daysSince = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 25 * (1 - daysSince / 90));

  // 2. Frequency (Max 25)
  // Based on interactions per month
  const oldestInteraction = interactions[interactions.length - 1]?.receivedAt;
  if (!oldestInteraction) return 0;
  const monthsSpan = Math.max(
    1,
    (Date.now() - oldestInteraction.getTime()) / (1000 * 60 * 60 * 24 * 30),
  );
  const frequencyPerMonth = interactions.length / monthsSpan;
  // Cap at 10 interactions/month for full score
  const frequencyScore = Math.min(25, (frequencyPerMonth / 10) * 25);

  // 3. Sentiment (Max 25)
  // Average sentiment score (-1 to 1) mapped to 0-25
  let totalSentiment = 0;
  let sentimentCount = 0;

  for (const item of interactions) {
    if (item.sentimentScore !== null) {
      totalSentiment += item.sentimentScore;
      sentimentCount++;
    }
  }

  const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;
  // Map -1..1 to 0..1, then to 0..25
  const sentimentScore = ((avgSentiment + 1) / 2) * 25;

  // 4. Depth (Max 25)
  // Based on message length and if it's a conversation (replies)
  const avgLength =
    interactions.reduce((acc: number, item: { content: string; }) => acc + item.content.length, 0) /
    interactions.length;
  // Cap at 200 chars average
  const depthScore = Math.min(25, (avgLength / 200) * 25);

  const totalScore = Math.round(recencyScore + frequencyScore + sentimentScore + depthScore);

  // Update factors in DB for transparency (optional extended implementation)
  /*
  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      warmthFactors: {
        recency: recencyScore,
        frequency: frequencyScore,
        sentiment: sentimentScore,
        depth: depthScore
      }
    }
  });
  */

  return Math.min(100, Math.max(0, totalScore));
}
