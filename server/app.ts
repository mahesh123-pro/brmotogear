import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes, randomInt, createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';
import { demo, initStore, readState, mutate } from './store';
import {
  assert,
  HttpError,
  quote,
  createOrder,
  settle,
  signatureValid,
  expire,
  release,
} from './commerce';
import type { User, State, Order, Product } from '../lib/types';
import { categories } from '../lib/types';

const secret = process.env.JWT_SECRET || (demo ? randomBytes(48).toString('hex') : '');
if (secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
const origin = process.env.FRONTEND_URL || 'http://localhost:3000';
const secure = process.env.NODE_ENV === 'production';
const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;
if (!demo && (!razorpay || !process.env.RAZORPAY_WEBHOOK_SECRET))
  throw new Error('Configure Razorpay keys and webhook secret before enabling live mode.');
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(helmet());
app.use(
  rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }),
);
const api = express.Router();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const publicUser = (u: User) => {
  const { passwordHash, ...safe } = u;
  void passwordHash;
  return safe;
};
const email = z
  .string()
  .trim()
  .email()
  .max(200)
  .transform((v) => v.toLowerCase());
const password = z.string().min(10, 'Use at least 10 characters.').max(128);
const cartSchema = z
  .array(
    z.object({
      productId: z.string().max(100),
      size: z.string().max(20),
      color: z.string().max(50),
      quantity: z.number().int().min(1).max(10),
    }),
  )
  .max(30);
const addressSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),
  address: z.string().trim().min(8).max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a six-digit PIN code.'),
});
const cookies = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
const authLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});
const refreshLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 60,
  skip: (req) => !req.cookies?.refresh,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many session refresh attempts. Please sign in again later.' },
});
const contactLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'You have sent several messages. Please try again in 15 minutes.' },
});
const otpLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many code requests. Please wait 15 minutes.' },
});
async function user(req: Request, admin = false) {
  let payload: { sub: string; sid: string };
  try {
    payload = jwt.verify(req.cookies.access || '', secret, {
      algorithms: ['HS256'],
    }) as typeof payload;
  } catch {
    throw new HttpError(401, 'Please sign in to continue.');
  }
  const s = await readState();
  const session = s.sessions.find(
    (x) => x.id === payload.sid && x.userId === payload.sub && Date.parse(x.expiresAt) > Date.now(),
  );
  assert(session, 'Your session has expired. Please sign in again.', 401);
  const u = s.users.find((u) => u.id === payload.sub);
  assert(u, 'Account not found.', 401);
  if (admin) assert(u.role === 'admin', 'Administrator access is required.', 403);
  return u;
}
async function signIn(res: Response, u: User) {
  const token = randomBytes(48).toString('hex'),
    id = randomUUID();
  await mutate((s) => {
    s.sessions = s.sessions.filter((x) => Date.parse(x.expiresAt) > Date.now());
    s.sessions.push({
      id,
      userId: u.id,
      hash: hash(token),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
  });
  res.cookie('access', jwt.sign({ sid: id }, secret, { subject: u.id, expiresIn: '15m' }), {
    ...cookies,
    maxAge: 15 * 60_000,
  });
  res.cookie('refresh', token, { ...cookies, maxAge: 7 * 86400000 });
}
async function notifyOrder(order: Order) {
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM || order.notificationSent) return;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: order.address.email,
      subject: `BRMotoGear — ${order.number} ${order.status.toLowerCase()}`,
      text: `Hello ${order.address.name},\n\nYour order ${order.number} is ${order.status.toLowerCase()}. View its latest status in your BRMotoGear account.\n\nRide safe. Ride bold.`,
    });
    await mutate((s) => {
      const o = s.orders.find((o) => o.id === order.id);
      if (o) o.notificationSent = true;
    });
  } catch {
    console.error('Order email delivery failed; retry from admin.');
  }
}
api.post(
  '/payments/webhook',
  express.raw({ type: 'application/json', limit: '100kb' }),
  async (req, res) => {
    assert(!demo && process.env.RAZORPAY_WEBHOOK_SECRET, 'Live webhooks are not enabled.', 503);
    assert(Buffer.isBuffer(req.body), 'Invalid webhook body.');
    assert(
      signatureValid(
        req.body.toString('utf8'),
        String(req.headers['x-razorpay-signature'] || ''),
        process.env.RAZORPAY_WEBHOOK_SECRET,
      ),
      'Invalid webhook signature.',
      400,
    );
    const event = JSON.parse(req.body.toString());
    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      assert(payment?.status === 'captured', 'Invalid payment event.');
      const state = await readState();
      const o = state.orders.find((o) => o.providerOrderId === payment.order_id);
      assert(o, 'Order has not been linked yet. Retry this webhook.', 409);
      const saved = await mutate((s) =>
        settle(s, o.id, payment.id, payment.amount, payment.currency),
      );
      await notifyOrder(saved);
    }
    if (event.event === 'refund.processed') {
      const refund = event.payload?.refund?.entity;
      await mutate((s) => {
        const o = s.orders.find((o) => o.paymentId === refund?.payment_id);
        if (o && refund.amount === o.total) {
          o.paymentStatus = 'refunded';
          o.status = 'Refunded';
          o.timeline.push({ status: 'Refunded', at: new Date().toISOString() });
        }
      });
    }
    res.json({ received: true });
  },
);
api.use(express.json({ limit: '200kb' }));
api.use(cookieParser());
api.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && requestOrigin !== origin) {
    return res.status(403).json({ error: 'This request origin is not allowed.' });
  }
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.headers['sec-fetch-site'] === 'cross-site'
  ) {
    return res.status(403).json({ error: 'Cross-site requests are not allowed.' });
  }
  next();
});
api.get('/health', async (_req, res) => {
  await readState();
  res.json({ ok: true, mode: demo ? 'demo' : 'live' });
});
api.get('/config', async (_req, res) =>
  res.json({
    demo,
    payments: demo ? 'simulated' : 'razorpay',
    categories: (await readState()).categories.filter((c) => c.active).map((c) => c.name),
    shipping: { freeAbove: 200000, flat: 9900 },
    notifications: !!process.env.SMTP_HOST,
    otp: demo || !!process.env.SMTP_HOST,
  }),
);
api.get('/categories', async (_req, res) =>
  res.json((await readState()).categories.filter((c) => c.active)),
);
api.get('/products', async (req, res) => {
  const s = await readState();
  let products = s.products.filter((p) => p.active);
  const query = String(req.query.q || '')
    .toLowerCase()
    .trim();
  if (query) {
    const under = query.match(/under\s+(\d+)/);
    const words = query
      .replace(/under\s+\d+/, '')
      .replace(/helmets?/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    products = products.filter(
      (p) =>
        words.every((w) =>
          `${p.name} ${p.brand} ${p.category} ${p.description} ${p.variants.map((v) => v.color).join(' ')}`
            .toLowerCase()
            .includes(w),
        ) &&
        (!under || p.price <= Number(under[1]) * 100),
    );
  }
  if (req.query.category) products = products.filter((p) => p.category === req.query.category);
  res.json(
    products.map((p) => {
      const reviews = s.reviews.filter((r) => r.productId === p.id && r.approved);
      return {
        ...p,
        reviewCount: reviews.length,
        rating: reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0,
      };
    }),
  );
});
api.get('/products/:slug', async (req, res) => {
  const s = await readState();
  const p = s.products.find(
    (p) => (p.slug === req.params.slug || p.id === req.params.slug) && p.active,
  );
  assert(p, 'Helmet not found.', 404);
  res.json({ ...p, reviews: s.reviews.filter((r) => r.productId === p.id && r.approved) });
});
api.post('/auth/register', authLimit, async (req, res) => {
  const data = z
    .object({ name: z.string().trim().min(2).max(100), email, password })
    .parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const u = await mutate((s) => {
    assert(
      !s.users.some((u) => u.email === data.email),
      'An account with this email already exists.',
      409,
    );
    const u: User = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'customer',
      addresses: [],
      wishlist: [],
      cart: [],
      createdAt: new Date().toISOString(),
    };
    s.users.push(u);
    return u;
  });
  await signIn(res, u);
  res.status(201).json(publicUser(u));
});
api.post('/auth/login', authLimit, async (req, res) => {
  const data = z.object({ email, password: z.string().max(128) }).parse(req.body);
  const s = await readState();
  const u = s.users.find((u) => u.email === data.email);
  const fallback = '$2b$12$jlBYNjFIPraNCWPAsg8nEOGAM8QhOpJIosvdGBjoLHNKJU2ybHJh2';
  const match = await bcrypt.compare(data.password, u?.passwordHash || fallback);
  assert(u && match, 'Email or password is incorrect.', 401);
  await signIn(res, u);
  res.json(publicUser(u));
});
api.post('/auth/demo', authLimit, async (req, res) => {
  assert(demo, 'Demo access is disabled.', 404);
  const admin = req.body.role === 'admin';
  const role = admin ? 'admin' : 'customer';
  const u = await mutate((s) => {
    let u = s.users.find((u) => u.email === `${role}@demo.brmoto.local`);
    if (!u) {
      u = {
        id: randomUUID(),
        name: admin ? 'Demo administrator' : 'Demo rider',
        email: `${role}@demo.brmoto.local`,
        passwordHash: '',
        role,
        addresses: [],
        cart: [],
        wishlist: [],
        createdAt: new Date().toISOString(),
      };
      s.users.push(u);
    }
    return u;
  });
  await signIn(res, u);
  res.json(publicUser(u));
});
api.post('/auth/refresh', refreshLimit, async (req, res) => {
  const token = String(req.cookies.refresh || '');
  assert(token, 'Please sign in again.', 401);
  const replacement = randomBytes(48).toString('hex');
  const session = await mutate((s) => {
    const session = s.sessions.find(
      (x) => x.hash === hash(token) && Date.parse(x.expiresAt) > Date.now(),
    );
    assert(session, 'Your session has expired.', 401);
    session.hash = hash(replacement);
    return session;
  });
  res.cookie(
    'access',
    jwt.sign({ sid: session.id }, secret, { subject: session.userId, expiresIn: '15m' }),
    { ...cookies, maxAge: 15 * 60_000 },
  );
  res.cookie('refresh', replacement, {
    ...cookies,
    maxAge: Math.max(0, Date.parse(session.expiresAt) - Date.now()),
  });
  res.json({ ok: true });
});
api.post('/auth/logout', async (req, res) => {
  const token = String(req.cookies.refresh || '');
  await mutate((s) => {
    s.sessions = s.sessions.filter((x) => x.hash !== hash(token));
  });
  res.clearCookie('access', cookies);
  res.clearCookie('refresh', cookies);
  res.json({ ok: true });
});
const otpHash = (email: string, code: string) =>
  createHmac('sha256', secret).update(`${email}|${code}`).digest('hex');
