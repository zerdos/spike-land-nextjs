import { Before, After, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { VideoWallWorld } from './video-wall-world';
import { CustomWorld } from './world';

// Increase default step timeout to 30 seconds for CI font loading
// This is needed because Google Fonts can take time to load in CI environments
setDefaultTimeout(30 * 1000);

// Only run generic setup for non-video-wall scenarios
// Note: VideoWallWorld is the actual world constructor for all scenarios,
// but we call the parent CustomWorld.init() for non-video-wall scenarios
Before({ tags: 'not @video-wall' }, async function (this: VideoWallWorld) {
  // Call the parent CustomWorld.init() method explicitly
  await CustomWorld.prototype.init.call(this);
});

// Only run generic teardown for non-video-wall scenarios
After({ tags: 'not @video-wall' }, async function (this: VideoWallWorld, { result, pickle }) {
  if (result?.status === Status.FAILED) {
    const screenshot = await this.page?.screenshot({
      path: `e2e/reports/screenshots/${pickle.name.replace(/\s+/g, '_')}.png`,
      fullPage: true,
    });
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
  }
  // Call the parent CustomWorld.destroy() method
  await CustomWorld.prototype.destroy.call(this);
});
