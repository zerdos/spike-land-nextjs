import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";
import { interpolate } from "./interpolation";

const TransformDataInputSchema = z.object({
  source: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]),
  template: z.union([
    z.record(z.string(), z.unknown()),
    z.array(z.unknown()),
    z.string(),
  ]),
});

export interface TransformDataInput extends ActionInput {
  source: Record<string, unknown> | unknown[];
  template: Record<string, unknown> | unknown[] | string;
}

export interface TransformDataOutput extends ActionOutput {
  result: unknown;
}

export const transformDataAction: WorkflowAction<
  TransformDataInput,
  TransformDataOutput
> = {
  type: "transform_data",

  validate: (input) => {
    TransformDataInputSchema.parse(input);
  },

  execute: async (input) => {
    // We treat 'source' as the context for interpolation
    // If source is an array, we might need to wrap it to access it via indices or just pass it as context if it's an object.
    // However, interpolate expects Record<string, unknown>.

    let context: Record<string, unknown>;

    if (Array.isArray(input.source)) {
      context = { items: input.source };
    } else {
      context = input.source as Record<string, unknown>;
    }

    const result = interpolate(input.template, context);

    return {
      success: true,
      result,
    };
  },
};
