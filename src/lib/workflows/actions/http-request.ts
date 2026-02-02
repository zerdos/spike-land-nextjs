import { z } from "zod";
import type { ActionInput, ActionOutput, WorkflowAction } from "./action-types";

const HttpRequestInputSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  timeout: z.number().optional().default(5000),
});

export interface HttpRequestInput extends ActionInput {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface HttpRequestOutput extends ActionOutput {
  status: number;
  data: any;
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
    const id = setTimeout(() => controller.abort(), input.timeout || 5000);

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

      clearTimeout(id);

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Convert Headers to Record<string, string>
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        throw new Error(`HTTP Request failed with status: ${response.status}`);
      }

      return {
        success: true,
        status: response.status,
        data,
        headers: responseHeaders,
      };
    } catch (error) {
      clearTimeout(id);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
        data: null,
        headers: {},
      };
    }
  },
};
