import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

// Click anchor links in table of contents
When(
  "I click the {string} anchor link",
  async function(this: CustomWorld, linkText: string) {
    const link = this.page.getByRole("link", { name: linkText });
    await expect(link).toBeVisible();
    await link.click();
    // Wait a moment for smooth scroll
    await this.page.waitForTimeout(500);
  },
);

// Verify page scrolled to section
Then(
  "the page should scroll to the {string} section",
  async function(this: CustomWorld, sectionId: string) {
    const section = this.page.locator(`#${sectionId}`);
    await expect(section).toBeVisible();

    // Verify the section is in viewport
    const isInViewport = await section.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= window.innerHeight;
    });

    expect(isInViewport).toBe(true);
  },
);
