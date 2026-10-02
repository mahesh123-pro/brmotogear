import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('data', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  desktop.on('pageerror', (e) => errors.push(e.message));
  for (const [path, name] of [
    ['/', 'home'],
    ['/shop', 'catalog'],
    ['/product/apex-solid', 'product'],
  ]) {
    await desktop.goto('http://localhost:3000' + path);
    await desktop.evaluate(() => document.fonts.ready);
    await desktop.locator('img').evaluateAll(async (images) => {
      images.forEach((i) => (i.loading = 'eager'));
      await Promise.race([
        Promise.all(images.map((i) => i.decode().catch(() => {}))),
        new Promise((r) => setTimeout(r, 15000)),
      ]);
    });
    await desktop.screenshot({ path: `data/${name}-desktop.png`, fullPage: true });
  }
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const path of [
    '/',
    '/shop',
    '/product/apex-solid',
    '/cart',
    '/checkout',
    '/account',
    '/admin',
    '/collections',
    '/about',
    '/size-guide',
    '/safety-guide',
    '/faq',
    '/contact',
  ]) {
    const response = await mobile.goto('http://localhost:3000' + path);
    if (!response?.ok()) throw new Error(`${path}: ${response?.status()}`);
    if (await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      throw new Error(`Mobile overflow: ${path}`);
    if (path === '/' || path === '/product/apex-solid') {
      await mobile.locator('img').evaluateAll(async (images) => {
        images.forEach((i) => (i.loading = 'eager'));
        await Promise.race([
          Promise.all(images.map((i) => i.decode().catch(() => {}))),
          new Promise((r) => setTimeout(r, 15000)),
        ]);
      });
      await mobile.screenshot({
        path: `data/${path === '/' ? 'home' : 'product'}-mobile.png`,
        fullPage: true,
      });
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Desktop screenshots captured; 13 mobile routes render without horizontal overflow.');
} finally {
  await browser.close();
}
