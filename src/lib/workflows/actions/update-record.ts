import {
  WorkflowAction,
  ActionInput,
  ActionOutput,
} from "./action-types";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { UPDATABLE_MODELS } from "./updatable-models";
import { retry } from "./retry";

// Define the input schema for the update-record action
const UpdateRecordInputSchema = z.object({
  model: z.enum(UPDATABLE_MODELS),
  id: z.string(),
  data: z.record(z.any()),
});

// Define the input and output types for the action
export interface UpdateRecordInput extends ActionInput {
  model: typeof UPDATABLE_MODELS[number];
  id: string;
  data: Record<string, any>;
}

export interface UpdateRecordOutput extends ActionOutput {
  updatedRecord?: any;
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

      const updatedRecord = await prisma[model].update({
        where: { id },
        data,
      });

      return {
        success: true,
        updatedRecord,
      };
    });
  },
};
