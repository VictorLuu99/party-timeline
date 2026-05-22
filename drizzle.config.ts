import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  driver: 'd1-http', // for generation only; we apply via wrangler
});
