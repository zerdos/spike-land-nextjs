import { WorkflowActionType } from "@/types/workflow";
import type { ActionDefinition } from "./registry";
import { registerAction } from "./registry";

export const postToSocialAction: ActionDefinition = {
  type: WorkflowActionType.POST_TO_SOCIAL,
  name: "Post to Social Media",
  description: "Publish content to a connected social media account",
  category: "social",
  configSchema: {
    type: "object",
    required: ["platform", "accountId", "content"],
    properties: {
      platform: { type: "string" },
      accountId: { type: "string" },
      content: { type: "string" },
      mediaUrls: { type: "array", items: { type: "string" } }
    }
  },
  exampleConfig: {
    actionType: "POST_TO_SOCIAL",
    platform: "TWITTER",
    accountId: "acc_12345",
    content: "Hello world!",
    mediaUrls: []
  },
  requiredPermissions: ["social:write"]
};

// Register actions
registerAction(postToSocialAction);
