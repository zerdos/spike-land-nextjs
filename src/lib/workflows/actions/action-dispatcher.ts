import type { ActionInput, ActionOutput, WorkflowActionType } from "./action-types";
import { callAiAgentAction } from "./call-ai-agent";
import { conditionalAction } from "./conditional";
import { httpRequestAction } from "./http-request";
import { interpolate } from "./interpolation";
import { loopAction } from "./loop";
import { parallelExecutionAction } from "./parallel-execution";
import { postToPlatformAction } from "./post-to-platform";
import { sendNotificationAction } from "./send-notification";
import { transformDataAction } from "./transform-data";
import { updateRecordAction } from "./update-record";

interface AnyWorkflowAction {
  type: string;
  execute: (input: ActionInput) => Promise<ActionOutput>;
  validate: (input: ActionInput) => void;
}

// Cast each action to the common interface
const actions: Record<WorkflowActionType, AnyWorkflowAction> = {
  send_notification: sendNotificationAction as unknown as AnyWorkflowAction,
  update_record: updateRecordAction as unknown as AnyWorkflowAction,
  call_ai_agent: callAiAgentAction as unknown as AnyWorkflowAction,
  post_to_platform: postToPlatformAction as unknown as AnyWorkflowAction,
  conditional: conditionalAction as unknown as AnyWorkflowAction,
  http_request: httpRequestAction as unknown as AnyWorkflowAction,
  transform_data: transformDataAction as unknown as AnyWorkflowAction,
  parallel_execution: parallelExecutionAction as unknown as AnyWorkflowAction,
  loop: loopAction as unknown as AnyWorkflowAction,
};

export async function dispatchAction(
  type: WorkflowActionType,
  input: ActionInput,
  context: Record<string, unknown> = {},
): Promise<ActionOutput> {
  const action = actions[type];
  if (!action) {
    throw new Error(`Unsupported action type: ${type}`);
  }

  const interpolatedInput = interpolate(input, context);
  action.validate(interpolatedInput);
  return action.execute(interpolatedInput);
}
