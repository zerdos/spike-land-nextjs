import { After, Before, Status } from "@cucumber/cucumber";
import { VideoWallWorld } from "./video-wall-world";

// Only run video wall setup for scenarios tagged with @video-wall
Before({ tags: "@video-wall" }, async function(this: VideoWallWorld) {
  await this.init();
});

// Only run video wall teardown for scenarios tagged with @video-wall
After({ tags: "@video-wall" }, async function(this: VideoWallWorld, { result, pickle }) {
  if (result?.status === Status.FAILED) {
    // Take screenshot of display page (with null check)
    if (this.displayPage) {
      try {
        const displayScreenshot = await this.displayPage.screenshot({
          path: `e2e/reports/screenshots/${pickle.name.replace(/\s+/g, "_")}_display.png`,
          fullPage: true,
        });
        this.attach(displayScreenshot, "image/png");
      } catch (error) {
        console.error("Failed to capture display page screenshot:", error);
      }
    }

    // Take screenshots of all client pages
    const clientContexts = this.getAllClientContexts?.() || [];
    for (let i = 0; i < clientContexts.length; i++) {
      const clientContext = clientContexts[i];
      if (clientContext) {
        try {
          const clientScreenshot = await clientContext.page.screenshot({
            path: `e2e/reports/screenshots/${pickle.name.replace(/\s+/g, "_")}_client_${i}.png`,
            fullPage: true,
          });
          this.attach(clientScreenshot, "image/png");
        } catch (error) {
          console.error(`Failed to capture screenshot for client ${i}:`, error);
        }
      }
    }
  }

  await this.destroy?.();
});
