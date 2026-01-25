import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, Status } from "@cucumber/cucumber";
import { generateCoverageReport, isCoverageEnabled } from "./helpers/coverage-helper";
import type { VideoWallWorld } from "./video-wall-world";
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
  // const isDbProfile = process.env.npm_lifecycle_event?.includes("db") ||
  //   process.argv.some((arg) =>
  //     arg.includes("--profile") &&
  //     process.argv[process.argv.indexOf(arg) + 1] === "db"
  //   );

  // Always check DB safety when running E2E tests
  // if (!isDbProfile) return;

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
});

// Only run generic setup for non-video-wall scenarios
// Note: VideoWallWorld is the actual world constructor for all scenarios,
// but we call the parent CustomWorld.init() for non-video-wall scenarios
Before({ tags: "not @video-wall" }, async function(this: VideoWallWorld) {
  // Call the parent CustomWorld.init() method explicitly
  await CustomWorld.prototype.init.call(this);
});

// Clean localStorage before each scenario to prevent test pollution
// This ensures each test starts with a clean slate
// Note: Cookie consent is pre-set via context.addInitScript() in world.ts,
// which runs BEFORE any page JavaScript on every navigation
Before(async function(this: CustomWorld) {
  if (this.page) {
    try {
      // Clear storage to ensure clean state - the addInitScript will re-set cookie consent
      // on the next navigation, so we don't need to set it here
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch {
      // Ignore SecurityError on about:blank - storage is already clean
    }
  }
});

// Clear session cookies for scenarios that need unauthenticated state
// NextAuth stores sessions in HTTP-only cookies that aren't cleared by localStorage.clear()
Before({ tags: "@requires-no-session" }, async function(this: CustomWorld) {
  if (this.page) {
    // Clear all cookies including HTTP-only session cookies
    await this.page.context().clearCookies();
  }
});

// Set up API mocks for checkout scenarios
// These mocks must be set up AFTER page initialization but BEFORE navigation
Before({ tags: "@requires-api-mock" }, async function(this: CustomWorld) {
  if (!this.page) return;

  // Mock /api/user to return a user
  await this.page.route("**/api/user", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        email: "test@example.com",
        name: "Test User",
      }),
    });
  });

  // Mock /api/merch/cart to return a cart with items
  await this.page.route("**/api/merch/cart", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        cart: {
          items: [
            {
              id: "e2e-item-1",
              productId: "cushion-square",
              name: "Square Cushion",
              price: 29.99,
              quantity: 1,
              imageId: "e2e-image-1",
            },
          ],
        },
      }),
    });
  });

  // Mock /api/merch/checkout to return a valid PaymentIntent response
  await this.page.route("**/api/merch/checkout", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clientSecret: "pi_mock_secret_test",
          orderId: "e2e-mock-order-id",
          orderNumber: "SL-E2E-MOCK",
          summary: {
            subtotal: 29.99,
            shipping: 4.99,
            tax: 6.00,
            total: 40.98,
            currency: "GBP",
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

// Only run generic teardown for non-video-wall scenarios
After(
  { tags: "not @video-wall" },
  async function(this: VideoWallWorld, { result, pickle }) {
    if (result?.status === Status.FAILED) {
      // Use this.page for non-video-wall scenarios (CustomWorld uses page, not displayPage)
      // Wrap in try-catch to handle browser crashes gracefully
      try {
        const screenshot = await this.page?.screenshot({
          path: `e2e/reports/screenshots/${pickle.name.replace(/\s+/g, "_")}.png`,
          fullPage: true,
        });
        if (screenshot) {
          this.attach(screenshot, "image/png");
        }
      } catch (error) {
        // Browser may have crashed, log error but don't fail teardown
        console.error(`Failed to take screenshot: ${(error as Error).message}`);
      }
    }
    // Call the parent CustomWorld.destroy() method - also wrap in try-catch
    try {
      await CustomWorld.prototype.destroy.call(this);
    } catch (error) {
      console.error(`Failed to destroy context: ${(error as Error).message}`);
    }
  },
);

// Generate coverage report after all tests complete
AfterAll(async function() {
  if (isCoverageEnabled()) {
    console.log("\n[Coverage] Generating E2E coverage report...");
    await generateCoverageReport();
  }
});
