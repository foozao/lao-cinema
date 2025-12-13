// Tests for user-data routes (stats endpoint)
// Note: Migration tests are in migration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';
import type { FastifyInstance } from 'fastify';

describe('User Data Routes', () => {
  let app: FastifyInstance;
  let userAuth: { headers: { authorization: string }; userId: string };
  let movieId: string;

  beforeEach(async () => {
    // Use includeAuth which registers user-data routes via auth routes
    app = await build({ includeAuth: true });
    
    // Clean up auth data
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    
    // Create user
    userAuth = await createTestEditor();
    
    // Create a test movie directly in DB
    const [movie] = await db.insert(schema.movies).values({
      originalTitle: 'Test Movie',
      releaseDate: '2024-01-01',
    }).returning();
    movieId = movie.id;
  });

  describe('GET /api/users/me/stats', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/stats',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return empty stats for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/stats',
        headers: userAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.stats).toBeDefined();
      expect(body.stats.totalRentals).toBe(0);
      expect(body.stats.activeRentals).toBe(0);
      expect(body.stats.totalWatchProgress).toBe(0);
      expect(body.stats.completedMovies).toBe(0);
    });

    it('should return correct rental stats', async () => {
      // Create active rental
      await db.insert(schema.rentals).values({
        movieId,
        userId: userAuth.userId,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        transactionId: 'txn-active',
        amount: 500,
        currency: 'USD',
        paymentMethod: 'demo',
      });

      // Create another movie for expired rental
      const [movie2] = await db.insert(schema.movies).values({
        originalTitle: 'Test Movie 2',
        releaseDate: '2024-01-02',
      }).returning();

      // Create expired rental
      await db.insert(schema.rentals).values({
        movieId: movie2.id,
        userId: userAuth.userId,
        purchasedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        transactionId: 'txn-expired',
        amount: 500,
        currency: 'USD',
        paymentMethod: 'demo',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/stats',
        headers: userAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.stats.totalRentals).toBe(2);
      expect(body.stats.activeRentals).toBe(1);
    });

    it('should return correct watch progress stats', async () => {
      // Create incomplete progress
      await db.insert(schema.watchProgress).values({
        movieId,
        userId: userAuth.userId,
        progressSeconds: 300,
        durationSeconds: 7200,
        completed: false,
        lastWatchedAt: new Date(),
      });

      // Create another movie for completed progress
      const [movie3] = await db.insert(schema.movies).values({
        originalTitle: 'Test Movie 3',
        releaseDate: '2024-01-03',
      }).returning();

      // Create completed progress
      await db.insert(schema.watchProgress).values({
        movieId: movie3.id,
        userId: userAuth.userId,
        progressSeconds: 7200,
        durationSeconds: 7200,
        completed: true,
        lastWatchedAt: new Date(),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/users/me/stats',
        headers: userAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.stats.totalWatchProgress).toBe(2);
      expect(body.stats.completedMovies).toBe(1);
    });
  });
});
