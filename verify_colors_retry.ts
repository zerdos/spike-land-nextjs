import { chromium } from '@playwright/test';

async function verify() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navigating to Storybook Colors...');
  try {
    await page.goto('http://localhost:3000/storybook/colors', { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait a bit for client side rendering
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'verification_colors.png', fullPage: true });
    console.log('Screenshot saved: verification_colors.png');
  } catch (e) {
    console.error('Error visiting storybook colors:', e);
  }

  await browser.close();
}

verify().catch(console.error);
