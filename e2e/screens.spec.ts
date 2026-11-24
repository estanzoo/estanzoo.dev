// One screenshot per mock state (mocks/<section>/<state>.json) at each project width,
// taken from the standalone page npm run screens:renderAll writes to
// build/screens/<section>/<state>.html. At every width the page must not scroll
// sideways (the Interests film strip is clipped by its .film-window, so it does not
// widen the page).
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { listMocks } from '../tools/screens/screens';
import { screenshotName } from '../tools/screenshots/shots';

const root = fileURLToPath(new URL('..', import.meta.url));

for (const ref of listMocks(join(root, 'mocks'))) {
  test(ref.name, async ({ page }) => {
    await page.goto(pathToFileURL(join(root, 'build/screens', `${ref.name}.html`)).href);
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator('main > *').first()).toHaveScreenshot(screenshotName(ref));

    const width = page.viewportSize()!.width;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
