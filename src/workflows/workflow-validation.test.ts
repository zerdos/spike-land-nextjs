import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Tests to validate workflow configuration and directives
 *
 * These tests verify that workflow files have the required directives
 * that the Vercel Workflow SDK needs to function correctly.
 *
 * Without these directives, workflows will fail with:
 * "'start' received an invalid workflow function"
 */
describe("Workflow Configuration Validation", () => {
  const workflowsDir = path.join(process.cwd(), "src/workflows");

  describe("enhance-image.workflow.ts", () => {
    const filePath = path.join(workflowsDir, "enhance-image.workflow.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    it("should have 'use workflow' directive in enhanceImage function", () => {
      // The enhanceImage function must have "use workflow" directive
      expect(content).toContain('"use workflow"');
    });

    it("should export enhanceImage function", () => {
      expect(content).toMatch(/export async function enhanceImage/);
    });

    it("should have 'use step' directives for workflow steps", () => {
      // Count the number of "use step" directives
      const stepMatches = content.match(/"use step"/g);
      expect(stepMatches).not.toBeNull();
      // We expect multiple steps (at least 5 based on the workflow structure)
      expect(stepMatches!.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("batch-enhance.workflow.ts", () => {
    const filePath = path.join(workflowsDir, "batch-enhance.workflow.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    it("should have 'use workflow' directive in batchEnhanceImages function", () => {
      expect(content).toContain('"use workflow"');
    });

    it("should export batchEnhanceImages function", () => {
      expect(content).toMatch(/export async function batchEnhanceImages/);
    });

    it("should have 'use step' directives for workflow steps", () => {
      const stepMatches = content.match(/"use step"/g);
      expect(stepMatches).not.toBeNull();
      expect(stepMatches!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Workflow SDK Integration", () => {
    it("should import FatalError from workflow package", () => {
      const enhanceFile = path.join(workflowsDir, "enhance-image.workflow.ts");
      const content = fs.readFileSync(enhanceFile, "utf-8");
      expect(content).toMatch(/import.*FatalError.*from ["']workflow["']/);
    });

    it("should use workflow/api start function in API routes", () => {
      const routePath = path.join(
        process.cwd(),
        "src/app/api/images/enhance/route.ts",
      );
      const content = fs.readFileSync(routePath, "utf-8");
      expect(content).toMatch(/import.*start.*from ["']workflow\/api["']/);
      expect(content).toContain("start(enhanceImage");
    });
  });
});
