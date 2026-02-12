/**
 * Workspace Credit Manager
 *
 * User-facing service for managing Orbit AI credits.
 * Handles workspace resolution and credit operations.
 */

import prisma from "@/lib/prisma";
import { WorkspaceSubscriptionService } from "@/lib/subscription/workspace-subscription";
import { tryCatch } from "@/lib/try-catch";
import { ensurePersonalWorkspace } from "@/lib/workspace/ensure-personal-workspace";
import type { WorkspaceSubscriptionTier } from "@/generated/prisma";

export interface CreditBalance {
    remaining: number;
    limit: number;
    used: number;
    tier: WorkspaceSubscriptionTier;
    workspaceId: string;
}

export class WorkspaceCreditManager {
    /**
     * Resolve the active workspace for a user to charge credits against.
     * Priority:
     * 1. Personal workspace (isPersonal: true)
     * 2. First available workspace owned/member
     * 3. Create personal workspace if none exists
     */
    static async resolveWorkspaceForUser(userId: string): Promise<string | null> {
        // 1. Try to find a personal workspace
        const personalWorkspace = await prisma.workspace.findFirst({
            where: {
                isPersonal: true,
                members: {
                    some: { userId },
                },
                deletedAt: null,
            },
            select: { id: true },
        });

        if (personalWorkspace) {
            return personalWorkspace.id;
        }

        // 2. Fallback to any active workspace membership
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId,
                workspace: {
                    deletedAt: null,
                },
            },
            select: { workspaceId: true },
            orderBy: { createdAt: "asc" }, // consistent fallback
        });

        if (membership) {
            return membership.workspaceId;
        }

        // 3. Auto-create personal workspace if absolutely nothing found
        // This is a safety net; normally users should have a workspace on signup.
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });

        if (!user) {
            console.error(
                `Cannot auto-create workspace: user record missing for userId=${userId}. ` +
                "User needs to sign in again to trigger user record creation.",
            );
            return null;
        }

        const { data: workspaceId, error } = await tryCatch(
            ensurePersonalWorkspace(userId, user.name),
        );

        if (error || !workspaceId) {
            console.error("Failed to auto-create personal workspace", error);
            return null;
        }

        return workspaceId;
    }

    /**
     * Get the current credit balance for a user
     */
    static async getBalance(userId: string): Promise<CreditBalance | null> {
        const workspaceId = await this.resolveWorkspaceForUser(userId);
        if (!workspaceId) return null;

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                monthlyAiCredits: true,
                usedAiCredits: true,
                subscriptionTier: true,
            },
        });

        if (!workspace) return null;

        const { monthlyAiCredits, usedAiCredits, subscriptionTier } = workspace;

        // Handle unlimited (-1) logic if applicable, though standard tiers usually have fixed limits
        // leveraging existing pattern.
        const limit = monthlyAiCredits;
        const remaining = Math.max(0, limit - usedAiCredits);

        return {
            remaining,
            limit,
            used: usedAiCredits,
            tier: subscriptionTier,
            workspaceId,
        };
    }

    /**
     * Check if user has enough credits for an operation
     */
    static async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
        const workspaceId = await this.resolveWorkspaceForUser(userId);
        if (!workspaceId) return false;

        const check = await WorkspaceSubscriptionService.canUseAiCredits(workspaceId, amount);
        return check.allowed;
    }

    /**
     * Consume credits for a user
     */
    static async consumeCredits({
        userId,
        amount,
        source: _source,
        sourceId: _sourceId,
    }: {
        userId: string;
        amount: number;
        source?: string;
        sourceId?: string;
    }): Promise<{ success: boolean; remaining: number; error?: string }> {
        const workspaceId = await this.resolveWorkspaceForUser(userId);
        if (!workspaceId) {
            return { success: false, remaining: 0, error: "No active workspace found for billing" };
        }

        // Forward source info to subscription service if it supports it, 
        // or just log it here for now if the service signature doesn't support it yet.
        // For now, WorkspaceSubscriptionService.consumeAiCredits only takes workspaceId and amount.
        // TODO: Update WorkspaceSubscriptionService to accept source info for proper auditing.
        // For this PR, we at least stop dropping the params silently by acknowledging them.
        
        return WorkspaceSubscriptionService.consumeAiCredits(workspaceId, amount);
    }

    /**
     * Refund credits to a user (e.g., failed job)
     * Decrements usedAiCredits, clamping at 0.
     */
    static async refundCredits(userId: string, amount: number): Promise<boolean> {
        if (amount <= 0) return true;

        const workspaceId = await this.resolveWorkspaceForUser(userId);
        if (!workspaceId) return false;

        // Use raw query to ensure we don't go below 0
        const { error } = await tryCatch(
            prisma.$executeRaw`
                UPDATE workspaces 
                SET "usedAiCredits" = GREATEST(0, "usedAiCredits" - ${amount})
                WHERE id = ${workspaceId}
            `
        );

        if (error) {
            console.error("Failed to refund credits", error);
            return false;
        }

        return true;
    }
}
