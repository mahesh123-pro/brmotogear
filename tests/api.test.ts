import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
test('API authentication, authorization and payment boundaries', async (t) => {
  process.env.DEMO_MODE = 'true';
  process.env.DATA_FILE = join(await mkdtemp(join(tmpdir(), 'brmoto-test-')), 'state.json');
  process.env.JWT_SECRET = 'isolated-test-secret-at-least-32-characters';
  const { app } = await import('../server/app');
  const { initStore, mutate, readState } = await import('../server/store');
  await initStore();
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.on('listening', resolve));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}/api/v1`;
  function client() {
    const jar = new Map<string, string>();
    return {
      jar,
      async request(
        path: string,
        method = 'GET',
        body?: unknown,
        extra: Record<string, string> = {},
      ) {
        const response = await fetch(base + path, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
            ...extra,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        for (const value of response.headers.getSetCookie()) {
          const [pair] = value.split(';');
          const index = pair.indexOf('=');
          jar.set(pair.slice(0, index), pair.slice(index + 1));
        }
        return { status: response.status, data: await response.json() };
      },
    };
  }
  const rider = client(),
    other = client(),
    admin = client();
  const address = {
    name: 'API Rider',
    phone: '9876543210',
    email: 'api@example.com',
    address: '42 Sample Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
  };
  const item = { productId: 'p1', size: 'S', color: 'Black', quantity: 1 };
  let orderId = '';
  try {
    await t.test('anonymous admin access is rejected', async () =>
      assert.equal((await rider.request('/admin/overview')).status, 401),
    );
    await t.test('register does not accept an injected administrator role', async () => {
      const r = await rider.request('/auth/register', 'POST', {
        name: 'API Rider',
        email: 'api@example.com',
        password: 'test-password-2026',
        role: 'admin',
      });
      assert.equal(r.status, 201);
      assert.equal(r.data.role, 'customer');
      assert.equal(r.data.passwordHash, undefined);
    });
    await t.test('customer admin access is rejected', async () =>
      assert.equal((await rider.request('/admin/overview')).status, 403),
    );
    await t.test('cross-origin writes are rejected', async () =>
      assert.equal(
        (await rider.request('/cart', 'PUT', [], { Origin: 'https://evil.example' })).status,
        403,
      ),
    );
    await t.test('bad quantities are rejected', async () =>
      assert.equal(
        (
          await rider.request('/orders', 'POST', {
            items: [{ ...item, quantity: -1 }],
            address,
            idempotencyKey: randomUUID(),
          })
        ).status,
        400,
      ),
    );
    await t.test('client price overrides cannot affect order totals', async () => {
      const r = await rider.request('/orders', 'POST', {
        items: [{ ...item, price: 1 }],
        address,
        idempotencyKey: randomUUID(),
        total: 1,
      });
      assert.equal(r.status, 201);
      assert.equal(r.data.total, 499900);
      orderId = r.data.id;
    });
    await t.test('another customer cannot read or pay an order', async () => {
      await other.request('/auth/register', 'POST', {
        name: 'Other Rider',
        email: 'other@example.com',
        password: 'test-password-2026',
      });
      assert.equal((await other.request(`/orders/${orderId}`)).status, 404);
      assert.equal((await other.request('/payments/demo', 'POST', { orderId })).status, 404);
    });
    await t.test('duplicate simulated payments consume stock once', async () => {
      const [a, b] = await Promise.all([
        rider.request('/payments/demo', 'POST', { orderId }),
        rider.request('/payments/demo', 'POST', { orderId }),
      ]);
      assert.equal(a.status, 200);
      assert.equal(b.status, 200);
      assert.equal((await readState()).products[0].variants[0].stock, 11);
    });
    await t.test('live verification and forged webhooks are disabled in demo', async () => {
      assert.equal((await rider.request('/payments/verify', 'POST', {})).status, 503);
      assert.equal(
        (await rider.request('/payments/webhook', 'POST', { event: 'payment.captured' })).status,
        503,
      );
    });
    await t.test('concurrent last-unit orders cannot oversell', async () => {
      await mutate((s) => {
        s.products[0].variants[1].stock = 1;
      });
      const responses = await Promise.all(
        [rider, other].map((c) =>
          c.request('/orders', 'POST', {
            items: [{ ...item, size: 'M' }],
            address,
            idempotencyKey: randomUUID(),
          }),
        ),
      );
      assert.deepEqual(responses.map((r) => r.status).sort(), [201, 400]);
    });
    await t.test('review requires delivery, and customer cannot fulfil own order', async () => {
      assert.equal(
        (
          await rider.request('/products/p1/reviews', 'POST', {
            rating: 5,
            text: 'A test review before delivery.',
          })
        ).status,
        400,
      );
      assert.equal(
        (await rider.request(`/admin/orders/${orderId}`, 'PATCH', { status: 'Delivered' })).status,
        403,
      );
    });
    await t.test('admin transitions cannot skip fulfilment states', async () => {
      await admin.request('/auth/demo', 'POST', { role: 'admin' });
      assert.equal(
        (await admin.request(`/admin/orders/${orderId}`, 'PATCH', { status: 'Delivered' })).status,
        400,
      );
      assert.equal(
        (await admin.request(`/admin/orders/${orderId}`, 'PATCH', { status: 'Processing' })).status,
        200,
      );
    });
    await t.test('one-time email code cannot be replayed', async () => {
      const response = await other.request('/auth/otp/request', 'POST', {
        email: 'api@example.com',
      });
      assert.match(response.data.demoCode, /^\d{6}$/);
      assert.equal(
        (
          await other.request('/auth/otp/verify', 'POST', {
            email: 'api@example.com',
            code: response.data.demoCode,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await other.request('/auth/otp/verify', 'POST', {
            email: 'api@example.com',
            code: response.data.demoCode,
          })
        ).status,
        401,
      );
    });
    await t.test('refresh token rotates, and logout revokes the access session', async () => {
      const old = rider.jar.get('refresh');
      assert.equal((await rider.request('/auth/refresh', 'POST')).status, 200);
      assert.notEqual(rider.jar.get('refresh'), old);
      const attacker = client();
      attacker.jar.set('refresh', old!);
      assert.equal((await attacker.request('/auth/refresh', 'POST')).status, 401);
      const access = rider.jar.get('access');
      await rider.request('/auth/logout', 'POST');
      rider.jar.set('access', access!);
      assert.equal((await rider.request('/auth/me')).status, 401);
    });
    await t.test('guest refresh checks do not exhaust sign-in or contact allowances', async () => {
      const guest = client();
      for (let i = 0; i < 35; i++)
        assert.equal((await guest.request('/auth/refresh', 'POST')).status, 401);
      assert.equal(
        (
          await guest.request('/auth/login', 'POST', {
            email: 'api@example.com',
            password: 'test-password-2026',
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await guest.request('/contact', 'POST', {
            name: 'API Rider',
            email: 'api@example.com',
            message: 'A test enquiry after repeated guest browsing.',
          })
        ).status,
        201,
      );
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }
});
