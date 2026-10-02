import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

// Build a separate Express deployment without copying local data or credentials.
const root = path.resolve('.');
const output = path.join(root, '.vercel-api');
const source = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const dependencies = Object.fromEntries(
  [
    'bcryptjs',
    'cookie-parser',
    'dotenv',
    'express',
    'express-rate-limit',
    'helmet',
    'jsonwebtoken',
    'mongoose',
    'nodemailer',
    'razorpay',
    'zod',
  ].map((name) => [name, source.dependencies[name]]),
);
for (const folder of ['server', 'lib']) await mkdir(path.join(output, folder), { recursive: true });
for (const file of [
  'server/app.ts',
  'server/store.ts',
  'server/commerce.ts',
  'lib/seed.ts',
  'lib/types.ts',
]) {
  await copyFile(path.join(root, file), path.join(output, file));
}
await writeFile(
  path.join(output, 'package.json'),
  JSON.stringify(
    {
      name: 'brmotogear-api',
      private: true,
      type: 'module',
      engines: { node: '24.x' },
      dependencies,
    },
    null,
    2,
  ) + '\n',
);
await writeFile(
  path.join(output, 'vercel.json'),
  JSON.stringify(
    {
      $schema: 'https://openapi.vercel.sh/vercel.json',
      framework: 'express',
    },
    null,
    2,
  ) + '\n',
);
await writeFile(path.join(output, '.vercelignore'), '.env\n.env.*\ndata\nnode_modules\n');
await writeFile(
  path.join(output, 'server.ts'),
  `import express from 'express';
import { app } from './server/app';
import { initStore, mutate } from './server/store';
import { expire } from './server/commerce';

const service = express();
service.disable('x-powered-by');
let startup: Promise<void> | undefined;
let lastSweep = 0;
service.use(async (_req, res, next) => {
  try {
    startup ||= initStore().catch(error => { startup = undefined; throw error; });
    await startup;
    // Serverless instances cannot depend on a persistent interval timer.
    if (Date.now() - lastSweep > 60_000) {
      await mutate(state => expire(state));
      lastSweep = Date.now();
    }
    next();
  } catch {
    console.error('Backend initialization or reservation cleanup failed.');
    res.status(503).json({ error: 'The store is temporarily unavailable. Please try again.' });
  }
});
service.use(app);
export default service;
`,
);
console.log(
  'Prepared .vercel-api: standalone Express deployment; no local accounts, orders or secrets copied.',
);
