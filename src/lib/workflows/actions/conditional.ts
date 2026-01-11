import {
  WorkflowAction,
  ActionInput,
  ActionOutput,
} from "./action-types";
import { z } from "zod";
import { Parser } from "expr-eval";

// Define the input schema for the conditional action
const ConditionalInputSchema = z.object({
  expression: z.string(),
  context: z.record(z.any()),
});

// Define the input and output types for the action
export interface ConditionalInput extends ActionInput {
  expression: string;
  context: Record<string, any>;
}

export interface ConditionalOutput extends ActionOutput {
  result: boolean;
}

// Implement the conditional action
export const conditionalAction: WorkflowAction<
  ConditionalInput,
  ConditionalOutput
> = {
  type: "conditional",

  validate: (input) => {
    ConditionalInputSchema.parse(input);
  },

  execute: async (input) => {
    try {
      const parser = new Parser();
      const result = parser.evaluate(input.expression, input.context);

      return {
        success: true,
        result: !!result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        result: false,
      };
    }
  },
};
