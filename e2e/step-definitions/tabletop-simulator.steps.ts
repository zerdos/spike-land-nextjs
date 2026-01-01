import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "./world"; // Assuming world pattern

Given("I am on the tabletop simulator page", async function(this: CustomWorld) {
  await this.page.goto("/apps/tabletop-simulator");
});

When('I click "Create New Room"', async function(this: CustomWorld) {
  await this.page.click("text=Create New Room");
});

Then("I should be redirected to a game room", async function(this: CustomWorld) {
  await this.page.waitForURL(/\/apps\/tabletop-simulator\/room\/.+/);
});

When("I enter a room code {string}", async function(this: CustomWorld, code: string) {
  await this.page.fill('input[placeholder="Enter Room Code"]', code);
});

When('I click "Join"', async function(this: CustomWorld) {
  await this.page.click("text=Join");
});

Then("I should be redirected to room {string}", async function(this: CustomWorld, code: string) {
  await this.page.waitForURL((url) => url.pathname.endsWith(code));
});

Given("I am in a game room", async function(this: CustomWorld) {
  await this.page.goto("/apps/tabletop-simulator/room/test-room");
});

Then("I should see the controls panel", async function(this: CustomWorld) {
  await expect(this.page.locator('button[title="Switch to Interact Mode"]')).toBeVisible();
});

Then("I should see the video overlay", async function(this: CustomWorld) {
  // Video overlay might take time to mount/init peer
  // We check for the container
  await expect(this.page.locator("video")).toBeAttached(); // Might not be visible if no stream
});
