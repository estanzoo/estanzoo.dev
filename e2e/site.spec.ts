// The real built site (npm run build, served by vite preview) at each project width:
// the whole page hydrates with no console error or warning (React reports hydration
// mismatches there), does not scroll sideways, and matches its full-page baseline.
// The intro is skipped through the sessionStorage flag the Hero reads.
import { expect, test } from '@playwright/test';
import { screenshotName } from '../tools/screenshots/shots';

test('site/full', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => sessionStorage.setItem('intro-seen', '1'));

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('html')).not.toHaveAttribute('data-intro');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot(screenshotName({ section: 'site', state: 'full' }), { fullPage: true });

  const width = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect(problems).toEqual([]);
});
