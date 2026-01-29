import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export interface CreateBriefInput {
  name: string;
  userId: string;
  targetAudience: Record<string, unknown>;
  campaignObjectives: Record<string, unknown>;
  creativeRequirements?: Record<string, unknown>;
}

export interface UpdateBriefInput {
  name?: string;
  targetAudience?: Record<string, unknown>;
  campaignObjectives?: Record<string, unknown>;
  creativeRequirements?: Record<string, unknown>;
  status?: string;
}

export class BriefService {
  /**
   * Create a new campaign brief
   */
  static async createBrief(input: CreateBriefInput) {
    // Combine all data including creative requirements
    const fullData = {
      ...input.targetAudience,
      ...input.campaignObjectives,
      creativeRequirements: input.creativeRequirements,
    };

    const brief = await prisma.campaignBrief.create({
      data: {
        name: input.name,
        userId: input.userId,
        targetAudience: input.targetAudience as Prisma.JsonObject,
        campaignObjectives: fullData as Prisma.JsonObject,
        status: "DRAFT",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return brief;
  }

  /**
   * Get a brief by ID
   */
  static async getBrief(briefId: string, userId: string) {
    const brief = await prisma.campaignBrief.findFirst({
      where: {
        id: briefId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        variants: {
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
        generationJobs: {
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return brief;
  }

  /**
   * List all briefs for a user
   */
  static async listBriefs(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Prisma.CampaignBriefWhereInput = {
      userId,
    };

    if (options?.status) {
      where.status = options.status;
    }

    const [briefs, total] = await Promise.all([
      prisma.campaignBrief.findMany({
        where,
        orderBy: {
          updatedAt: "desc",
        },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              variants: true,
              generationJobs: true,
            },
          },
        },
      }),
      prisma.campaignBrief.count({ where }),
    ]);

    return { briefs, total };
  }

  /**
   * Update a brief
   */
  static async updateBrief(
    briefId: string,
    userId: string,
    input: UpdateBriefInput
  ) {
    const brief = await prisma.campaignBrief.findFirst({
      where: {
        id: briefId,
        userId,
      },
    });

    if (!brief) {
      throw new Error("Brief not found");
    }

    const updates: Prisma.CampaignBriefUpdateInput = {};

    if (input.name !== undefined) {
      updates.name = input.name;
    }

    if (input.targetAudience !== undefined) {
      updates.targetAudience = input.targetAudience as Prisma.JsonObject;
    }

    if (input.campaignObjectives !== undefined || input.creativeRequirements !== undefined) {
      // Merge with existing data
      const existingObjectives = brief.campaignObjectives as Record<string, unknown>;
      const newObjectives = {
        ...existingObjectives,
        ...(input.campaignObjectives || {}),
        creativeRequirements: input.creativeRequirements,
      };
      updates.campaignObjectives = newObjectives as Prisma.JsonObject;
    }

    if (input.status !== undefined) {
      updates.status = input.status;
    }

    const updatedBrief = await prisma.campaignBrief.update({
      where: {
        id: briefId,
      },
      data: updates,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedBrief;
  }

  /**
   * Delete (archive) a brief
   */
  static async deleteBrief(briefId: string, userId: string) {
    const brief = await prisma.campaignBrief.findFirst({
      where: {
        id: briefId,
        userId,
      },
    });

    if (!brief) {
      throw new Error("Brief not found");
    }

    await prisma.campaignBrief.update({
      where: {
        id: briefId,
      },
      data: {
        status: "ARCHIVED",
      },
    });

    return { success: true };
  }

  /**
   * Duplicate a brief
   */
  static async duplicateBrief(briefId: string, userId: string) {
    const original = await prisma.campaignBrief.findFirst({
      where: {
        id: briefId,
        userId,
      },
    });

    if (!original) {
      throw new Error("Brief not found");
    }

    const duplicate = await prisma.campaignBrief.create({
      data: {
        name: `${original.name} (Copy)`,
        userId: original.userId,
        targetAudience: original.targetAudience as Prisma.JsonObject,
        campaignObjectives: original.campaignObjectives as Prisma.JsonObject,
        status: "DRAFT",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return duplicate;
  }
}
