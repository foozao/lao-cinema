import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../db/src/schema.ts', // Use shared schema from /db
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