api.post('/auth/otp/request', otpLimit, async (req, res) => {
  assert(demo || process.env.SMTP_HOST, 'Email sign-in is not configured. Use your password.', 503);
  const data = z.object({ email }).parse(req.body);
  const code = randomInt(100000, 1000000).toString();
  const known = await mutate((s) => {
    s.otps = s.otps.filter((o) => o.email !== data.email && Date.parse(o.expiresAt) > Date.now());
    if (!s.users.some((u) => u.email === data.email)) return false;
    s.otps.push({
      id: randomUUID(),
      email: data.email,
      hash: otpHash(data.email, code),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      attempts: 0,
    });
    return true;
  });
  if (known && !demo) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: data.email,
      subject: 'Your BRMotoGear sign-in code',
      text: `Your sign-in code is ${code}. It expires in 10 minutes. If you did not request it, you can ignore this email.`,
    });
  }
  res.json({
    message: 'If an account exists, a sign-in code has been sent.',
    ...(demo && known ? { demoCode: code } : {}),
  });
});
api.post('/auth/otp/verify', authLimit, async (req, res) => {
  const data = z.object({ email, code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const account = await mutate((s) => {
    const otp = s.otps.find(
      (o) => o.email === data.email && Date.parse(o.expiresAt) > Date.now() && o.attempts < 5,
    );
    if (!otp) return null;
    otp.attempts++;
    if (otp.hash !== otpHash(data.email, data.code)) return null;
    s.otps = s.otps.filter((o) => o.id !== otp.id);
    return s.users.find((u) => u.email === data.email) || null;
  });
  assert(account, 'The code is invalid or expired. Request a new code.', 401);
  await signIn(res, account);
  res.json(publicUser(account));
});
api.get('/auth/me', async (req, res) => res.json(publicUser(await user(req))));
api.put('/account', async (req, res) => {
  const u = await user(req);
  const data = z
    .object({ name: z.string().trim().min(2).max(100), addresses: z.array(addressSchema).max(5) })
    .parse(req.body);
  const result = await mutate((s) => {
    const saved = s.users.find((x) => x.id === u.id)!;
    saved.name = data.name;
    saved.addresses = data.addresses;
    return publicUser(saved);
  });
  res.json(result);
});
api.get('/cart', async (req, res) => res.json((await user(req)).cart));
api.put('/cart', async (req, res) => {
  const u = await user(req);
  const cart = cartSchema.parse(req.body);
  await mutate((s) => {
    s.users.find((x) => x.id === u.id)!.cart = cart;
  });
  res.json(cart);
});
api.put('/wishlist', async (req, res) => {
  const u = await user(req);
  const ids = z.array(z.string().max(100)).max(100).parse(req.body);
  await mutate((s) => {
    s.users.find((x) => x.id === u.id)!.wishlist = [...new Set(ids)];
  });
  res.json(ids);
});
api.post('/cart/quote', async (req, res) => {
  const u = await user(req);
  const data = z
    .object({ items: cartSchema, coupon: z.string().max(40).default('') })
    .parse(req.body);
  const totals = await mutate((s) => {
    expire(s);
    return quote(s, data.items, data.coupon, u.id);
  });
  res.json(totals);
});
api.post('/orders', async (req, res) => {
  const u = await user(req);
  const data = z
    .object({
      items: cartSchema,
      address: addressSchema,
      coupon: z.string().max(40).default(''),
      idempotencyKey: z.string().uuid(),
    })
    .parse(req.body);
  const order = await mutate((s) =>
    createOrder(s, u.id, data.items, data.address, data.coupon, data.idempotencyKey),
  );
  res.status(201).json(order);
});
api.get('/orders', async (req, res) => {
  const u = await user(req);
  const s = await readState();
  res.json(s.orders.filter((o) => o.userId === u.id).reverse());
});
api.get('/orders/:id', async (req, res) => {
  const u = await user(req);
  const s = await readState();
  const o = s.orders.find(
    (o) => o.id === req.params.id && (o.userId === u.id || u.role === 'admin'),
  );
  assert(o, 'Order not found.', 404);
  res.json(o);
});
api.post('/orders/:id/cancel', async (req, res) => {
  const u = await user(req);
  const o = await mutate((s) => {
    const o = s.orders.find((o) => o.id === req.params.id && o.userId === u.id);
    assert(o, 'Order not found.', 404);
    assert(o.paymentStatus === 'pending', 'Contact support to cancel a paid order.');
    release(s, o);
    o.status = 'Cancelled';
    o.timeline.push({ status: 'Cancelled', at: new Date().toISOString() });
    return o;
  });
  res.json(o);
});
const paymentLocks = new Map<string, Promise<unknown>>();
api.post('/payments/create-order', async (req, res) => {
  const u = await user(req);
  const { orderId } = z.object({ orderId: z.string().uuid() }).parse(req.body);
  const create = async () => {
    const s = await readState();
    const o = s.orders.find((o) => o.id === orderId && o.userId === u.id);
    assert(o, 'Order not found.', 404);
    assert(
      o.paymentStatus === 'pending' && o.reserved && Date.parse(o.expiresAt) > Date.now(),
      'This order is no longer payable. Start a new checkout.',
    );
    if (demo) return { demo: true, orderId: o.id, amount: o.total };
    assert(razorpay, 'Payments are not configured.', 503);
    let providerOrderId = o.providerOrderId;
    if (!providerOrderId) {
      const payment = await razorpay.orders.create({
        amount: o.total,
        currency: 'INR',
        receipt: o.id,
        notes: { orderId: o.id },
      });
      providerOrderId = payment.id;
      await mutate((s) => {
        const saved = s.orders.find((x) => x.id === o.id)!;
        assert(
          !saved.providerOrderId || saved.providerOrderId === providerOrderId,
          'Payment initialization conflict.',
          409,
        );
        saved.providerOrderId = providerOrderId;
      });
    }
    return {
      demo: false,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: providerOrderId,
      amount: o.total,
      currency: 'INR',
    };
  };
  let work = paymentLocks.get(orderId);
  if (!work) {
    work = create().finally(() => paymentLocks.delete(orderId));
    paymentLocks.set(orderId, work);
  }
  res.json(await work);
});
api.post('/payments/demo', async (req, res) => {
  assert(demo, 'Simulated payments are disabled.', 404);
  const u = await user(req);
  const { orderId } = z.object({ orderId: z.string().uuid() }).parse(req.body);
  const order = await mutate((s) => {
    expire(s);
    const o = s.orders.find((o) => o.id === orderId && o.userId === u.id);
    assert(o, 'Order not found.', 404);
    assert(o.reserved || o.paymentStatus === 'paid', 'This order expired. Please start again.');
    return settle(s, o.id, `demo_${o.id}`, o.total, 'INR');
  });
  res.json(order);
});
api.post('/payments/verify', async (req, res) => {
  const u = await user(req);
  assert(razorpay && !demo, 'Live payments are not configured.', 503);
  const data = z
    .object({
      orderId: z.string().uuid(),
      razorpay_payment_id: z.string().max(100),
      razorpay_order_id: z.string().max(100),
      razorpay_signature: z.string().max(128),
    })
    .parse(req.body);
  const state = await readState();
  const o = state.orders.find((o) => o.id === data.orderId && o.userId === u.id);
  assert(o && o.providerOrderId === data.razorpay_order_id, 'Payment order mismatch.');
  assert(
    signatureValid(
      `${o.providerOrderId}|${data.razorpay_payment_id}`,
      data.razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET!,
    ),
    'Payment signature is invalid.',
  );
  const payment = await razorpay.payments.fetch(data.razorpay_payment_id);
  assert(
    payment.order_id === o.providerOrderId && payment.status === 'captured',
    'Payment is still being verified. Check your orders shortly.',
    409,
  );
  const saved = await mutate((s) =>
    settle(s, o.id, payment.id, Number(payment.amount), payment.currency),
  );
  await notifyOrder(saved);
  res.json(saved);
});
api.get('/products/:id/reviews', async (req, res) => {
  const s = await readState();
  res.json(s.reviews.filter((r) => r.productId === req.params.id && r.approved));
});
api.post('/products/:id/reviews', async (req, res) => {
  const u = await user(req);
  const data = z
    .object({
      rating: z.number().int().min(1).max(5),
      text: z.string().trim().min(10).max(1500),
      image: z.union([z.literal(''), z.string().url().startsWith('https://')]).default(''),
    })
    .parse(req.body);
  const review = await mutate((s) => {
    assert(
      s.orders.some(
        (o) =>
          o.userId === u.id &&
          o.status === 'Delivered' &&
          o.items.some((i) => i.productId === req.params.id),
      ),
      'Reviews are available after your order is delivered.',
    );
    assert(
      !s.reviews.some((r) => r.userId === u.id && r.productId === req.params.id),
      'You have already reviewed this helmet.',
    );
    const r = {
      id: randomUUID(),
      userId: u.id,
      productId: String(req.params.id),
      name: u.name,
      ...data,
      approved: false,
      createdAt: new Date().toISOString(),
    };
    s.reviews.push(r);
    return r;
  });
  res.status(201).json(review);
});
api.post('/contact', contactLimit, async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2).max(100),
      email,
      message: z.string().trim().min(10).max(2000),
    })
    .parse(req.body);
  const ticket = await mutate((s) => {
    const t = { id: randomUUID(), ...data, createdAt: new Date().toISOString(), resolved: false };
    s.tickets.push(t);
    return t;
  });
  res.status(201).json({ id: ticket.id });
});
api.use('/admin', async (req, _res, next) => {
  try {
    await user(req, true);
    next();
  } catch (e) {
    next(e);
  }
});
api.get('/admin/overview', async (_req, res) => {
  const s = await readState();
  res.json({ ...s, users: s.users.map(publicUser), sessions: undefined, otps: undefined });
});
api.post('/admin/categories', async (req, res) => {
  const data = z
    .object({ name: z.string().trim().min(2).max(50), active: z.boolean() })
    .parse(req.body);
  const category = await mutate((s) => {
    assert(
      !s.categories.some((c) => c.name.toLowerCase() === data.name.toLowerCase()),
      'This category already exists.',
    );
    const c = { id: randomUUID(), ...data };
    s.categories.push(c);
    return c;
  });
  res.status(201).json(category);
});
api.patch('/admin/categories/:id', async (req, res) => {
  const data = z.object({ active: z.boolean() }).parse(req.body);
  await mutate((s) => {
    const c = s.categories.find((c) => c.id === req.params.id);
    assert(c, 'Category not found.', 404);
    assert(
      data.active || !s.products.some((p) => p.active && p.category === c.name),
      'Archive or move this category’s active products first.',
    );
    c.active = data.active;
  });
  res.json({ ok: true });
});
const imageSchema = z
  .string()
  .max(1000)
  .refine(
    (v) =>
      /^\/images\/[a-zA-Z0-9._-]+$/.test(v) ||
      /^https:\/\/cdn\.shopify\.com\//.test(v) ||
      /^https:\/\/images\.unsplash\.com\//.test(v),
    'Use /images/file.jpg or an allowed HTTPS image host.',
  );
const productSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120),
    brand: z.string().min(1).max(60),
    category: z.string().trim().min(2).max(50),
    price: z.number().int().min(100).max(100000000),
    mrp: z.number().int().min(100).max(100000000),
    description: z.string().min(10).max(4000),
    images: z.array(imageSchema).min(1).max(8),
    variants: z
      .array(
        z.object({
          size: z.string().min(1).max(20),
          color: z.string().min(1).max(50),
          stock: z.number().int().min(0).max(100000),
          reserved: z.number().int().min(0).default(0),
        }),
      )
      .min(1)
      .max(100),
    specifications: z.record(z.string().max(60), z.string().max(300)),
    features: z.array(z.string().max(200)).max(10),
    certification: z.string().max(200),
    active: z.boolean(),
    featured: z.boolean(),
  })
  .refine((p) => p.mrp >= p.price, 'MRP must be at least the selling price.')
  .refine(
    (p) => new Set(p.variants.map((v) => v.size + '|' + v.color)).size === p.variants.length,
    'Duplicate size and color variants.',
  );
api.post('/admin/products', async (req, res) => {
  const data = productSchema.parse(req.body);
  const p = await mutate((s) => {
    assert(
      s.categories.some((c) => c.name === data.category && c.active),
      'Choose an active category.',
    );
    assert(!s.products.some((p) => p.slug === data.slug), 'This slug is already used.');
    const p: Product = {
      ...data,
      variants: data.variants.map((v) => ({ ...v, reserved: 0 })),
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    s.products.push(p);
    return p;
  });
  res.status(201).json(p);
});
api.put('/admin/products/:id', async (req, res) => {
  const data = productSchema.parse(req.body);
  const p = await mutate((s) => {
    const p = s.products.find((p) => p.id === req.params.id);
    assert(p, 'Product not found.', 404);
    assert(
      s.categories.some((c) => c.name === data.category && c.active) || !data.active,
      'Choose an active category.',
    );
    assert(
      !s.products.some((x) => x.slug === data.slug && x.id !== p.id),
      'This slug is already used.',
    );
    for (const v of p.variants) {
      const next = data.variants.find((n) => n.size === v.size && n.color === v.color);
      assert(
        v.reserved === 0 || (next && next.stock >= v.reserved),
        'Cannot remove or reduce stock below reserved units.',
      );
    }
    data.variants = data.variants.map((v) => ({
      ...v,
      reserved:
        p.variants.find((old) => old.size === v.size && old.color === v.color)?.reserved || 0,
    }));
    Object.assign(p, data);
    return p;
  });
  res.json(p);
});
api.delete('/admin/products/:id', async (req, res) => {
  await mutate((s) => {
    const p = s.products.find((p) => p.id === req.params.id);
    assert(p, 'Product not found.', 404);
    p.active = false;
  });
  res.json({ ok: true });
});
const transitions: Record<string, string[]> = {
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Packed', 'Cancelled'],
  Packed: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
  Delivered: ['Returned'],
  Returned: [],
  Cancelled: [],
};
api.patch('/admin/orders/:id', async (req, res) => {
  const data = z
    .object({ status: z.string().max(50), tracking: z.string().max(200).default('') })
    .parse(req.body);
  const o = await mutate((s) => {
    const o = s.orders.find((o) => o.id === req.params.id);
    assert(o, 'Order not found.', 404);
    assert(o.paymentStatus === 'paid', 'Only paid orders can be fulfilled.');
    assert(
      transitions[o.status]?.includes(data.status) || o.status === data.status,
      'Invalid order status transition.',
    );
    o.status = data.status;
    o.tracking = data.tracking;
    o.notificationSent = false;
    o.timeline.push({ status: data.status, at: new Date().toISOString() });
    return o;
  });
  await notifyOrder(o);
  res.json(o);
});
api.post('/admin/orders/:id/refund', async (req, res) => {
  const s = await readState();
  const o = s.orders.find((o) => o.id === req.params.id);
  assert(o, 'Order not found.', 404);
  assert(
    ['Cancelled', 'Returned', 'Payment review'].includes(o.status),
    'Cancel or receive a returned order before refunding.',
  );
  assert(
    ['paid', 'refund_required'].includes(o.paymentStatus) && o.paymentId,
    'Order is not refundable.',
  );
  let processed = demo;
  if (!demo) {
    assert(razorpay, 'Payments unavailable.', 503);
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(o.paymentId)}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'X-Refund-Idempotency': o.id,
        },
        body: JSON.stringify({ amount: o.total, receipt: o.id }),
      },
    );
    assert(response.ok, 'Refund could not be initiated. Retry with the same order.', 502);
    const refund = await response.json();
    processed = refund.status === 'processed';
  }
  const saved = await mutate((s) => {
    const order = s.orders.find((x) => x.id === o.id)!;
    if (order.paymentStatus === 'refunded') return order;
    order.status = processed ? 'Refunded' : 'Refund pending';
    if (processed) order.paymentStatus = 'refunded';
    order.timeline.push({ status: order.status, at: new Date().toISOString() });
    return order;
  });
  res.json(saved);
});
api.post('/admin/orders/:id/notify', async (req, res) => {
  assert(process.env.SMTP_HOST, 'Email transport is not configured.', 503);
  const s = await readState();
  const o = s.orders.find((o) => o.id === req.params.id);
  assert(o, 'Order not found.', 404);
  await notifyOrder({ ...o, notificationSent: false });
  res.json({ ok: true });
});
api.post('/admin/coupons', async (req, res) => {
  const data = z
    .object({
      code: z.string().regex(/^[A-Z0-9]{3,30}$/),
      percent: z.number().int().min(1).max(100),
      minimum: z.number().int().min(0),
      maximum: z.number().int().min(100),
      expiresAt: z.string().datetime(),
      limit: z.number().int().min(1),
      perUser: z.number().int().min(1),
      active: z.boolean(),
      categories: z.array(z.string().max(50)).max(50).default([]),
      productIds: z.array(z.string().max(100)).max(100).default([]),
    })
    .parse(req.body);
  const result = await mutate((s) => {
    const c = s.coupons.find((c) => c.code === data.code);
    if (c) {
      Object.assign(c, data);
      return c;
    }
    const added = { id: randomUUID(), ...data };
    s.coupons.push(added);
    return added;
  });
  res.json(result);
});
api.delete('/admin/coupons/:id', async (req, res) => {
  await mutate((s) => {
    const c = s.coupons.find((c) => c.id === req.params.id);
    assert(c, 'Coupon not found.', 404);
    c.active = false;
  });
  res.json({ ok: true });
});
api.patch('/admin/reviews/:id', async (req, res) => {
  const { approved } = z.object({ approved: z.boolean() }).parse(req.body);
  await mutate((s) => {
    const r = s.reviews.find((r) => r.id === req.params.id);
    assert(r, 'Review not found.', 404);
    r.approved = approved;
  });
  res.json({ ok: true });
});
api.patch('/admin/tickets/:id', async (req, res) => {
  await mutate((s) => {
    const t = s.tickets.find((t) => t.id === req.params.id);
    assert(t, 'Message not found.', 404);
    t.resolved = true;
  });
  res.json({ ok: true });
});
app.use('/api/v1', api);
app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError)
    return res.status(400).json({ error: error.issues[0]?.message || 'Please check the form.' });
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  console.error(error instanceof Error ? error.message : 'Unexpected error');
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
export { app };
export async function start() {
  await initStore();
  const timer = setInterval(
    () => mutate((s) => expire(s)).catch(() => console.error('Reservation expiry failed.')),
    60_000,
  );
  timer.unref();
  const server = app.listen(Number(process.env.PORT || 5000), process.env.HOST || '127.0.0.1', () =>
    console.log(
      `BRMotoGear API listening on ${process.env.PORT || 5000} (${demo ? 'demo' : 'live'})`,
    ),
  );
  return server;
}
