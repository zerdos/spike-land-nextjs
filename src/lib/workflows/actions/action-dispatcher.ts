import {
  WorkflowAction,
  ActionInput,
  ActionOutput,
  WorkflowActionType,
} from "./action-types";
import { sendNotificationAction } from "./send-notification";
import { updateRecordAction } from "./update-record";
import { callAiAgentAction } from "./call-ai-agent";
import { postToPlatformAction } from "./post-to-platform";
import { conditionalAction } from "./conditional";
import { interpolate } from "./interpolation";

const actions: Record<WorkflowActionType, WorkflowAction<any, any>> = {
  send_notification: sendNotificationAction,
  update_record: updateRecordAction,
  call_ai_agent: callAiAgentAction,
  post_to_platform: postToPlatformAction,
  conditional: conditionalAction,
};

export async function dispatchAction(
  type: WorkflowActionType,
  input: ActionInput,
  context: Record<string, any> = {}
): Promise<ActionOutput> {
  const action = actions[type];
  if (!action) {
    throw new Error(`Unsupported action type: ${type}`);
  }

  const interpolatedInput = interpolate(input, context);
  action.validate(interpolatedInput);
  return action.execute(interpolatedInput);
}
