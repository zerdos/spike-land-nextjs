import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("next.config.ts", () => {
  const configPath = path.join(process.cwd(), "next.config.ts");
  const content = fs.readFileSync(configPath, "utf-8");

  it("should NOT import withWorkflow from workflow/next (workflow removed)", () => {
    expect(content).not.toContain('import { withWorkflow } from "workflow/next"');
  });

  it("should export nextConfig directly without workflow wrapper", () => {
    // Check that the export is direct, without withWorkflow
    expect(content).toMatch(/export default nextConfig\s*;/);
  });

  it("should NOT use withWorkflow wrapper", () => {
    // Ensure we don't have the workflow wrapper
    const workflowWrapperMatch = content.match(/withWorkflow\(/);
    expect(workflowWrapperMatch).toBeNull();
  });
});
