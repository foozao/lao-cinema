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
  if (!dbUrl) {
    throw new Error('❌ TEST_DATABASE_URL environment variable is required for tests!');
  }
  
  if (!dbUrl.includes('lao_cinema_test') && !dbUrl.includes('_test')) {
    throw new Error(
      `❌ TEST_DATABASE_URL must point to a test database (e.g., lao_cinema_test)!\n` +
      `   Current: ${dbUrl}\n` +
      `   This prevents accidentally running tests against production data.`
    );
  }
  
  console.log('🧪 Setting up test database: lao_cinema_test');
  console.log('   ⚠️  All data in this database will be cleared before and after each test');
  
  // Clear all tables (suppress NOTICE messages)
  await db.execute(sql`SET client_min_messages TO WARNING`);
  // Truncate in correct order to avoid foreign key issues
  await db.execute(sql`TRUNCATE TABLE users, movies RESTART IDENTITY CASCADE`);
});

// Clean up after each test to ensure isolation
afterEach(async () => {
  // Truncate in correct order to avoid foreign key issues
  await db.execute(sql`TRUNCATE TABLE users, movies RESTART IDENTITY CASCADE`);
});

// Close database connection after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test database...');
  // Note: postgres-js doesn't need explicit close in tests
});
