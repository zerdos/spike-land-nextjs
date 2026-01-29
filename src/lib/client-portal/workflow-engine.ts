/**
 * Approval Workflow Engine
 *
 * Core logic for executing approval workflows
 */

import prisma from "@/lib/prisma";
import { ApprovalStatus, ApproverDecision, StageStatus } from "@prisma/client";

/**
 * Check if an approval stage is complete
 */
export async function checkStageComplete(stageId: string): Promise<boolean> {
  const stage = await prisma.approvalStage.findUnique({
    where: { id: stageId },
    include: { approvers: true },
  });

  if (!stage) {
    return false;
  }

  const approvedCount = stage.approvers.filter(
    (a) => a.decision === ApproverDecision.APPROVED,
  ).length;

  return approvedCount >= stage.approvalThreshold;
}

/**
 * Advance to the next stage in the workflow
 */
export async function advanceStage(requestId: string): Promise<void> {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { stages: true, workflow: true },
  });

  if (!request) {
    throw new Error("Approval request not found");
  }

  const currentStageComplete = await checkStageComplete(
    request.stages.find((s) => s.stageOrder === request.currentStage)?.id || "",
  );

  if (!currentStageComplete) {
    return; // Stage not complete yet
  }

  // Mark current stage as approved
  await prisma.approvalStage.updateMany({
    where: {
      requestId,
      stageOrder: request.currentStage,
    },
    data: {
      status: StageStatus.APPROVED,
    },
  });

  // Check if there are more stages
  const nextStage = request.currentStage + 1;
  const hasNextStage = request.stages.some((s) => s.stageOrder === nextStage);

  if (hasNextStage) {
    // Move to next stage
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        currentStage: nextStage,
        status: ApprovalStatus.IN_PROGRESS,
      },
    });
  } else {
    // All stages complete - mark as approved
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        finalDecisionAt: new Date(),
      },
    });
  }
}

/**
 * Reject an approval request
 */
export async function rejectApproval(
  requestId: string,
  userId: string,
): Promise<void> {
  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: ApprovalStatus.REJECTED,
      finalDecisionById: userId,
      finalDecisionAt: new Date(),
    },
  });

  // Mark all pending stages as skipped
  await prisma.approvalStage.updateMany({
    where: {
      requestId,
      status: StageStatus.PENDING,
    },
    data: {
      status: StageStatus.SKIPPED,
    },
  });
}
