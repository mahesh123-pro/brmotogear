import { test, expect } from '@playwright/test';
test('rider buys a helmet, admin fulfils it, rider reviews it, and admin moderates it', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/shop');
  await expect(page.getByRole('link', { name: 'View Apex Solid', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save Apex Solid to wishlist', exact: true }).click();
  await page.goto('/wishlist');
  await expect(page.getByRole('link', { name: 'View Apex Solid', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'View Apex Solid', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Choose your helmet size');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.getByRole('link', { name: 'Shopping bag, 1 items', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your riding essentials.' })).toBeVisible();
  await page.getByRole('link', { name: 'Continue to checkout', exact: true }).click();
  await page.getByRole('link', { name: 'Sign in to checkout' }).click();
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  const email = `rider-${Date.now()}@example.com`;
  await page.getByLabel('Your name', { exact: true }).fill('Test Rider');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Test-Rider-Password-2026');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByLabel('Full name', { exact: true }).fill('Test Rider');
  await page.getByLabel('Mobile number', { exact: true }).fill('9876543210');
  await page.getByLabel('PIN code', { exact: true }).fill('411001');
  await page.getByLabel('House, street & locality', { exact: true }).fill('42 Example Road');
  await page.getByLabel('City', { exact: true }).fill('Pune');
  await page.getByLabel('State', { exact: true }).fill('Maharashtra');
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Try the complete checkout.' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete demo payment', exact: true }).click();
  await expect(page).toHaveURL(/\/order\//);
  await expect(page.getByText('Confirmed', { exact: true }).first()).toBeVisible();
  const id = page.url().split('/').pop()!;
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto('/account');
  await admin.getByRole('button', { name: 'Admin account', exact: true }).click();
  await expect(admin).toHaveURL(/\/admin/);
  await admin.getByRole('button', { name: 'Orders', exact: true }).click();
  await admin.getByLabel('Search orders').fill(email);
  await admin.getByRole('button', { name: 'Manage', exact: true }).click();
  for (const status of ['Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']) {
    await admin.getByLabel('Order status', { exact: true }).selectOption(status);
    await admin.getByLabel('Tracking reference', { exact: true }).fill('DEMO TRACK 001');
    await admin.getByRole('button', { name: 'Update order', exact: true }).click();
    await admin.getByRole('button', { name: 'Manage', exact: true }).click();
  }
  await page.reload();
  await expect(page.locator('.order-confirmation .status-pill')).toHaveText('Delivered');
  await expect(page.getByText('DEMO TRACK 001', { exact: false })).toBeVisible();
  await page.goto('/product/apex-solid');
  await page.getByRole('tab', { name: /Reviews/ }).click();
  await page
    .getByLabel('Your review', { exact: true })
    .fill(`A comfortable test helmet for the end-to-end checkout ${id}.`);
  await page.getByRole('button', { name: 'Submit review', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('submitted for moderation');
  await admin.getByRole('button', { name: 'Reviews', exact: true }).click();
  await admin.getByRole('button', { name: 'Refresh data', exact: true }).click();
  const review = admin.locator('article.review').filter({ hasText: id });
  await review.getByRole('button', { name: 'Approve review', exact: true }).click();
  await page.reload();
  await page.getByRole('tab', { name: /Reviews/ }).click();
  await expect(
    page.getByText(`A comfortable test helmet for the end-to-end checkout ${id}.`, { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await adminContext.close();
});
test('mobile navigation, filtering, images, and support form work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CHASE THE OPEN ROAD.' })).toBeVisible();
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Shop helmets' })
    .click();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('radio', { name: /Open Face/ }).check();
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search helmets', exact: true })
    .fill('helmet under 3000');
  await expect(page.locator('.catalog-grid .product-card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/contact');
  await page.getByLabel('Your name', { exact: true }).fill('Mobile Rider');
  await page.getByLabel('Email address', { exact: true }).fill('mobile@example.com');
  await page
    .getByLabel('How can we help?', { exact: true })
    .fill('Please help me choose the right helmet size.');
  await page.getByRole('button', { name: 'Send your message', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your message is in.' })).toBeVisible();
  await page.screenshot({ path: 'data/mobile-contact.png', fullPage: true });
});

test('admin can create, edit and archive inventory, manage a category and issue a coupon', async ({
  page,
}) => {
  const tag = Date.now().toString();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Admin account', exact: true }).click();
  await expect(page).toHaveURL(/\/admin/);
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  await page.getByLabel('Category name', { exact: true }).fill(`Test touring ${tag}`);
  await page.getByRole('button', { name: 'Add category', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `Test touring ${tag}`, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Add product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill(`Test Helmet ${tag}`);
  await page.getByLabel('Brand', { exact: true }).fill('TEST');
  await page.locator('select').selectOption(`Test touring ${tag}`);
  await page.getByLabel('Selling price ₹', { exact: true }).fill('4500');
  await page.getByLabel('MRP ₹', { exact: true }).fill('5000');
  await page
    .getByLabel('Description', { exact: true })
    .fill('A product used to verify the complete catalog management flow.');
  await page.getByLabel('Variant 1 stock', { exact: true }).fill('3');
  await page.getByLabel('Active in storefront', { exact: true }).check();
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await page.getByLabel('Search products', { exact: true }).fill(`Test Helmet ${tag}`);
  await expect(page.getByRole('cell', { name: '₹4,500', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Selling price ₹', { exact: true }).fill('4250');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('cell', { name: '₹4,250', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page.getByText('Archived', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  const category = page
    .locator('.panel')
    .filter({ has: page.getByRole('heading', { name: `Test touring ${tag}`, exact: true }) });
  await category.getByRole('button', { name: 'Hide category', exact: true }).click();
  await expect(category.getByRole('button', { name: 'Show category', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Coupons', exact: true }).click();
  await page.getByLabel('Code', { exact: true }).fill(`TEST${tag}`);
  await page.getByLabel('Expires on', { exact: true }).fill('2027-12-31');
  await page.getByRole('button', { name: 'Save coupon', exact: true }).click();
  const coupon = page.locator('.coupon-card').filter({ hasText: `TEST${tag}` });
  await expect(coupon).toBeVisible();
  await coupon.getByRole('button', { name: 'Disable coupon', exact: true }).click();
  await expect(coupon.getByText('Disabled', { exact: true })).toBeVisible();
});
