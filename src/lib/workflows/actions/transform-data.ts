import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

const TransformDataInputSchema = z.object({
  data: z.unknown(),
  transformation: z.enum(["map", "filter", "pick", "omit"]),
  config: z.unknown(),
});

export interface TransformDataInput extends ActionInput {
  data: unknown;
  transformation: "map" | "filter" | "pick" | "omit";
  config: unknown;
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
    let result = input.data;

    try {
      switch (input.transformation) {
        case "pick":
          if (typeof result !== "object" || result === null) {
            throw new Error("Data must be an object for pick transformation");
          }
          const keysToPick =
            (Array.isArray(input.config) ? input.config : [input.config]) as string[];
          const picked: Record<string, unknown> = {};
          const pickSource = result as Record<string, unknown>;
          keysToPick.forEach((key: string) => {
            if (key in pickSource) {
              picked[key] = pickSource[key];
            }
          });
          result = picked;
          break;
        case "omit":
          if (typeof result !== "object" || result === null) {
            throw new Error("Data must be an object for omit transformation");
          }
          const keysToOmit =
            (Array.isArray(input.config) ? input.config : [input.config]) as string[];
          const omitted = { ...(result as Record<string, unknown>) };
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
            result = result.map((item: Record<string, unknown>) => item[input.config as string]);
          }
          break;
        case "filter":
          if (!Array.isArray(result)) {
            throw new Error("Data must be an array for filter transformation");
          }
          // config: { key: "status", value: "active" }
          const cfg = input.config as { key: string; value: unknown; };
          if (typeof cfg === "object" && cfg.key) {
            result = result.filter((item: Record<string, unknown>) => item[cfg.key] === cfg.value);
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
