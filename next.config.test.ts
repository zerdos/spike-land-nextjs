import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("next.config.ts", () => {
  const configPath = path.join(process.cwd(), "next.config.ts");
  const content = fs.readFileSync(configPath, "utf-8");

  it("should import withWorkflow from workflow/next", () => {
    expect(content).toContain('import { withWorkflow } from "workflow/next"');
  });

  it("should wrap nextConfig with withWorkflow()", () => {
    // Check that the export uses withWorkflow wrapper
    expect(content).toMatch(/export default withWorkflow\(nextConfig\)/);
  });

  it("should not export nextConfig directly without wrapper", () => {
    // Ensure we don't have a bare export (without withWorkflow)
    const bareExportMatch = content.match(/export default nextConfig\s*;/);
    expect(bareExportMatch).toBeNull();
  });
});
