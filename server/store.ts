import mongoose from 'mongoose';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { demoState, emptyState } from '../lib/seed';
import type { State } from '../lib/types';

// Demo is opt-in outside development. Never fall back to demo on a DB error.
export const demo =
  process.env.DEMO_MODE === 'true' ||
  (process.env.NODE_ENV !== 'production' &&
    process.env.DEMO_MODE !== 'false' &&
    !process.env.MONGODB_URI);
const file = path.resolve(process.env.DATA_FILE || 'data/demo.json');
const keys = Object.keys(emptyState()) as (keyof State)[];
const models = Object.fromEntries(
  keys.map((key) => [
    key,
    mongoose.models[key] ||
      mongoose.model(
        key,
        new mongoose.Schema(
          { id: { type: String, unique: true, required: true } },
          { strict: false, versionKey: false },
        ),
        key,
      ),
  ]),
);
let queue: Promise<unknown> = Promise.resolve();
let local: State;
export async function initStore() {
  if (demo) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('Demo mode is disabled in production.');
    await mkdir(path.dirname(file), { recursive: true });
    try {
      local = { ...emptyState(), ...JSON.parse(await readFile(file, 'utf8')) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      local = demoState();
      await writeFile(file, JSON.stringify(local));
    }
  } else {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
    await mongoose.connect(process.env.MONGODB_URI);
    await Promise.all(Object.values(models).map((m) => m.init()));
    await mongoose.connection
      .collection('commerce_lock')
      .updateOne({ _id: 'global' as never }, { $setOnInsert: { revision: 0 } }, { upsert: true });
    for (const c of emptyState().categories)
      await models.categories.updateOne({ id: c.id }, { $setOnInsert: c }, { upsert: true });
    await models.users.collection.createIndex({ email: 1 }, { unique: true });
    await models.products.collection.createIndex({ slug: 1 }, { unique: true });
    await models.orders.collection.createIndex({ userId: 1, idempotencyKey: 1 }, { unique: true });
    await models.orders.collection.createIndex(
      { providerOrderId: 1 },
      { unique: true, sparse: true },
    );
  }
}
async function mongoRead(session?: mongoose.ClientSession): Promise<State> {
  const state = emptyState();
  // Sequential inside a Mongo transaction (parallel operations are unsupported).
  for (const key of keys)
    (state[key] as unknown[]) = await models[key]
      .find({}, { _id: 0 })
      .session(session || null)
      .lean();
  return state;
}
export async function readState(): Promise<State> {
  return demo ? structuredClone(local) : mongoRead();
}
export async function mutate<T>(fn: (state: State) => T): Promise<T> {
  if (demo) {
    const operation = queue.then(async () => {
      const next = structuredClone(local);
      const result = fn(next);
      await writeFile(`${file}.tmp`, JSON.stringify(next));
      await rename(`${file}.tmp`, file);
      local = next;
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  }
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      // A shared write serializes commerce mutations across API instances. The driver
      // retries conflicting transactions, preventing write skew on coupon limits and stock.
      await mongoose.connection
        .collection('commerce_lock')
        .updateOne({ _id: 'global' as never }, { $inc: { revision: 1 } }, { session });
      const before = await mongoRead(session);
      const after = structuredClone(before);
      result = fn(after);
      for (const key of keys) {
        const old = before[key] as { id: string }[];
        const rows = after[key] as { id: string }[];
        const changes = rows.filter(
          (r) => JSON.stringify(r) !== JSON.stringify(old.find((o) => o.id === r.id)),
        );
        for (const row of changes)
          await models[key].replaceOne({ id: row.id }, row, { upsert: true, session });
        const removed = old.filter((r) => !rows.some((n) => n.id === r.id)).map((r) => r.id);
        if (removed.length) await models[key].deleteMany({ id: { $in: removed } }, { session });
      }
    });
    return result;
  } finally {
    await session.endSession();
  }
}
