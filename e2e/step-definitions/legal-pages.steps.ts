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

    // Wait for smooth scroll to complete and verify the section is near the top of viewport
    // Allow for sticky header (up to 150px) and some margin for smooth scroll settling
    await this.page.waitForFunction(
      (id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        // Section top should be near the viewport top (within 200px to account for headers)
        // and the section should be at least partially visible
        return rect.top >= -50 && rect.top <= 200 && rect.bottom > 0;
      },
      sectionId,
      { timeout: 2000 },
    );
  },
);
