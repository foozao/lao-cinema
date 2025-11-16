// Test setup and global configuration
import 'dotenv/config';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';

// Set test environment - this must be set BEFORE importing db
process.env.NODE_ENV = 'test';

// Import db after setting NODE_ENV (it will automatically use TEST_DATABASE_URL)
import { db } from '../db/index.js';

// Clean up database before all tests
beforeAll(async () => {
  // Verify we're using the test database
  const dbUrl = process.env.TEST_DATABASE_URL;
  if (!dbUrl || !dbUrl.includes('lao_cinema_test')) {
    throw new Error('❌ Tests must use TEST_DATABASE_URL pointing to lao_cinema_test database!');
  }
  
  console.log('🧪 Setting up test database: lao_cinema_test');
  
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
