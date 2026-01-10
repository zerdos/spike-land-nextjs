import type { topicKeywordsSchema } from "@/lib/scout/topic-config";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { buildTwitterQuery } from "./twitter"; // Assuming the function is exported from here

describe("buildTwitterQuery", () => {
  it("should handle only AND keywords", () => {
    const keywords: z.infer<typeof topicKeywordsSchema> = {
      and: ["ai", "development"],
    };
    expect(buildTwitterQuery(keywords as any)).toBe("ai development");
  });

  it("should handle only OR keywords", () => {
    const keywords: z.infer<typeof topicKeywordsSchema> = {
      or: ["gpt-4", "claude"],
    };
    expect(buildTwitterQuery(keywords as any)).toBe("(gpt-4 OR claude)");
  });

  it("should handle only NOT keywords", () => {
    const keywords: z.infer<typeof topicKeywordsSchema> = {
      not: ["crypto", "nft"],
    };
    expect(buildTwitterQuery(keywords as any)).toBe("-crypto -nft");
  });

  it("should handle a combination of AND, OR, and NOT keywords", () => {
    const keywords: z.infer<typeof topicKeywordsSchema> = {
      and: ["social media"],
      or: ["monitoring", "analytics"],
      not: ["jobs"],
    };
    expect(buildTwitterQuery(keywords as any)).toBe("social media (monitoring OR analytics) -jobs");
  });

  it("should handle an empty keywords object", () => {
    const keywords: z.infer<typeof topicKeywordsSchema> = {};
    expect(buildTwitterQuery(keywords as any)).toBe("");
  });

  it("should handle keywords with empty arrays", () => {
    const keywords: z.infer<typeof topicKeywordsSchema> = {
      and: [],
      or: [],
      not: [],
    };
    expect(buildTwitterQuery(keywords as any)).toBe("");
  });
});
