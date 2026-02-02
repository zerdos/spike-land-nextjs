import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

const TransformDataInputSchema = z.object({
  data: z.any(),
  transformation: z.enum(["map", "filter", "pick", "omit"]),
  config: z.any(),
});

export interface TransformDataInput extends ActionInput {
  data: any;
  transformation: "map" | "filter" | "pick" | "omit";
  config: any;
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
    let result = input.data;

    try {
      switch (input.transformation) {
        case "pick":
          if (typeof result !== "object" || result === null) {
             throw new Error("Data must be an object for pick transformation");
          }
          const keysToPick = Array.isArray(input.config) ? input.config : [input.config];
          const picked: Record<string, any> = {};
          keysToPick.forEach((key: string) => {
            if (key in result) {
              picked[key] = result[key];
            }
          });
          result = picked;
          break;
        case "omit":
          if (typeof result !== "object" || result === null) {
             throw new Error("Data must be an object for omit transformation");
          }
          const keysToOmit = Array.isArray(input.config) ? input.config : [input.config];
          const omitted = { ...result };
          keysToOmit.forEach((key: string) => {
            delete omitted[key];
          });
          result = omitted;
          break;
        // Simple map/filter implementation (in real world could use jsonpath or similar)
        case "map":
             // Placeholder for complex map logic.
             // Ideally we'd allow a simplified expression or function.
             // For now, let's assume we map an array of objects to an array of a specific property.
             if (!Array.isArray(result)) {
                 throw new Error("Data must be an array for map transformation");
             }
             if (typeof input.config === "string") {
                 result = result.map(item => item[input.config]);
             }
             break;
         case "filter":
             if (!Array.isArray(result)) {
                 throw new Error("Data must be an array for filter transformation");
             }
             // config: { key: "status", value: "active" }
             if (typeof input.config === "object" && input.config.key) {
                 result = result.filter(item => item[input.config.key] === input.config.value);
             }
             break;
        default:
          throw new Error(`Unsupported transformation: ${input.transformation}`);
      }

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transformation failed",
        result: null,
      };
    }
  },
};
