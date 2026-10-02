import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import type { State, CartItem, Address, Order, Coupon } from '../lib/types';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assert(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
export function signatureValid(message: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(message).digest('hex');
  return (
    /^[a-f0-9]{64}$/.test(signature) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}
export function quote(state: State, items: CartItem[], code: string, userId: string) {
  assert(items.length > 0 && items.length <= 30, 'Add a helmet to your cart first.');
  const merged = new Map<string, CartItem>();
  for (const item of items) {
    const key = [item.productId, item.size, item.color].join('|');
    const old = merged.get(key);
    merged.set(key, { ...item, quantity: item.quantity + (old?.quantity || 0) });
  }
  const lines = [...merged.values()].map((item) => {
    const p = state.products.find((p) => p.id === item.productId && p.active);
    assert(p, 'A product is no longer available.');
    const v = p.variants.find((v) => v.size === item.size && v.color === item.color);
    assert(
      v && v.stock - v.reserved >= item.quantity,
      `${p.name} in ${item.size} has insufficient stock.`,
    );
    assert(item.quantity > 0 && item.quantity <= 10, 'Maximum 10 units per variant.');
    return { ...item, name: p.name, price: p.price, image: p.images[0] };
  });
  const subtotal = lines.reduce((n, i) => n + i.price * i.quantity, 0);
  let discount = 0;
  let coupon: Coupon | undefined;
  if (code) {
    coupon = state.coupons.find((c) => c.code === code.toUpperCase() && c.active);
    assert(
      coupon && new Date(coupon.expiresAt).getTime() > Date.now(),
      'This coupon is invalid or expired.',
    );
    const eligible = lines.filter(
      (line) =>
        (!coupon!.categories?.length ||
          coupon!.categories.includes(
            state.products.find((p) => p.id === line.productId)!.category,
          )) &&
        (!coupon!.productIds?.length || coupon!.productIds.includes(line.productId)),
    );
    const eligibleSubtotal = eligible.reduce((n, i) => n + i.price * i.quantity, 0);
    assert(eligible.length, 'This coupon does not apply to the helmets in your bag.');
    assert(
      eligibleSubtotal >= coupon.minimum,
      'Eligible products do not meet this coupon’s minimum spend.',
    );
    const uses = state.orders.filter(
      (o) => o.coupon === coupon!.code && (o.reserved || o.paymentStatus === 'paid'),
    );
    assert(
      uses.length < coupon.limit && uses.filter((o) => o.userId === userId).length < coupon.perUser,
      'This coupon’s usage limit has been reached.',
    );
    discount = Math.min(Math.round((eligibleSubtotal * coupon.percent) / 100), coupon.maximum);
  }
  const shipping = subtotal >= 200000 ? 0 : 9900;
  return {
    items: lines,
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
    coupon: coupon?.code || '',
  };
}
export function release(state: State, order: Order) {
  if (!order.reserved) return;
  for (const item of order.items) {
    const v = state.products
      .find((p) => p.id === item.productId)
      ?.variants.find((v) => v.size === item.size && v.color === item.color);
    if (v) v.reserved -= item.quantity;
  }
  order.reserved = false;
}
export function expire(state: State) {
  for (const o of state.orders)
    if (o.reserved && o.paymentStatus === 'pending' && Date.parse(o.expiresAt) < Date.now()) {
      release(state, o);
      o.status = 'Expired';
      o.timeline.push({ status: 'Expired', at: new Date().toISOString() });
    }
}
export function createOrder(
  state: State,
  userId: string,
  items: CartItem[],
  address: Address,
  code: string,
  key: string,
) {
  expire(state);
  const existing = state.orders.find((o) => o.userId === userId && o.idempotencyKey === key);
  if (existing) return existing;
  const totals = quote(state, items, code, userId);
  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    number: `BRM-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`,
    userId,
    ...totals,
    address,
    status: 'Pending',
    paymentStatus: 'pending',
    idempotencyKey: key,
    createdAt: now,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    reserved: true,
    tracking: '',
    timeline: [{ status: 'Pending', at: now }],
  };
  for (const i of order.items) {
    const v = state.products
      .find((p) => p.id === i.productId)!
      .variants.find((v) => v.size === i.size && v.color === i.color)!;
    v.reserved += i.quantity;
  }
  state.orders.push(order);
  return order;
}
export function settle(
  state: State,
  id: string,
  paymentId: string,
  amount: number,
  currency: string,
) {
  const o = state.orders.find((o) => o.id === id);
  assert(o, 'Order not found.', 404);
  assert(o.total === amount && currency === 'INR', 'Payment amount or currency mismatch.');
  if (
    o.paymentStatus === 'paid' ||
    o.paymentStatus === 'refunded' ||
    o.paymentStatus === 'refund_required'
  )
    return o;
  assert(
    !state.orders.some((x) => x.id !== id && x.paymentId === paymentId),
    'Payment has already been used.',
  );
  o.paymentId = paymentId;
  if (!o.reserved) {
    o.paymentStatus = 'refund_required';
    o.status = 'Payment review';
    o.timeline.push({
      status: 'Payment received after reservation ended — refund required',
      at: new Date().toISOString(),
    });
    return o;
  }
  for (const i of o.items) {
    const v = state.products
      .find((p) => p.id === i.productId)!
      .variants.find((v) => v.size === i.size && v.color === i.color)!;
    assert(v.stock >= i.quantity, 'Inventory reconciliation required.', 409);
    v.stock -= i.quantity;
    v.reserved -= i.quantity;
  }
  o.reserved = false;
  o.paymentStatus = 'paid';
  o.status = 'Confirmed';
  o.timeline.push({ status: 'Confirmed', at: new Date().toISOString() });
  const u = state.users.find((u) => u.id === o.userId);
  if (u) u.cart = [];
  return o;
}
