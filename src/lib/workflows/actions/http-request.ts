import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

const HttpRequestInputSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  timeout: z.number().optional(),
}, {});

export interface HttpRequestInput extends ActionInput {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface HttpRequestOutput extends ActionOutput {
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

export const httpRequestAction: WorkflowAction<
  HttpRequestInput,
  HttpRequestOutput
> = {
  type: "http_request",

  validate: (input) => {
    HttpRequestInputSchema.parse(input);
  },

  execute: async (input) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), input.timeout || 10000);

    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: {
          "Content-Type": "application/json",
          ...input.headers,
        },
        body: input.body ? JSON.stringify(input.body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        success: response.ok,
        status: response.status,
        data,
        headers,
      };
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
             throw new Error(`Request timed out after ${input.timeout || 10000}ms`);
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`HTTP Request failed: ${message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
