import { After, AfterAll, Before, setDefaultTimeout, Status } from "@cucumber/cucumber";
import { generateCoverageReport, isCoverageEnabled } from "./helpers/coverage-helper";
import { VideoWallWorld } from "./video-wall-world";
import { CustomWorld } from "./world";

// Increase default step timeout to 30 seconds for CI font loading
// This is needed because Google Fonts can take time to load in CI environments
setDefaultTimeout(30 * 1000);

// Clean localStorage before each scenario to prevent test pollution
// This ensures each test starts with a clean slate
Before(async function(this: CustomWorld) {
  if (this.page) {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
});

// Only run generic setup for non-video-wall scenarios
// Note: VideoWallWorld is the actual world constructor for all scenarios,
// but we call the parent CustomWorld.init() for non-video-wall scenarios
Before({ tags: "not @video-wall" }, async function(this: VideoWallWorld) {
  // Call the parent CustomWorld.init() method explicitly
  await CustomWorld.prototype.init.call(this);
});

// Only run generic teardown for non-video-wall scenarios
After({ tags: "not @video-wall" }, async function(this: VideoWallWorld, { result, pickle }) {
  if (result?.status === Status.FAILED) {
    const screenshot = await this.displayPage?.screenshot({
      path: `e2e/reports/screenshots/${pickle.name.replace(/\s+/g, "_")}.png`,
      fullPage: true,
    });
    if (screenshot) {
      this.attach(screenshot, "image/png");
    }
  }
  // Call the parent CustomWorld.destroy() method
  await CustomWorld.prototype.destroy.call(this);
});

// Generate coverage report after all tests complete
AfterAll(async function() {
  if (isCoverageEnabled()) {
    console.log("\n[Coverage] Generating E2E coverage report...");
    await generateCoverageReport();
  }
});
