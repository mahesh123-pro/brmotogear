import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { demoState } from '../lib/seed';
import { quote, createOrder, settle, expire, release, signatureValid } from '../server/commerce';
import type { Address, CartItem } from '../lib/types';
const address: Address = {
  name: 'Test Rider',
  phone: '9876543210',
  email: 'rider@example.com',
  address: '123 Test Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
};
const item: CartItem = { productId: 'p1', size: 'M', color: 'Black', quantity: 1 };
test('totals use catalog prices and coupon maximum in paise', () => {
  const s = demoState();
  const total = quote(s, [{ ...item, quantity: 2 }], 'WELCOME10', 'u1');
  assert.equal(total.subtotal, 999800);
  assert.equal(total.discount, 50000);
  assert.equal(total.total, 949800);
  assert.equal(total.shipping, 0);
});
test('coupon minimum and expiry are enforced', () => {
  const s = demoState();
  s.coupons[0].minimum = 900000;
  assert.throws(() => quote(s, [item], 'WELCOME10', 'u1'), /minimum/);
  s.coupons[0].expiresAt = '2020-01-01';
  assert.throws(() => quote(s, [item], 'WELCOME10', 'u1'), /expired/);
});
test('duplicate variant lines cannot exceed stock', () => {
  const s = demoState();
  s.products[0].variants[1].stock = 1;
  assert.throws(() => quote(s, [item, item], '', 'u1'), /stock/);
});
test('unavailable and archived variants are rejected', () => {
  const s = demoState();
  assert.throws(() => quote(s, [{ ...item, size: 'XXXL' }], '', 'u1'), /stock/);
  s.products[0].active = false;
  assert.throws(() => quote(s, [item], '', 'u1'), /available/);
});
test('order reserves stock and idempotent retry returns the same order', () => {
  const s = demoState();
  const key = randomUUID();
  const first = createOrder(s, 'u1', [item], address, '', key);
  const second = createOrder(s, 'u1', [item], address, '', key);
  assert.equal(first.id, second.id);
  assert.equal(s.orders.length, 1);
  assert.equal(s.products[0].variants[1].reserved, 1);
  assert.equal(s.products[0].variants[1].stock, 12);
});
test('two orders cannot reserve the last unit', () => {
  const s = demoState();
  s.products[0].variants[1].stock = 1;
  createOrder(s, 'u1', [item], address, '', randomUUID());
  assert.throws(() => createOrder(s, 'u2', [item], address, '', randomUUID()), /stock/);
});
test('captured payment consumes inventory exactly once', () => {
  const s = demoState();
  const o = createOrder(s, 'u1', [item], address, '', randomUUID());
  settle(s, o.id, 'pay_test', o.total, 'INR');
  settle(s, o.id, 'pay_test', o.total, 'INR');
  assert.equal(o.paymentStatus, 'paid');
  assert.equal(o.status, 'Confirmed');
  assert.equal(s.products[0].variants[1].stock, 11);
  assert.equal(s.products[0].variants[1].reserved, 0);
  assert.equal(o.timeline.length, 2);
});
test('payment amount and currency mismatches cannot mark an order paid', () => {
  const s = demoState();
  const o = createOrder(s, 'u1', [item], address, '', randomUUID());
  assert.throws(() => settle(s, o.id, 'bad', 1, 'INR'), /mismatch/);
  assert.throws(() => settle(s, o.id, 'bad', o.total, 'USD'), /mismatch/);
  assert.equal(o.paymentStatus, 'pending');
});
test('the same payment cannot settle two orders', () => {
  const s = demoState();
  const a = createOrder(s, 'u1', [item], address, '', randomUUID());
  const b = createOrder(s, 'u2', [item], address, '', randomUUID());
  settle(s, a.id, 'pay_replay', a.total, 'INR');
  assert.throws(() => settle(s, b.id, 'pay_replay', b.total, 'INR'), /already/);
});
test('expired reservation releases stock and late capture is held for refund', () => {
  const s = demoState();
  const o = createOrder(s, 'u1', [item], address, '', randomUUID());
  o.expiresAt = '2020-01-01';
  expire(s);
  assert.equal(o.status, 'Expired');
  assert.equal(s.products[0].variants[1].reserved, 0);
  settle(s, o.id, 'pay_late', o.total, 'INR');
  assert.equal(o.paymentStatus, 'refund_required');
  assert.equal(s.products[0].variants[1].stock, 12);
});
test('reservation release is idempotent', () => {
  const s = demoState();
  const o = createOrder(s, 'u1', [item], address, '', randomUUID());
  release(s, o);
  release(s, o);
  assert.equal(s.products[0].variants[1].reserved, 0);
});
test('coupon per-user limit includes reservations and paid orders', () => {
  const s = demoState();
  createOrder(s, 'u1', [item], address, 'WELCOME10', randomUUID());
  assert.throws(() => quote(s, [item], 'WELCOME10', 'u1'), /usage limit/);
  assert.equal(quote(s, [item], 'WELCOME10', 'u2').discount, 49990);
});
test('signature verification rejects missing, forged and malformed signatures', () => {
  const secret = 'test-secret';
  const message = 'order_test|pay_test';
  const signature = createHmac('sha256', secret).update(message).digest('hex');
  assert.equal(signatureValid(message, signature, secret), true);
  assert.equal(signatureValid('other', signature, secret), false);
  assert.equal(signatureValid(message, '', secret), false);
  assert.equal(signatureValid(message, '0'.repeat(64), secret), false);
  assert.equal(signatureValid(message, 'gg'.repeat(32), secret), false);
});
test('category-restricted coupons discount eligible lines only', () => {
  const s = demoState();
  s.coupons[0].categories = ['Open Face'];
  const total = quote(
    s,
    [item, { productId: 'p4', size: 'M', color: 'Green', quantity: 1 }],
    'WELCOME10',
    'u1',
  );
  assert.equal(total.discount, 32990);
  assert.throws(() => quote(s, [item], 'WELCOME10', 'u2'), /does not apply/);
});
test('product-restricted coupons cannot be applied to other products', () => {
  const s = demoState();
  s.coupons[0].productIds = ['p2'];
  assert.throws(() => quote(s, [item], 'WELCOME10', 'u1'), /does not apply/);
});
