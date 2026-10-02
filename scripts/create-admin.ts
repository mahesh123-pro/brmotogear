import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { initStore, mutate } from '../server/store';
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters).');
  await initStore();
  const passwordHash = await bcrypt.hash(password, 12);
  await mutate((s) => {
    if (s.users.some((u) => u.email === email))
      throw new Error('Account already exists; no role change made.');
    s.users.push({
      id: randomUUID(),
      name: 'Administrator',
      email,
      passwordHash,
      role: 'admin',
      addresses: [],
      cart: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
    });
  });
  console.log('Administrator created. Remove ADMIN_PASSWORD from your environment.');
  process.exit(0);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
