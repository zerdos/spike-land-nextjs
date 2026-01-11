import { sendTextEmail } from "@/lib/email/client";
import { postToSlack } from "@/lib/notifications/slack-channel";
import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";
import { retry } from "./retry";

// Define the input schema for the send-notification action
const SendNotificationInputSchema = z.object({
  channel: z.enum(["email", "slack", "webhook"]),
  recipient: z.string(),
  message: z.string(),
  subject: z.string().optional(),
  webhookUrl: z.string().url().optional(),
});

// Define the input and output types for the action
export interface SendNotificationInput extends ActionInput {
  channel: "email" | "slack" | "webhook";
  recipient: string;
  message: string;
  subject?: string;
  webhookUrl?: string;
}

export interface SendNotificationOutput extends ActionOutput {
  deliveryStatus: string;
}

// Implement the send-notification action
export const sendNotificationAction: WorkflowAction<
  SendNotificationInput,
  SendNotificationOutput
> = {
  type: "send_notification",

  validate: (input) => {
    SendNotificationInputSchema.parse(input);
  },

  execute: async (input) => {
    return retry(async () => {
      switch (input.channel) {
        case "email": {
          const result = await sendTextEmail({
            to: input.recipient,
            subject: input.subject || "Notification",
            text: input.message,
          });
          if (!result.success) {
            throw new Error(result.error || "Failed to send email");
          }
          return {
            success: true,
            deliveryStatus: "EMAIL_SENT",
          };
        }
        case "slack":
          await postToSlack(input.recipient, { text: input.message });
          return {
            success: true,
            deliveryStatus: "SLACK_MESSAGE_SENT",
          };
        case "webhook": {
          if (!input.webhookUrl) {
            throw new Error("Webhook URL is required for webhook notifications");
          }
          const response = await fetch(input.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: input.message }),
          });
          if (!response.ok) {
            throw new Error(`Webhook failed with status: ${response.status}`);
          }
          return {
            success: true,
            deliveryStatus: "WEBHOOK_SUCCESS",
          };
        }
        default:
          throw new Error("Unsupported notification channel");
      }
    });
  },
};
