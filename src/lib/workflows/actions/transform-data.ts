import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

const TransformDataInputSchema = z.object({
  data: z.any(),
  transformation: z.string(), // We'll use a simple JSON mapping or expression later, for now maybe just identity or simple extraction
  type: z.enum(["map", "filter", "extract"]).default("map"),
});

export interface TransformDataInput extends ActionInput {
  data: any;
  transformation: string;
  type: "map" | "filter" | "extract";
}

export interface TransformDataOutput extends ActionOutput {
  result: any;
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
    // Basic implementation for now.
    // In a real system, we might use jsonpath or similar.
    // Here we'll support simple property extraction if type is extract

    let result = input.data;

    if (input.type === "extract") {
        if (input.data && typeof input.data === 'object') {
            const path = input.transformation.split('.');
            let current = input.data;
            for (const key of path) {
                if (current && typeof current === 'object' && key in current) {
                    current = current[key];
                } else {
                    current = undefined;
                    break;
                }
            }
            result = current;
        }
    } else if (input.type === "map") {
         // Placeholder: logic for mapping
         // For now just return data
    }

    return {
      success: true,
      result,
    };
  },
};
