import { prisma } from '@/lib/prisma';
import { ScoutTopic } from '@prisma/client';
import { z } from 'zod';

export const topicKeywordsSchema = z.object({
  and: z.array(z.string()).optional(),
  or: z.array(z.string()).optional(),
  not: z.array(z.string()).optional(),
});

export const createTopicSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  keywords: topicKeywordsSchema,
  isActive: z.boolean().default(true),
});

export const updateTopicSchema = createTopicSchema.partial();

export async function createTopic(
  workspaceId: string,
  data: z.infer<typeof createTopicSchema>
): Promise<ScoutTopic> {
  const validatedData = createTopicSchema.parse(data);
  return prisma.scoutTopic.create({
    data: {
      workspaceId,
      ...validatedData,
    },
  });
}

export async function getTopic(topicId: string): Promise<ScoutTopic | null> {
  return prisma.scoutTopic.findUnique({
    where: { id: topicId },
  });
}

export async function listTopicsByWorkspace(
  workspaceId: string
): Promise<ScoutTopic[]> {
  return prisma.scoutTopic.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateTopic(
  topicId: string,
  data: z.infer<typeof updateTopicSchema>
): Promise<ScoutTopic> {
  const validatedData = updateTopicSchema.parse(data);
  return prisma.scoutTopic.update({
    where: { id: topicId },
    data: validatedData,
  });
}

export async function deleteTopic(topicId: string): Promise<ScoutTopic> {
  return prisma.scoutTopic.delete({
    where: { id: topicId },
  });
}
