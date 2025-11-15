// Database connection using Drizzle ORM + PostgreSQL

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres client
const client = postgres(DATABASE_URL);

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for queries
export { schema };
