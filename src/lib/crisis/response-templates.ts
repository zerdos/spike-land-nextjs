/**
 * Crisis Response Templates Service
 *
 * Manages response templates for crisis situations.
 * Supports system-wide and workspace-specific templates.
 *
 * Resolves #588: Create Crisis Detection System
 */

import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { CrisisResponseTemplate, SocialPlatform } from "@prisma/client";

import type {
  CreateTemplateOptions,
  PaginatedResponse,
  TemplateSearchParams,
  UpdateTemplateOptions,
} from "./types";

/**
 * Crisis Response Templates Service
 */
export class CrisisResponseTemplates {
  /**
   * Create a new response template
   */
  static async create(
    options: CreateTemplateOptions,
  ): Promise<CrisisResponseTemplate | null> {
    const { data, error } = await tryCatch(
      prisma.crisisResponseTemplate.create({
        data: {
          workspaceId: options.workspaceId ?? null,
          name: options.name,
          category: options.category,
          platform: options.platform ?? null,
          content: options.content,
          variables: options.variables || [],
          isActive: options.isActive ?? true,
        },
      }),
    );

    if (error) {
      console.error("Failed to create crisis response template:", error);
      return null;
    }

    return data;
  }

  /**
   * Update an existing template
   */
  static async update(
    templateId: string,
    options: UpdateTemplateOptions,
  ): Promise<CrisisResponseTemplate | null> {
    const { data, error } = await tryCatch(
      prisma.crisisResponseTemplate.update({
        where: { id: templateId },
        data: {
          ...(options.name !== undefined && { name: options.name }),
          ...(options.category !== undefined && { category: options.category }),
          ...(options.platform !== undefined && { platform: options.platform }),
          ...(options.content !== undefined && { content: options.content }),
          ...(options.variables !== undefined && {
            variables: options.variables,
          }),
          ...(options.isActive !== undefined && { isActive: options.isActive }),
        },
      }),
    );

    if (error) {
      console.error("Failed to update crisis response template:", error);
      return null;
    }

    return data;
  }

  /**
   * Delete a template
   */
  static async delete(templateId: string): Promise<boolean> {
    const { error } = await tryCatch(
      prisma.crisisResponseTemplate.delete({
        where: { id: templateId },
      }),
    );

    if (error) {
      console.error("Failed to delete crisis response template:", error);
      return false;
    }

    return true;
  }

  /**
   * Get a template by ID
   */
  static async getById(
    templateId: string,
  ): Promise<CrisisResponseTemplate | null> {
    const { data, error } = await tryCatch(
      prisma.crisisResponseTemplate.findUnique({
        where: { id: templateId },
      }),
    );

    if (error) {
      console.error("Failed to get crisis response template:", error);
      return null;
    }

    return data;
  }

  /**
   * Search templates with filters
   */
  static async search(
    params: TemplateSearchParams,
  ): Promise<PaginatedResponse<CrisisResponseTemplate>> {
    const limit = Math.min(params.limit || 50, 100);
    const offset = params.offset || 0;

    // Build where clause - include system templates and workspace templates
    const where: Record<string, unknown> = {};

    if (params.workspaceId !== undefined) {
      // Include both workspace-specific and system templates (null workspaceId)
      where.OR = [
        { workspaceId: params.workspaceId },
        { workspaceId: null },
      ];
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.platform) {
      where.OR = [{ platform: params.platform }, { platform: null }];
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [templates, total] = await Promise.all([
      prisma.crisisResponseTemplate.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: "asc" },
      }),
      prisma.crisisResponseTemplate.count({ where }),
    ]);

    return {
      data: templates,
      total,
      limit,
      offset,
      hasMore: offset + templates.length < total,
    };
  }

  /**
   * Get templates for a specific crisis category and platform
   */
  static async getForCrisis(
    workspaceId: string,
    category?: string,
    platform?: SocialPlatform,
  ): Promise<CrisisResponseTemplate[]> {
    const where: Record<string, unknown> = {
      isActive: true,
      OR: [{ workspaceId }, { workspaceId: null }],
    };

    if (category) {
      where.category = category;
    }

    if (platform) {
      where.AND = [
        where,
        { OR: [{ platform }, { platform: null }] },
      ];
    }

    const { data, error } = await tryCatch(
      prisma.crisisResponseTemplate.findMany({
        where,
        orderBy: [{ workspaceId: "desc" }, { usageCount: "desc" }], // Workspace-specific first
      }),
    );

    if (error) {
      console.error("Failed to get templates for crisis:", error);
      return [];
    }

    return data;
  }

  /**
   * Render a template with variables
   */
  static renderTemplate(
    template: CrisisResponseTemplate,
    variables: Record<string, string>,
  ): string {
    let content = template.content;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{${key}\\}`, "gi");
      content = content.replace(placeholder, value);
    }

    return content;
  }

  /**
   * Increment usage count for a template
   */
  static async incrementUsage(templateId: string): Promise<void> {
    await tryCatch(
      prisma.crisisResponseTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      }),
    );
  }

  /**
   * Get default system templates
   */
  static getDefaultTemplates(): Array<Omit<CreateTemplateOptions, "workspaceId">> {
    return [
      {
        name: "General Apology",
        category: "APOLOGY",
        content:
          "We sincerely apologize for {issue}. We understand your frustration and are working to make this right. {next_steps}",
        variables: ["issue", "next_steps"],
        isActive: true,
      },
      {
        name: "Acknowledgment",
        category: "ACKNOWLEDGMENT",
        content:
          "Thank you for bringing this to our attention, {customer_name}. We take your feedback seriously and our team is looking into this matter.",
        variables: ["customer_name"],
        isActive: true,
      },
      {
        name: "Support Redirect",
        category: "REDIRECT",
        content:
          "Hi {customer_name}, we'd love to help resolve this for you. Please reach out to our support team at {support_contact} so we can assist you directly.",
        variables: ["customer_name", "support_contact"],
        isActive: true,
      },
      {
        name: "Escalation Notice",
        category: "ESCALATION",
        content:
          "We've escalated your concern to our senior team. Someone will reach out to you within {timeframe} to address this personally.",
        variables: ["timeframe"],
        isActive: true,
      },
      {
        name: "Empathy Response",
        category: "EMPATHY",
        content:
          "We hear you, and we're sorry you're experiencing this. Your satisfaction is important to us, and we're committed to finding a solution.",
        variables: [],
        isActive: true,
      },
      {
        name: "Follow-Up",
        category: "FOLLOW_UP",
        content:
          "Hi {customer_name}, we wanted to follow up on your recent concern. Has the issue been resolved to your satisfaction? We're here if you need any further assistance.",
        variables: ["customer_name"],
        isActive: true,
      },
    ];
  }

  /**
   * Ensure default system templates exist
   */
  static async ensureDefaultTemplates(): Promise<void> {
    const existingCount = await prisma.crisisResponseTemplate.count({
      where: { workspaceId: null },
    });

    if (existingCount > 0) {
      return; // Already have system templates
    }

    const defaults = this.getDefaultTemplates();

    for (const template of defaults) {
      await this.create({
        workspaceId: null,
        ...template,
      });
    }
  }
}
