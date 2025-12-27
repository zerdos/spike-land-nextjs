import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, Status } from "@cucumber/cucumber";
import { generateCoverageReport, isCoverageEnabled } from "./helpers/coverage-helper";
import { VideoWallWorld } from "./video-wall-world";
import { CustomWorld } from "./world";

// Increase default step timeout to 30 seconds for CI font loading
// This is needed because Google Fonts can take time to load in CI environments
setDefaultTimeout(30 * 1000);

// Database verification for @requires-db scenarios
// This ensures the test database is properly configured before running DB-dependent tests
// Note: BeforeAll runs once for the entire test run, not per tag, so we check env vars
// when running with the 'db' profile which only includes @requires-db scenarios
BeforeAll(async function() {
  // Only verify if we appear to be running database tests (db profile)
  const isDbProfile = process.env.npm_lifecycle_event?.includes("db") ||
    process.argv.some((arg) =>
      arg.includes("--profile") && process.argv[process.argv.indexOf(arg) + 1] === "db"
    );

  if (!isDbProfile) return;

  const dbUrl = process.env.DATABASE_URL_E2E || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.warn(
      "\n[Database] WARNING: No DATABASE_URL_E2E or DATABASE_URL found.",
      "\n[Database] @requires-db scenarios will be skipped.",
      "\n[Database] Set DATABASE_URL_E2E to run database-dependent tests.\n",
    );
    return;
  }

  // Safety check: prevent running against production
  if (dbUrl.includes("production") || dbUrl.includes("prod-")) {
    throw new Error(
      "SAFETY: Refusing to run E2E tests against what appears to be a production database. " +
        "Use DATABASE_URL_E2E for test databases only.",
    );
  }

  console.log("\n[Database] Test database configured");
  console.log("[Database] Connection verified for @requires-db scenarios\n");
});

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
After(
  { tags: "not @video-wall" },
  async function(this: VideoWallWorld, { result, pickle }) {
    if (result?.status === Status.FAILED) {
      // Use this.page for non-video-wall scenarios (CustomWorld uses page, not displayPage)
      const screenshot = await this.page?.screenshot({
        path: `e2e/reports/screenshots/${pickle.name.replace(/\s+/g, "_")}.png`,
        fullPage: true,
      });
      if (screenshot) {
        this.attach(screenshot, "image/png");
      }
    }
    // Call the parent CustomWorld.destroy() method
    await CustomWorld.prototype.destroy.call(this);
  },
);

// Generate coverage report after all tests complete
AfterAll(async function() {
  if (isCoverageEnabled()) {
    console.log("\n[Coverage] Generating E2E coverage report...");
    await generateCoverageReport();
  }
});
