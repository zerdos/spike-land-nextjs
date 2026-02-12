import { chromium } from '@playwright/test';

async function verify() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navigating to Storybook Colors...');
  try {
    await page.goto('http://localhost:3000/storybook/colors', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'verification_colors.png', fullPage: true });
    console.log('Screenshot saved: verification_colors.png');
  } catch (e) {
    console.error('Error visiting storybook colors:', e);
  }

  console.log('Navigating to NYE Counter...');
  try {
    await page.goto('http://localhost:3000/most-epic-nye-counter-ever', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'verification_nye.png', fullPage: true });
    console.log('Screenshot saved: verification_nye.png');
  } catch (e) {
    console.error('Error visiting NYE counter:', e);
  }

  await browser.close();
}

verify().catch(console.error);
