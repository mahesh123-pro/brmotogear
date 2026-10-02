import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:3000');
  await page.locator('.cinema-image img').evaluate((i) => i.decode());
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('canvas')).toHaveCount(0);
  const bg = page.locator('.cinema-image');
  const first = await bg.evaluate((e) => getComputedStyle(e).transform);
  await page.waitForTimeout(200);
  expect(await bg.evaluate((e) => getComputedStyle(e).transform)).not.toBe(first);
  await page.getByRole('button', { name: 'Pause background animation' }).click();
  expect(await bg.evaluate((e) => getComputedStyle(e).animationPlayState)).toBe('paused');
  await page.screenshot({ path: 'data/cinematic-home-desktop.png' });
  await page.getByRole('button', { name: 'Play background animation' }).click();
  expect(await bg.evaluate((e) => getComputedStyle(e).animationPlayState)).toBe('running');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.cinema-hero')).toHaveClass(/motion-paused/);
  await page.locator('.cinema-hero').scrollIntoViewIfNeeded();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'data/cinematic-home-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await bg.evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  await page.getByRole('link', { name: 'Find your helmet', exact: true }).click();
  await page.waitForURL('**/shop');
  expect(errors).toEqual([]);
  console.log(
    'PASS: image loaded, moving background, pause/play, offscreen pause, reduced motion, desktop/mobile layouts, shopping navigation and no 3D canvas or runtime errors.',
  );
} finally {
  await browser.close();
}
