import { Before, After, Status } from '@cucumber/cucumber';
import { VideoWallWorld } from './video-wall-world';
import { CustomWorld } from './world';

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
