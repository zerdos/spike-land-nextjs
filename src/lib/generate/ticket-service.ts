import { BridgeMindClient } from "@/lib/sync/clients/bridgemind-client";
import { createIssue } from "@/lib/agents/github-issues";
import logger from "@/lib/logger";
import type { PipelinePhase } from "./types";

let bridgeMindClient: BridgeMindClient | null = null;

function getBridgeMindClient(): BridgeMindClient {
  if (!bridgeMindClient) {
    bridgeMindClient = new BridgeMindClient();
  }
  return bridgeMindClient;
}

export async function createGenerationTicket(
  slug: string,
  originalUrl: string,
  category: string | null,
): Promise<{
  bridgemindTaskId: string | null;
  githubIssueNumber: number | null;
}> {
  const title = `[Auto-Gen] Route: /${slug}`;
  const description = [
    `**URL**: ${originalUrl}`,
    `**Slug**: ${slug}`,
    category ? `**Category**: ${category}` : null,
    "",
    "Auto-generated route via the No-404 pipeline.",
  ]
    .filter(Boolean)
    .join("\n");

  // Try BridgeMind first
  let bridgemindTaskId: string | null = null;
  try {
    const client = getBridgeMindClient();
    const result = await client.createTask({
      title,
      description,
      priority: "medium",
      labels: ["auto-gen", "no-404"],
    });
    if (result.data) {
      bridgemindTaskId = result.data.id;
    }
  } catch (error) {
    logger.warn("BridgeMind ticket creation failed, falling back to GitHub", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // GitHub backup
  let githubIssueNumber: number | null = null;
  try {
    const result = await createIssue({
      title,
      body: description,
      labels: ["auto-gen", "no-404"],
    });
    if (result.data?.number) {
      githubIssueNumber = result.data.number;
    }
  } catch (error) {
    logger.warn("GitHub issue creation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { bridgemindTaskId, githubIssueNumber };
}

export async function updateTicketStatus(
  bridgemindTaskId: string | null,
  githubIssueNumber: number | null,
  phase: PipelinePhase,
  message?: string,
): Promise<void> {
  const statusMap: Record<string, string> = {
    PLANNING: "in-progress",
    PLAN_REVIEW: "in-progress",
    CODING: "in-progress",
    TRANSPILING: "in-progress",
    CODE_REVIEW: "in-progress",
    PUBLISHED: "done",
    FAILED: "failed",
  };

  const status = statusMap[phase] ?? "in-progress";

  if (bridgemindTaskId) {
    try {
      const client = getBridgeMindClient();
      await client.updateTask(bridgemindTaskId, {
        status,
        ...(message ? { description: message } : {}),
      });
    } catch {
      // Non-critical - don't block pipeline
    }
  }

  // GitHub issue updates happen via PR links, not individual status updates
  if (githubIssueNumber && (phase === "PUBLISHED" || phase === "FAILED")) {
    try {
      // Close issue on terminal states - use the existing gh CLI approach
      logger.info(
        `Generation ticket #${githubIssueNumber} reached terminal state: ${phase}`,
      );
    } catch {
      // Non-critical
    }
  }
}
