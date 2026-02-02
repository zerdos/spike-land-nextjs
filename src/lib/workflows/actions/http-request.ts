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

// Simple check for private IPs (not exhaustive but covers common cases)
function isPrivateIp(hostname: string): boolean {
  if (hostname === "localhost") return true;

  // IPv4 checks
  if (hostname.startsWith("127.")) return true;
  if (hostname.startsWith("10.")) return true;
  if (hostname.startsWith("192.168.")) return true;
  if (hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) return true;

  // IPv6 checks (simple)
  if (hostname === "::1") return true;
  if (hostname.startsWith("fc00:")) return true;
  if (hostname.startsWith("fe80:")) return true;

  return false;
}

export const httpRequestAction: WorkflowAction<
  HttpRequestInput,
  HttpRequestOutput
> = {
  type: "http_request",

  validate: (input) => {
    HttpRequestInputSchema.parse(input);

    // Additional security check
    try {
      const url = new URL(input.url);
      if (isPrivateIp(url.hostname)) {
        throw new Error("Requests to private networks are not allowed");
      }
    } catch (e) {
      if (e instanceof z.ZodError) throw e;
      throw new Error("Invalid URL or restricted host");
    }
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
