import { Before, After, Status } from '@cucumber/cucumber';
import { CustomWorld } from './world';

Before(async function (this: CustomWorld) {
  await this.init();
});

After(async function (this: CustomWorld, { result, pickle }) {
  if (result?.status === Status.FAILED) {
    const screenshot = await this.page.screenshot({
      path: `e2e/reports/screenshots/${pickle.name.replace(/\s+/g, '_')}.png`,
      fullPage: true,
    });
    this.attach(screenshot, 'image/png');
  }
  await this.destroy();
});
