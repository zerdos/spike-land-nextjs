import { Before, After, Status } from '@cucumber/cucumber';
import { VideoWallWorld } from './video-wall-world';

Before(async function (this: VideoWallWorld) {
  await this.init();
});

After(async function (this: VideoWallWorld, { result, pickle }) {
  if (result?.status === Status.FAILED) {
    // Take screenshot of display page
    const displayScreenshot = await this.displayPage.screenshot({
      path: `e2e/reports/screenshots/${pickle.name.replace(/\s+/g, '_')}_display.png`,
      fullPage: true,
    });
    this.attach(displayScreenshot, 'image/png');

    // Take screenshots of all client pages
    const clientContexts = this.getAllClientContexts();
    for (let i = 0; i < clientContexts.length; i++) {
      const clientContext = clientContexts[i];
      try {
        const clientScreenshot = await clientContext.page.screenshot({
          path: `e2e/reports/screenshots/${pickle.name.replace(/\s+/g, '_')}_client_${i}.png`,
          fullPage: true,
        });
        this.attach(clientScreenshot, 'image/png');
      } catch (error) {
        console.error(`Failed to capture screenshot for client ${i}:`, error);
      }
    }
  }

  await this.destroy();
});
