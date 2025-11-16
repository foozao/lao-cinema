// Database connection using Drizzle ORM + PostgreSQL

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Schema re-exports from /db (see schema.ts)
import * as schema from './schema.js';

// Get database URL from environment
// Use TEST_DATABASE_URL in test environment to protect development data
const DATABASE_URL = process.env.NODE_ENV === 'test' 
  ? process.env.TEST_DATABASE_URL 
  : process.env.DATABASE_URL;

if (!DATABASE_URL) {
  const requiredVar = process.env.NODE_ENV === 'test' ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
  throw new Error(`${requiredVar} environment variable is required`);
}

// Create postgres client
const client = postgres(DATABASE_URL);

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for queries
export { schema };
