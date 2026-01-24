import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { waitForUrlPath } from "../support/helpers/wait-helper";
import { MyAppsPage } from "../support/page-objects/MyAppsPage";
import type { CustomWorld } from "../support/world";

// Helper to get or create page object
function getMyAppsPage(world: CustomWorld): MyAppsPage {
  if (!world.myAppsPage) {
    world.myAppsPage = new MyAppsPage(world.page);
  }
  return world.myAppsPage;
}

// Helper to set up API mocking for my-apps routes
async function setupMyAppsApiMocking(world: CustomWorld) {
  // Mock the stats endpoint to prevent database errors
  await world.page.route("**/api/my-apps/stats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        overview: {
          totalApps: 0,
          activeApps: 0,
          archivedApps: 0,
          totalMessages: 0,
          myMessages: 0,
          agentReplies: 0,
          responseRate: 0,
        },
        statusBreakdown: {},
        recentApps: [],
        activityTrend: [],
        generatedAt: new Date().toISOString(),
      }),
    });
  });

  // Mock the apps list endpoint
  await world.page.route("**/api/my-apps?*", async (route) => {
    const apps = world.createdApps || [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        apps: apps.map((app, i) => ({
          id: `app-${i + 1}`,
          name: app.name,
          status: app.status === "Active" ? "LIVE" : "PROMPTING",
          description: `Description for ${app.name}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        pagination: { total: apps.length, page: 1, limit: 20 },
      }),
    });
  });
}

// Extend CustomWorld with myAppsPage property
declare module "../support/world" {
  interface CustomWorld {
    myAppsPage?: MyAppsPage;
    createdApps?: Array<{ name: string; status: string; }>;
  }
}

When("I navigate to the My Apps page", async function(this: CustomWorld) {
  // Set up API mocking before navigating
  await setupMyAppsApiMocking(this);

  const myAppsPage = getMyAppsPage(this);
  await myAppsPage.navigate();
});

Then("I should see the My Apps page title", async function(this: CustomWorld) {
  const myAppsPage = getMyAppsPage(this);
  const title = await myAppsPage.getPageTitle();
  await expect(title).toBeVisible();
});

Then(
  "the page URL should be {string}",
  async function(this: CustomWorld, url: string) {
    await expect(this.page).toHaveURL(new RegExp(url + "$"));
  },
);

When("I have no apps created", async function(this: CustomWorld) {
  // Clear any apps from localStorage
  await this.page.evaluate(() => {
    localStorage.removeItem("user-apps");
  });
  this.createdApps = [];
});

Then(
  "I should see the empty state message",
  async function(this: CustomWorld) {
    const myAppsPage = getMyAppsPage(this);
    const emptyState = await myAppsPage.getEmptyStateMessage();
    await expect(emptyState).toBeVisible();
  },
);

// NOTE: "I should see {string}" step moved to common.steps.ts

// NOTE: "I should see the {string} button" step is defined in authentication.steps.ts

Then("the button should be enabled", async function(this: CustomWorld) {
  const myAppsPage = getMyAppsPage(this);
  const button = await myAppsPage.getCreateNewAppButton();
  await expect(button).toBeEnabled();
});

// NOTE: "I click the {string} button" step is defined in authentication.steps.ts

// NOTE: "I should be redirected to {string}" step moved to common.steps.ts

Then(
  "I should see the app creation wizard",
  async function(this: CustomWorld) {
    const wizardTitle = this.page.getByRole("heading", {
      name: /Create New App|App Creation/i,
    });
    await expect(wizardTitle).toBeVisible();
  },
);

Then("I should see the search input field", async function(this: CustomWorld) {
  const myAppsPage = getMyAppsPage(this);
  const searchInput = await myAppsPage.getSearchInput();
  await expect(searchInput).toBeVisible();
});

Then(
  "the search input should have placeholder {string}",
  async function(this: CustomWorld, placeholder: string) {
    const myAppsPage = getMyAppsPage(this);
    const searchInput = await myAppsPage.getSearchInput();
    await expect(searchInput).toHaveAttribute("placeholder", placeholder);
  },
);

When(
  "I type {string} in the search field",
  async function(this: CustomWorld, query: string) {
    const myAppsPage = getMyAppsPage(this);
    await myAppsPage.searchApps(query);
  },
);

Then(
  "the search field should contain {string}",
  async function(this: CustomWorld, value: string) {
    const myAppsPage = getMyAppsPage(this);
    const searchInput = await myAppsPage.getSearchInput();
    await expect(searchInput).toHaveValue(value);
  },
);

Then(
  "I should see the {string} filter button",
  async function(this: CustomWorld, filterName: string) {
    const button = this.page.getByRole("button", {
      name: filterName,
      exact: true,
    });
    await expect(button).toBeVisible();
  },
);

Then(
  "the {string} filter should be active",
  async function(this: CustomWorld, filterName: string) {
    const button = this.page.getByRole("button", {
      name: filterName,
      exact: true,
    });
    await expect(button).toHaveAttribute("data-state", "active");
  },
);

Then(
  "the {string} filter should not be active",
  async function(this: CustomWorld, filterName: string) {
    const button = this.page.getByRole("button", {
      name: filterName,
      exact: true,
    });
    await expect(button).not.toHaveAttribute("data-state", "active");
  },
);

When(
  "I click the {string} filter button",
  async function(this: CustomWorld, filterName: string) {
    const myAppsPage = getMyAppsPage(this);
    await myAppsPage.clickFilter(filterName as "All" | "Active" | "Draft");
  },
);

When(
  "I have {int} apps created",
  async function(this: CustomWorld, count: number) {
    // Create mock apps in localStorage
    const apps = [];
    for (let i = 1; i <= count; i++) {
      apps.push({
        id: `app-${i}`,
        name: `Test App ${i}`,
        status: "Active",
        description: `Description for app ${i}`,
      });
    }

    // Store for API mocking
    this.createdApps = apps;

    await this.page.evaluate((appsData) => {
      localStorage.setItem("user-apps", JSON.stringify(appsData));
    }, apps);

    // Re-setup API mocking with the new apps data before reload
    await setupMyAppsApiMocking(this);

    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "I should see {int} app cards",
  async function(this: CustomWorld, count: number) {
    const myAppsPage = getMyAppsPage(this);
    await myAppsPage.verifyAppCount(count);
  },
);

Then(
  "I should not see the empty state message",
  async function(this: CustomWorld) {
    const myAppsPage = getMyAppsPage(this);
    const emptyState = await myAppsPage.getEmptyStateMessage();
    await expect(emptyState).not.toBeVisible();
  },
);

When(
  "I have an app named {string} with status {string}",
  async function(this: CustomWorld, name: string, status: string) {
    const app = {
      id: "app-1",
      name,
      status,
      description: `Description for ${name}`,
    };

    // Store for API mocking
    this.createdApps = [app];

    await this.page.evaluate((appData) => {
      localStorage.setItem("user-apps", JSON.stringify([appData]));
    }, app);

    // Re-setup API mocking with the new apps data before reload
    await setupMyAppsApiMocking(this);

    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
  },
);

Then(
  "I should see the app card for {string}",
  async function(this: CustomWorld, appName: string) {
    const myAppsPage = getMyAppsPage(this);
    const card = await myAppsPage.getAppCardByName(appName);
    await expect(card).toBeVisible();
  },
);

Then(
  "the app card should show status {string}",
  async function(this: CustomWorld, status: string) {
    const statusBadge = this.page.locator('[data-testid="app-status"]', {
      hasText: status,
    });
    await expect(statusBadge).toBeVisible();
  },
);

When(
  "I have an app named {string}",
  async function(this: CustomWorld, name: string) {
    const app = {
      id: "app-1",
      name,
      status: "Active",
      description: `Description for ${name}`,
    };

    // Store for API mocking
    this.createdApps = [app];

    await this.page.evaluate((appData) => {
      localStorage.setItem("user-apps", JSON.stringify([appData]));
    }, app);

    // Re-setup API mocking with the new apps data before reload
    await setupMyAppsApiMocking(this);

    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
  },
);

When(
  "I click on the app card for {string}",
  async function(this: CustomWorld, appName: string) {
    const myAppsPage = getMyAppsPage(this);
    await myAppsPage.clickAppCard(appName);
  },
);

Then(
  "I should be redirected to the app details page",
  async function(this: CustomWorld) {
    await expect(this.page).toHaveURL(/\/my-apps\/.+/);
  },
);

// NOTE: "I am not logged in" step is defined in authentication.steps.ts

Then(
  "I should be redirected to the home page",
  async function(this: CustomWorld) {
    // Wait for SSR redirect to complete
    await waitForUrlPath(this.page, "/", { timeout: 10000, exact: false });
  },
);

Then("I should see the login options", async function(this: CustomWorld) {
  const githubButton = this.page.getByRole("button", {
    name: /Continue with GitHub/i,
  });
  const googleButton = this.page.getByRole("button", {
    name: /Continue with Google/i,
  });
  await expect(githubButton).toBeVisible();
  await expect(googleButton).toBeVisible();
});

// NOTE: "I log out and log in as {string} with email {string}" step is defined in authentication.steps.ts
// The authentication step doesn't clear localStorage, so if needed for testing user isolation,
// add localStorage.clear() to the test scenario itself.
