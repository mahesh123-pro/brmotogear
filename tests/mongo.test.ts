import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { demoState } from '../lib/seed';
import { createOrder, settle } from '../server/commerce';
import path from 'node:path';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
test(
  'MongoDB replica-set transactions prevent concurrent overselling and persist settlement',
  { timeout: 180000 },
  async () => {
    const root = path.resolve('data');
    await mkdir(root, { recursive: true });
    const dbPath = await mkdtemp(path.join(root, 'mongo-test-'));
    const replica = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      instanceOpts: [{ dbPath }],
      binary: {
        version: '8.2.6',
        downloadDir: path.resolve('node_modules/.cache/mongodb-memory-server'),
      },
    });
    try {
      process.env.DEMO_MODE = 'false';
      process.env.MONGODB_URI = replica.getUri('brmotogear_test');
      const { initStore, mutate, readState } = await import('../server/store');
      await initStore();
      await mutate((s) => {
        s.products = demoState().products;
        s.products[0].variants[0].stock = 1;
      });
      const address = {
        name: 'Mongo Rider',
        phone: '9876543210',
        email: 'mongo@example.com',
        address: '123 Test Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      };
      const results = await Promise.allSettled(
        ['rider1', 'rider2'].map((userId) =>
          mutate((s) =>
            createOrder(
              s,
              userId,
              [{ productId: 'p1', size: 'S', color: 'Black', quantity: 1 }],
              address,
              '',
              randomUUID(),
            ),
          ),
        ),
      );
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(results.filter((r) => r.status === 'rejected').length, 1);
      const state = await readState();
      assert.equal(state.orders.length, 1);
      assert.equal(state.products[0].variants[0].reserved, 1);
      const order = state.orders[0];
      await Promise.all([
        mutate((s) => settle(s, order.id, 'mongo_payment', order.total, 'INR')),
        mutate((s) => settle(s, order.id, 'mongo_payment', order.total, 'INR')),
      ]);
      await mongoose.disconnect();
      await initStore();
      const persisted = await readState();
      assert.equal(persisted.orders[0].paymentStatus, 'paid');
      assert.equal(persisted.products[0].variants[0].stock, 0);
      assert.equal(persisted.products[0].variants[0].reserved, 0);
    } finally {
      await mongoose.disconnect();
      await replica.stop();
      if (path.dirname(dbPath) === root && path.basename(dbPath).startsWith('mongo-test-'))
        await rm(dbPath, { recursive: true, force: true });
    }
  },
);
