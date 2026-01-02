import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { CustomWorld } from "../support/world";

Given(
  "I am on the tabletop simulator page",
  async function(this: CustomWorld) {
    await this.page.goto("/apps/tabletop-simulator");
  },
);

// Used generic "I click {string}" step from app-creation-flow.steps.ts

Then(
  "I should be redirected to a game room",
  async function(this: CustomWorld) {
    await this.page.waitForURL(/\/apps\/tabletop-simulator\/room\/.+/);
  },
);

When(
  "I enter a room code {string}",
  async function(this: CustomWorld, code: string) {
    await this.page.fill('input[placeholder="Enter Room Code"]', code);
  },
);

Then(
  "I should be redirected to room {string}",
  async function(this: CustomWorld, code: string) {
    await this.page.waitForURL((url) => url.pathname.endsWith(code));
  },
);

Given("I am in a game room", async function(this: CustomWorld) {
  await this.page.goto("/apps/tabletop-simulator/room/test-room");
});

// "I should see the controls panel" step is defined in tabletop.steps.ts

Then("I should see the video overlay", async function(this: CustomWorld) {
  // Video overlay container is always rendered, but video elements depend on streams
  await expect(this.page.locator('[data-testid="video-overlay"]'))
    .toBeVisible();
});
