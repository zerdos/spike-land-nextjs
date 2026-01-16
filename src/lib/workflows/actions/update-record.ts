import prisma from "@/lib/prisma";
import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";
import { retry } from "./retry";
import { UPDATABLE_MODELS } from "./updatable-models";

// Define the input schema for the update-record action
const UpdateRecordInputSchema = z.object({
  model: z.enum(UPDATABLE_MODELS),
  id: z.string(),
  data: z.record(z.string(), z.unknown()),
});

// Define the input and output types for the action
export interface UpdateRecordInput extends ActionInput {
  model: (typeof UPDATABLE_MODELS)[number];
  id: string;
  data: Record<string, unknown>;
}

export interface UpdateRecordOutput extends ActionOutput {
  updatedRecord?: unknown;
}

// Implement the update-record action
export const updateRecordAction: WorkflowAction<
  UpdateRecordInput,
  UpdateRecordOutput
> = {
  type: "update_record",

  validate: (input) => {
    UpdateRecordInputSchema.parse(input);
  },

  execute: async (input) => {
    return retry(async () => {
      const { model, id, data } = input;

      let updatedRecord: unknown;

      // Type-safe model dispatch
      switch (model) {
        case "user":
          updatedRecord = await prisma.user.update({
            where: { id },
            data: data as Parameters<typeof prisma.user.update>[0]["data"],
          });
          break;
        case "workspace":
          updatedRecord = await prisma.workspace.update({
            where: { id },
            data: data as Parameters<typeof prisma.workspace.update>[0]["data"],
          });
          break;
        case "userAlbum":
          throw new Error(
            "userAlbum model is not supported for direct updates",
          );
        default:
          throw new Error(`Unsupported model: ${model}`);
      }

      return {
        success: true,
        updatedRecord,
      };
    });
  },
};
