// Test setup and global configuration
import 'dotenv/config';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';

// Set test environment variables
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';

// Import db after setting env vars
import { db } from '../db/index.js';

// Clean up database before all tests
beforeAll(async () => {
  console.log('🧪 Setting up test database...');
  
  // Clear all tables
  await db.execute(sql`TRUNCATE TABLE movies, genres RESTART IDENTITY CASCADE`);
});

// Clean up after each test to ensure isolation
afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE movies, genres RESTART IDENTITY CASCADE`);
});

// Close database connection after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test database...');
  // Note: postgres-js doesn't need explicit close in tests
});
