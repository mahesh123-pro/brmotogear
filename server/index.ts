import { start } from './app';
start().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
