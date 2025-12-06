/**
 * Anonymous Data Migration Tests
 * 
 * Tests migration of rentals and watch progress from anonymous to authenticated users.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { db } from '../db/index.js';
import { users, userSessions, rentals, watchProgress, movies } from '../../../db/src/schema.js';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

describe('Anonymous Data Migration', () => {
  let app: FastifyInstance;
  let movieId1: string;
  let movieId2: string;
  
  beforeEach(async () => {
    app = await build({ includeAuth: true });
    // Clean up test data
    await db.delete(watchProgress);
    await db.delete(rentals);
    await db.delete(userSessions);
    await db.delete(users);
    
    // Create test movies
    const [movie1] = await db.insert(movies).values({
      originalTitle: 'Test Movie 1',
      releaseDate: '2024-01-01',
    }).returning();
    movieId1 = movie1.id;
    
    const [movie2] = await db.insert(movies).values({
      originalTitle: 'Test Movie 2',
      releaseDate: '2024-01-02',
    }).returning();
    movieId2 = movie2.id;
  });
  
  describe('POST /api/users/migrate', () => {
    let sessionToken: string;
    let userId: string;
    const anonymousId = 'anon_test_12345';
    
    beforeEach(async () => {
      // Register user
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'migrate@example.com',
          password: 'password123',
        },
      });
      const body = JSON.parse(response.body);
      sessionToken = body.session.token;
      userId = body.user.id;
    });
    
    it('should migrate anonymous rentals to user', async () => {
      // Create anonymous rentals
      await db.insert(rentals).values([
        {
          anonymousId,
          movieId: movieId1,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn1',
          amount: 500,
          paymentMethod: 'demo',
        },
        {
          anonymousId,
          movieId: movieId2,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn2',
          amount: 500,
          paymentMethod: 'demo',
        },
      ]);
      
      // Migrate
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/migrate',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          anonymousId,
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.migratedRentals).toBe(2);
      
      // Verify rentals now have userId
      const userRentals = await db
        .select()
        .from(rentals)
        .where(eq(rentals.userId, userId));
      
      expect(userRentals).toHaveLength(2);
      expect(userRentals[0].anonymousId).toBeNull();
      expect(userRentals[1].anonymousId).toBeNull();
    });
    
    it('should migrate anonymous watch progress to user', async () => {
      // Create anonymous watch progress
      await db.insert(watchProgress).values([
        {
          anonymousId,
          movieId: movieId1,
          progressSeconds: 300,
          durationSeconds: 5400,
          completed: false,
          lastWatchedAt: new Date(),
        },
        {
          anonymousId,
          movieId: movieId2,
          progressSeconds: 1200,
          durationSeconds: 7200,
          completed: false,
          lastWatchedAt: new Date(),
        },
      ]);
      
      // Migrate
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/migrate',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          anonymousId,
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.migratedProgress).toBe(2);
      
      // Verify watch progress now has userId
      const userProgress = await db
        .select()
        .from(watchProgress)
        .where(eq(watchProgress.userId, userId));
      
      expect(userProgress).toHaveLength(2);
      expect(userProgress[0].anonymousId).toBeNull();
      expect(userProgress[1].anonymousId).toBeNull();
    });
    
    it('should migrate both rentals and watch progress', async () => {
      // Create anonymous data
      await db.insert(rentals).values({
        anonymousId,
        movieId: movieId1,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        transactionId: 'txn1',
        amount: 500,
        paymentMethod: 'demo',
      });
      
      await db.insert(watchProgress).values({
        anonymousId,
        movieId: movieId1,
        progressSeconds: 600,
        durationSeconds: 5400,
        completed: false,
        lastWatchedAt: new Date(),
      });
      
      // Migrate
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/migrate',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          anonymousId,
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.migratedRentals).toBe(1);
      expect(body.migratedProgress).toBe(1);
    });
    
    it('should handle migration with no anonymous data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/migrate',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          anonymousId: 'anon_nonexistent',
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.migratedRentals).toBe(0);
      expect(body.migratedProgress).toBe(0);
    });
    
    it('should not migrate data from other anonymous users', async () => {
      const otherAnonymousId = 'anon_other_67890';
      
      // Create data for different anonymous user
      await db.insert(rentals).values({
        anonymousId: otherAnonymousId,
        movieId: movieId1,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        transactionId: 'txn1',
        amount: 500,
        paymentMethod: 'demo',
      });
      
      // Try to migrate with wrong anonymousId
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/migrate',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          anonymousId,
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.migratedRentals).toBe(0);
      
      // Verify other user's data is untouched
      const otherRentals = await db
        .select()
        .from(rentals)
        .where(eq(rentals.anonymousId, otherAnonymousId));
      
      expect(otherRentals).toHaveLength(1);
      expect(otherRentals[0].userId).toBeNull();
    });
    
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/migrate',
        payload: {
          anonymousId,
        },
      });
      
      expect(response.statusCode).toBe(401);
    });
    
    it.skip('should handle duplicate movie rentals (keep user rental)', async () => {
      // User already has a rental for movie1
      await db.insert(rentals).values({
        userId,
        movieId: movieId1,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        transactionId: 'user_txn',
        amount: 500,
        paymentMethod: 'demo',
      });
      
      // Anonymous user also has rental for movie1
      await db.insert(rentals).values({
        anonymousId,
        movieId: movieId1,
        purchasedAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        transactionId: 'anon_txn',
        amount: 500,
        paymentMethod: 'demo',
      });
      
      // Migrate
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/migrate',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          anonymousId,
        },
      });
      
      expect(response.statusCode).toBe(200);
      
      // Should still have only one rental for movie1
      const userRentals = await db
        .select()
        .from(rentals)
        .where(eq(rentals.userId, userId));
      
      expect(userRentals).toHaveLength(1);
      expect(userRentals[0].transactionId).toBe('user_txn'); // Original user rental preserved
    });
    
    it.skip('should handle duplicate watch progress (keep most recent)', async () => {
      const now = new Date();
      
      // User already has watch progress for movie1
      await db.insert(watchProgress).values({
        userId,
        movieId: movieId1,
        progressSeconds: 1000,
        durationSeconds: 5400,
        completed: false,
        lastWatchedAt: new Date(now.getTime() - 60000), // 1 minute ago
      });
      
      // Anonymous user has more recent progress
      await db.insert(watchProgress).values({
        anonymousId,
        movieId: movieId1,
        progressSeconds: 2000,
        durationSeconds: 5400,
        completed: false,
        lastWatchedAt: now, // More recent
      });
      
      // Migrate
      const response = await app.inject({
        method: 'POST',
        url: '/api/users/migrate',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          anonymousId,
        },
      });
      
      expect(response.statusCode).toBe(200);
      
      // Should keep the more recent progress
      const userProgress = await db
        .select()
        .from(watchProgress)
        .where(eq(watchProgress.userId, userId));
      
      expect(userProgress).toHaveLength(1);
      expect(userProgress[0].progressSeconds).toBe(2000); // Anonymous progress (more recent)
    });
  });
  
  describe('GET /api/users/me/stats', () => {
    let sessionToken: string;
    let userId: string;
    
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'stats@example.com',
          password: 'password123',
        },
      });
      const body = JSON.parse(response.body);
      sessionToken = body.session.token;
      userId = body.user.id;
    });
    
    it('should return user statistics', async () => {
      // Create test data
      await db.insert(rentals).values([
        {
          userId,
          movieId: movieId1,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn1',
          amount: 500,
          paymentMethod: 'demo',
        },
        {
          userId,
          movieId: movieId2,
          purchasedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
          transactionId: 'txn2',
          amount: 500,
          paymentMethod: 'demo',
        },
      ]);
      
      await db.insert(watchProgress).values([
        {
          userId,
          movieId: movieId1,
          progressSeconds: 300,
          durationSeconds: 5400,
          completed: false,
          lastWatchedAt: new Date(),
        },
        {
          userId,
          movieId: movieId1,
          progressSeconds: 5000,
          durationSeconds: 5400,
          completed: true,
          lastWatchedAt: new Date(),
        },
      ]);
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/stats',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.stats.totalRentals).toBe(2);
      expect(body.stats.activeRentals).toBe(1);
      expect(body.stats.totalWatchProgress).toBe(2);
      expect(body.stats.completedMovies).toBe(1);
    });
    
    it('should return zero stats for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/stats',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.stats.totalRentals).toBe(0);
      expect(body.stats.activeRentals).toBe(0);
      expect(body.stats.totalWatchProgress).toBe(0);
      expect(body.stats.completedMovies).toBe(0);
    });
  });
});
