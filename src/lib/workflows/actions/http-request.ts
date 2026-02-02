import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

const HttpRequestInputSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  timeout: z.number().optional().default(5000),
});

export interface HttpRequestInput extends ActionInput {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
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
    const id = setTimeout(() => controller.abort(), input.timeout);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...input.headers,
      };

      const body =
        typeof input.body === "object"
          ? JSON.stringify(input.body)
          : input.body;

      const response = await fetch(input.url, {
        method: input.method,
        headers,
        body,
        signal: controller.signal,
      });

      const responseData = await response.text();
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        success: response.ok,
        status: response.status,
        data: parsedData,
        headers: responseHeaders,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: 0,
        data: null,
        headers: {},
      };
    } finally {
      clearTimeout(id);
    }
  },
};
