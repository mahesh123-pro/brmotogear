import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  const routes = ['/blog', '/blog/make-room-for-the-long-way', '/blog/pack-for-a-weekend', '/blog/everyday-ride-ritual', '/lookbook', '/ride-checklist', '/about', '/'];
  for (const route of routes) {
    const response = await page.goto('http://localhost:3000' + route);
    assert.equal(response.status(), 200, route);
    await page.locator('main h1').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const images = await page.locator('main img').evaluateAll(async imgs => {
      imgs.forEach(i => i.loading = 'eager');
      await Promise.all(imgs.map(i => Promise.race([i.decode().catch(() => {}), new Promise(r => setTimeout(r, 20000))])));
      return imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.src);
    });
    assert.deepEqual(images, [], `Broken images ${route}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Desktop overflow ${route}`);
    if (['/blog','/lookbook','/ride-checklist'].includes(route)) await page.screenshot({path: `data/new${route.replaceAll('/','-')}-desktop.png`, fullPage: true});
    console.log('Desktop and images OK:', route);
  }
  await page.goto('http://localhost:3000/ride-checklist');
  await page.getByLabel('Phone and charging cable', {exact:true}).check();
  await page.reload();
  await expect(page.getByLabel('Phone and charging cable', {exact:true})).toBeChecked();
  await page.getByRole('button', {name:'Reset checklist'}).click();
  assert.equal(await page.getByLabel('Phone and charging cable', {exact:true}).isChecked(), false);
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
  assert.match(await page.locator('.checklist-progress').innerText(), /12 of 12 ready/);
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.checklist-actions').isVisible(),false);
  await page.emulateMedia({media:'screen'});
  await page.getByRole('button', {name:'Reset checklist'}).click();
  const invalid = await page.goto('http://localhost:3000/blog/not-a-real-story');
  assert.equal(invalid.status(),404);
  await page.setViewportSize({width:390,height:844});
  for(const route of routes){
    await page.goto('http://localhost:3000'+route);
    await page.locator('main h1').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false, `Mobile overflow ${route}`);
    if(['/blog','/lookbook','/ride-checklist'].includes(route)) await page.screenshot({path:`data/new${route.replaceAll('/','-')}-mobile.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Open menu',exact:true}).click();
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Journal',exact:true}).click();
  await page.waitForURL('**/blog');
  await page.getByRole('link',{name:/Less luggage. More weekend/}).click();
  await page.waitForURL('**/blog/pack-for-a-weekend');
  await page.getByRole('link',{name:'Open your packing checklist'}).click();
  await page.waitForURL('**/ride-checklist');
  assert.deepEqual(errors,[]);
  console.log('PASS: all 8 routes, images, mobile navigation, article links, 404, checklist persistence/reset/completion and print styles. No browser runtime errors.');
} finally { await browser.close(); }

