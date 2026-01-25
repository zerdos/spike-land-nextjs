import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { waitForUrlPath } from "../support/helpers/wait-helper";
import { ProfilePage } from "../support/page-objects/ProfilePage";
import type { CustomWorld } from "../support/world";

// Helper to get or create page object
function getProfilePage(world: CustomWorld): ProfilePage {
  if (!world.profilePage) {
    world.profilePage = new ProfilePage(world.page);
  }
  return world.profilePage;
}

// Extend CustomWorld
declare module "../support/world" {
  interface CustomWorld {
    profilePage?: ProfilePage;
    notedProfileInfo?: {
      name: string;
      email: string;
    };
  }
}

When("I navigate to the profile page", async function(this: CustomWorld) {
  const profilePage = getProfilePage(this);
  await profilePage.navigate();
});

Then("I should see the profile page title", async function(this: CustomWorld) {
  const profilePage = getProfilePage(this);
  const title = await profilePage.getPageTitle();
  await expect(title).toBeVisible();
});

Then(
  "I should see my name {string}",
  async function(this: CustomWorld, name: string) {
    const profilePage = getProfilePage(this);
    const userName = await profilePage.getUserName();
    await expect(userName).toHaveText(name);
  },
);

Then(
  "I should see my email {string}",
  async function(this: CustomWorld, email: string) {
    const profilePage = getProfilePage(this);
    const userEmail = await profilePage.getUserEmail();
    await expect(userEmail).toHaveText(email);
  },
);

Then("I should see my user ID", async function(this: CustomWorld) {
  const profilePage = getProfilePage(this);
  const userId = await profilePage.getUserId();
  await expect(userId).toBeVisible();
});

Then("the user ID should not be empty", async function(this: CustomWorld) {
  const profilePage = getProfilePage(this);
  const userId = await profilePage.getUserId();
  const text = await userId.textContent();
  expect(text).toBeTruthy();
  expect(text?.trim().length).toBeGreaterThan(0);
});

Then(
  "I should see the avatar with initials {string}",
  async function(this: CustomWorld, initials: string) {
    const profilePage = getProfilePage(this);
    await profilePage.verifyAvatarInitials(initials);
  },
);

Then(
  "I should see the custom avatar image",
  async function(this: CustomWorld) {
    const profilePage = getProfilePage(this);
    const avatarImage = await profilePage.getAvatarImage();
    await expect(avatarImage).toBeVisible();
  },
);

Then(
  "the avatar should display the image from {string}",
  async function(this: CustomWorld, imageUrl: string) {
    const profilePage = getProfilePage(this);
    const avatarImage = await profilePage.getAvatarImage();
    const src = await avatarImage.getAttribute("src");
    expect(src).toContain(imageUrl);
  },
);

Then(
  "the displayed email should be a valid email format",
  async function(this: CustomWorld) {
    const profilePage = getProfilePage(this);
    const userEmail = await profilePage.getUserEmail();
    const emailText = await userEmail.textContent();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailText).toMatch(emailRegex);
  },
);

Then(
  "the email should contain {string} symbol",
  async function(this: CustomWorld, symbol: string) {
    const profilePage = getProfilePage(this);
    const userEmail = await profilePage.getUserEmail();
    const emailText = await userEmail.textContent();
    expect(emailText).toContain(symbol);
  },
);

// NOTE: "I am on the home page" step is defined in home-page.steps.ts

Then("I should be on the profile page", async function(this: CustomWorld) {
  await waitForUrlPath(this.page, "/profile", { timeout: 10000, exact: true });
});

Then("I should see my profile information", async function(this: CustomWorld) {
  const profilePage = getProfilePage(this);
  const userName = await profilePage.getUserName();
  const userEmail = await profilePage.getUserEmail();
  await expect(userName).toBeVisible();
  await expect(userEmail).toBeVisible();
});

When("I note my displayed information", async function(this: CustomWorld) {
  const profilePage = getProfilePage(this);
  const userName = await profilePage.getUserName();
  const userEmail = await profilePage.getUserEmail();

  this.notedProfileInfo = {
    name: (await userName.textContent()) || "",
    email: (await userEmail.textContent()) || "",
  };
});

Then(
  "I should see the same profile information",
  async function(this: CustomWorld) {
    const profilePage = getProfilePage(this);
    const userName = await profilePage.getUserName();
    const userEmail = await profilePage.getUserEmail();

    if (this.notedProfileInfo) {
      await expect(userName).toHaveText(this.notedProfileInfo.name);
      await expect(userEmail).toHaveText(this.notedProfileInfo.email);
    }
  },
);

Then(
  "my name should still be {string}",
  async function(this: CustomWorld, name: string) {
    const profilePage = getProfilePage(this);
    const userName = await profilePage.getUserName();
    await expect(userName).toHaveText(name);
  },
);

Then(
  "my email should still be {string}",
  async function(this: CustomWorld, email: string) {
    const profilePage = getProfilePage(this);
    const userEmail = await profilePage.getUserEmail();
    await expect(userEmail).toHaveText(email);
  },
);

// Navigation assertions for profile page
Then(
  "the page URL should be {string}",
  async function(this: CustomWorld, expectedPath: string) {
    await waitForUrlPath(this.page, expectedPath, { timeout: 10000 });
  },
);

Then(
  "I should be redirected to the home page",
  async function(this: CustomWorld) {
    await waitForUrlPath(this.page, "/", { timeout: 10000, exact: true });
  },
);

Then("I should see the login options", async function(this: CustomWorld) {
  // Look for sign-in link or buttons
  const signInLink = this.page.getByRole("link", { name: /sign in/i });
  const signInButton = this.page.getByRole("button", { name: /sign in|log in/i });
  const authButtons = signInLink.or(signInButton);
  await expect(authButtons.first()).toBeVisible({ timeout: 10000 });
});

When("I reload the page", async function(this: CustomWorld) {
  await this.page.reload();
  await this.page.waitForLoadState("networkidle");
});
