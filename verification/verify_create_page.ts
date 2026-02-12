import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to /create (long timeout)...');
    await page.goto('http://localhost:3000/create', { timeout: 120000 });

    console.log('Waiting for hero text...');
    await page.waitForSelector('text=Describe it. We build it.', { timeout: 60000 });

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'verification/verification.png', fullPage: true });
    console.log('Screenshot saved to verification/verification.png');

    // Visual checks
    const heroVisible = await page.isVisible('text=Describe it. We build it.');
    console.log('Hero text visible:', heroVisible);

    const chipsVisible = await page.isVisible('text=Try asking for:');
    console.log('Chips visible:', chipsVisible);

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await browser.close();
  }
}

run();
