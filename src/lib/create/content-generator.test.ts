import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import { describe, expect, it, vi } from "vitest";
import { generateAppContent } from "./content-generator";

vi.mock("@/lib/ai/gemini-client");
vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

describe("content-generator", () => {
  describe("generateAppContent", () => {
    it("should return valid content when AI responds correctly", async () => {
      const mockResponse = {
        title: "Test App",
        description: "A test app",
        code: "export default function App() { return <div>Test</div> }",
        relatedApps: ["test/one", "test/two"],
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      const result = await generateAppContent(["test", "app"]);

      expect(result).toEqual(mockResponse);
      expect(generateStructuredResponse).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('"/create/test/app"'),
      }));
    });

    it("should clean up markdown code blocks", async () => {
      const mockResponse = {
        title: "Test App",
        description: "A test app",
        code: "```tsx\nexport default function App() { return <div>Test</div> }\n```",
        relatedApps: ["test/one"],
      };

      (generateStructuredResponse as any).mockResolvedValue(mockResponse);

      const result = await generateAppContent(["test", "app"]);

      expect(result?.code).toBe("export default function App() { return <div>Test</div> }");
    });

    it("should return null on error", async () => {
      (generateStructuredResponse as any).mockRejectedValue(new Error("AI Error"));

      const result = await generateAppContent(["test", "app"]);

      expect(result).toBeNull();
    });

    it("should return null if keys are missing", async () => {
      // Missing code
      (generateStructuredResponse as any).mockResolvedValue({
        title: "Test",
      });

      const result = await generateAppContent(["test"]);

      expect(result).toBeNull();
    });
  });
});
