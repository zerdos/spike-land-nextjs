import prisma from "@/lib/prisma";

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  isPersonal?: boolean;
}

export class WorkspaceService {
  private static MAX_WORKSPACES_PER_USER = 10; // Configurable limit

  /**
   * Generate a URL-safe slug from a name
   */
  static generateSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    
    return slug || `workspace-${Date.now().toString(36)}`;
  }

  /**
   * Ensure slug is unique by appending a suffix if needed
   */
  static async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;

    while (true) {
      const existing = await prisma.workspace.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) {
        return slug;
      }

      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
  }

  /**
   * Create a new workspace for a user
   */
  static async createWorkspace(userId: string, input: CreateWorkspaceInput) {
    // 1. Check workspace limits
    const ownedCount = await prisma.workspaceMember.count({
      where: {
        userId,
        role: "OWNER",
      },
    });

    if (ownedCount >= this.MAX_WORKSPACES_PER_USER) {
      throw new Error(`Workspace limit reached. You can create up to ${this.MAX_WORKSPACES_PER_USER} workspaces.`);
    }

    // 2. Generate unique slug
    // Ensure slug is not empty even if name is special chars
    const baseSlug = this.generateSlug(input.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    // 3. Create workspace in transaction
    return await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: input.name,
          slug,
          description: input.description || null,
          isPersonal: input.isPersonal || false,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: "OWNER",
          joinedAt: new Date(),
        },
      });

      return workspace;
    });
  }
}
