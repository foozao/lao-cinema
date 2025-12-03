// Database connection using Drizzle ORM + PostgreSQL

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Schema re-exports from /db (see schema.ts)
import * as schema from './schema.js';

// Create postgres client with Cloud SQL support
// For Cloud SQL unix socket, use INSTANCE_CONNECTION_NAME env var
const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME;
let client;

if (INSTANCE_CONNECTION_NAME) {
  // Cloud SQL connection via unix socket
  client = postgres({
    host: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
    database: process.env.DB_NAME || 'laocinema',
    username: process.env.DB_USER || 'laocinema',
    password: process.env.DB_PASS,
  });
} else {
  // Standard connection via DATABASE_URL
  // Use TEST_DATABASE_URL in test environment to protect development data
  const DATABASE_URL = process.env.NODE_ENV === 'test' 
    ? process.env.TEST_DATABASE_URL 
    : process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    const requiredVar = process.env.NODE_ENV === 'test' ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
    throw new Error(`${requiredVar} environment variable is required`);
  }
  
  client = postgres(DATABASE_URL);
}

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for queries
export { schema };
