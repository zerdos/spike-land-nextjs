import prisma from "@/lib/prisma";
import { triggerWorkflowManually } from "@/lib/workflows/workflow-executor";
import { BoxStatus } from "@prisma/client";

export async function triggerBoxProvisioning(boxId: string): Promise<void> {
  try {
    // Fetch box with necessary relations to determine workspace
    const box = await prisma.box.findUnique({
      where: { id: boxId },
      include: {
        user: {
          include: {
            workspaceMembers: {
              include: {
                workspace: true,
              },
            },
          },
        },
        tier: true,
      },
    });

    if (!box) {
      console.error(`[BoxProvisioning] Box ${boxId} not found`);
      return;
    }

    // Helper to mark box as error
    const failBox = async (reason: string) => {
      console.error(`[BoxProvisioning] ${reason}`);
      try {
        await prisma.box.update({
          where: { id: boxId },
          data: { status: BoxStatus.ERROR },
        });
      } catch (dbError) {
        console.error(`[BoxProvisioning] Failed to update box status to ERROR: ${dbError}`);
      }
    };

    // 1. Prioritize Cloud Function / Webhook via Environment Variable
  // This allows for external infrastructure (like a serverless function) to handle provisioning.
  // We strictly use bracket notation for process.env to satisfy noPropertyAccessFromIndexSignature.
    const provisioningUrl = process.env["BOX_PROVISIONING_WEBHOOK_URL"];
    if (provisioningUrl) {
      try {
        const secret = process.env["BOX_PROVISIONING_SECRET"] ?? "";
        const response = await fetch(provisioningUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(secret ? { "Authorization": `Bearer ${secret}` } : {}),
          },
          body: JSON.stringify({
            boxId: box.id,
            userId: box.userId,
            tier: box.tier,
            action: "PROVISION",
          }),
        });

        if (!response.ok) {
          await failBox(`Webhook failed: ${response.status} ${response.statusText}`);
        } else {
          console.log(`[BoxProvisioning] Successfully triggered provisioning webhook for box ${boxId}`);
        }
        return;
      } catch (error) {
        await failBox(`Webhook execution error: ${error}`);
        return;
      }
    }

    // 2. Fallback to Workflow Trigger
    // Try to find a relevant workspace for the user to look for a provisioning workflow
    const personalWorkspace = box.user.workspaceMembers.find(m => m.workspace.isPersonal)?.workspace;
    const targetWorkspace = personalWorkspace || box.user.workspaceMembers[0]?.workspace;

    if (targetWorkspace) {
      // Check if there is a specific workflow for box provisioning in this workspace
      // We assume the name "Provision Box" for now.
      const workflow = await prisma.workflow.findFirst({
        where: {
          workspaceId: targetWorkspace.id,
          name: "Provision Box",
          status: "ACTIVE",
        },
      });

      if (workflow) {
        try {
          await triggerWorkflowManually(workflow.id, targetWorkspace.id, {
            boxId: box.id,
            userId: box.userId,
            tier: box.tier,
          });
          console.log(`[BoxProvisioning] Triggered workflow "${workflow.name}" (${workflow.id}) for box ${boxId}`);
          return;
        } catch (error) {
          await failBox(`Workflow trigger error: ${error}`);
          return;
        }
      }
    }

    // 3. No mechanism found
    await failBox(`No provisioning mechanism (Webhook or Workflow) found for box ${boxId}`);
  } catch (error) {
    console.error("[BoxProvisioning] Unhandled error during provisioning:", error);
    // Try to fail the box if possible, but don't crash
    try {
      await prisma.box.update({
        where: { id: boxId },
        data: { status: BoxStatus.ERROR },
      });
    } catch {
      // Ignore DB errors here to prevent further crashes
    }
  }
}
