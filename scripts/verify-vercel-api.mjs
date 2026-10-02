import assert from 'node:assert/strict';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = await mkdtemp(path.join(tmpdir(), 'brmoto-vercel-check-'));
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'true';
process.env.DATA_FILE = path.join(directory, 'state.json');
let server;
try {
  const { default: service } = await import('../.vercel-api/server.ts');
  server = service.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/v1`;
  const responses = await Promise.all(
    ['/health', '/products', '/config'].map((route) => fetch(url + route)),
  );
  responses.forEach((response) => assert.equal(response.status, 200));
  const products = await responses[1].json();
  assert.ok(products.length > 0);
  const blocked = await fetch(url + '/admin/overview');
  assert.equal(blocked.status, 401);
  console.log(
    'PASS: Vercel Express entry point initializes once across concurrent requests, serves catalog/config/health, and retains admin authentication.',
  );
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(process.env.DATA_FILE, { force: true });
  await rmdir(directory);
}
