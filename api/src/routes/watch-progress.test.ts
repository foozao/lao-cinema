/**
 * Watch Progress Routes Tests
 * 
 * Tests watch progress tracking for both authenticated and anonymous users.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { db } from '../db/index.js';
import { watchProgress } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { 
  createTestMovie, 
  createTestUser,
  cleanupUsers, 
  cleanupWatchProgress 
} from '../test/fixtures.js';
import { generateAnonymousId, extractAnonymousId } from '../lib/anonymous-id.js';

describe('Watch Progress Routes', () => {
  let app: FastifyInstance;
  let movieId1: string;
  let movieId2: string;

  beforeEach(async () => {
    app = await build({ includeAuth: true, includeWatchProgress: true });
    
    // Clean up test data using fixtures
    await cleanupWatchProgress();
    await cleanupUsers();
    
    // Create test movies using fixtures
    const movie1 = await createTestMovie({ originalTitle: 'Test Movie 1' });
    movieId1 = movie1.id;
    
    const movie2 = await createTestMovie({ originalTitle: 'Test Movie 2', releaseDate: '2024-01-02' });
    movieId2 = movie2.id;
  });

  // =============================================================================
  // ANONYMOUS USER TESTS
  // =============================================================================

  describe('Anonymous User', () => {
    // Generate a valid signed anonymous ID for testing
    const signedAnonymousId = generateAnonymousId();
    const anonymousId = extractAnonymousId(signedAnonymousId);

    describe('GET /api/watch-progress', () => {
      it('should return empty array when no progress exists', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/watch-progress',
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress).toEqual([]);
        expect(body.total).toBe(0);
      });

      it('should return all watch progress records', async () => {
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
            progressSeconds: 5000,
            durationSeconds: 5400,
            completed: true,
            lastWatchedAt: new Date(),
          },
        ]);

        const response = await app.inject({
          method: 'GET',
          url: '/api/watch-progress',
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress).toHaveLength(2);
        expect(body.total).toBe(2);
      });

      it('should not return progress from other users', async () => {
        await db.insert(watchProgress).values({
          anonymousId: 'anon_other_user',
          movieId: movieId1,
          progressSeconds: 500,
          durationSeconds: 5400,
          completed: false,
          lastWatchedAt: new Date(),
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/watch-progress',
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress).toHaveLength(0);
      });

      it('should order by lastWatchedAt descending', async () => {
        const now = new Date();
        await db.insert(watchProgress).values([
          {
            anonymousId,
            movieId: movieId1,
            progressSeconds: 100,
            durationSeconds: 5400,
            completed: false,
            lastWatchedAt: new Date(now.getTime() - 60000), // 1 minute ago
          },
          {
            anonymousId,
            movieId: movieId2,
            progressSeconds: 200,
            durationSeconds: 5400,
            completed: false,
            lastWatchedAt: now, // Most recent
          },
        ]);

        const response = await app.inject({
          method: 'GET',
          url: '/api/watch-progress',
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress[0].movieId).toBe(movieId2); // Most recent first
      });
    });

    describe('GET /api/watch-progress/:movieId', () => {
      it('should return null for movie without progress', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress).toBeNull();
      });

      it('should return progress details', async () => {
        await db.insert(watchProgress).values({
          anonymousId,
          movieId: movieId1,
          progressSeconds: 600,
          durationSeconds: 5400,
          completed: false,
          lastWatchedAt: new Date(),
        });

        const response = await app.inject({
          method: 'GET',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress).not.toBeNull();
        expect(body.progress.movieId).toBe(movieId1);
        expect(body.progress.progressSeconds).toBe(600);
        expect(body.progress.durationSeconds).toBe(5400);
        expect(body.progress.completed).toBe(false);
      });
    });

    describe('PUT /api/watch-progress/:movieId', () => {
      it('should create new watch progress', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
          payload: {
            progressSeconds: 300,
            durationSeconds: 5400,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress).toBeDefined();
        expect(body.progress.movieId).toBe(movieId1);
        expect(body.progress.progressSeconds).toBe(300);
        expect(body.progress.durationSeconds).toBe(5400);
        expect(body.progress.completed).toBe(false);
      });

      it('should update existing watch progress', async () => {
        // Create initial progress
        await db.insert(watchProgress).values({
          anonymousId,
          movieId: movieId1,
          progressSeconds: 300,
          durationSeconds: 5400,
          completed: false,
          lastWatchedAt: new Date(),
        });

        // Update progress
        const response = await app.inject({
          method: 'PUT',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
          payload: {
            progressSeconds: 1200,
            durationSeconds: 5400,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress.progressSeconds).toBe(1200);

        // Verify only one record exists
        const allProgress = await db.select()
          .from(watchProgress)
          .where(eq(watchProgress.anonymousId, anonymousId));
        expect(allProgress).toHaveLength(1);
      });

      it('should auto-complete when progress > 90%', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
          payload: {
            progressSeconds: 4900, // > 90% of 5400
            durationSeconds: 5400,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress.completed).toBe(true);
      });

      it('should not auto-complete when progress < 90%', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
          payload: {
            progressSeconds: 4000, // < 90% of 5400
            durationSeconds: 5400,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress.completed).toBe(false);
      });

      it('should allow manual completion override', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
          payload: {
            progressSeconds: 100, // Only 100 seconds
            durationSeconds: 5400,
            completed: true, // Manual override
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress.completed).toBe(true);
      });

      it('should reject missing progressSeconds', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
          payload: {
            durationSeconds: 5400,
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.detail).toContain('required');
      });

      it('should reject missing durationSeconds', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
          payload: {
            progressSeconds: 300,
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.detail).toContain('required');
      });

      it('should reject negative values', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
          payload: {
            progressSeconds: -100,
            durationSeconds: 5400,
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.detail).toContain('non-negative');
      });

      it('should reject non-existent movie', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/api/watch-progress/00000000-0000-0000-0000-000000000000',
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
          payload: {
            progressSeconds: 300,
            durationSeconds: 5400,
          },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body);
        expect(body.detail).toContain('Movie not found');
      });
    });

    describe('DELETE /api/watch-progress/:movieId', () => {
      it('should delete watch progress', async () => {
        // Create progress
        await db.insert(watchProgress).values({
          anonymousId,
          movieId: movieId1,
          progressSeconds: 600,
          durationSeconds: 5400,
          completed: false,
          lastWatchedAt: new Date(),
        });

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        // Verify deleted
        const remaining = await db.select()
          .from(watchProgress)
          .where(eq(watchProgress.anonymousId, anonymousId));
        expect(remaining).toHaveLength(0);
      });

      it('should succeed even if no progress exists', async () => {
        const response = await app.inject({
          method: 'DELETE',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      });

      it('should not delete other users progress', async () => {
        // Create progress for another user
        await db.insert(watchProgress).values({
          anonymousId: 'anon_other',
          movieId: movieId1,
          progressSeconds: 600,
          durationSeconds: 5400,
          completed: false,
          lastWatchedAt: new Date(),
        });

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            'x-anonymous-id': signedAnonymousId,
          },
        });

        expect(response.statusCode).toBe(200);

        // Verify other user's progress still exists
        const otherProgress = await db.select()
          .from(watchProgress)
          .where(eq(watchProgress.anonymousId, 'anon_other'));
        expect(otherProgress).toHaveLength(1);
      });
    });
  });

  // =============================================================================
  // AUTHENTICATED USER TESTS
  // =============================================================================

  describe('Authenticated User', () => {
    let sessionToken: string;
    let userId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'progress@example.com',
          password: 'password123',
        },
      });
      const body = JSON.parse(response.body);
      sessionToken = body.session.token;
      userId = body.user.id;
    });

    describe('GET /api/watch-progress', () => {
      it('should return user watch progress', async () => {
        await db.insert(watchProgress).values({
          userId,
          movieId: movieId1,
          progressSeconds: 300,
          durationSeconds: 5400,
          completed: false,
          lastWatchedAt: new Date(),
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/watch-progress',
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress).toHaveLength(1);
        expect(body.progress[0].movieId).toBe(movieId1);
      });

      it('should not return anonymous progress', async () => {
        await db.insert(watchProgress).values({
          anonymousId: 'anon_other',
          movieId: movieId1,
          progressSeconds: 300,
          durationSeconds: 5400,
          completed: false,
          lastWatchedAt: new Date(),
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/watch-progress',
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.progress).toHaveLength(0);
      });
    });

    describe('PUT /api/watch-progress/:movieId', () => {
      it('should create progress for authenticated user', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/watch-progress/${movieId1}`,
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
          payload: {
            progressSeconds: 600,
            durationSeconds: 5400,
          },
        });

        expect(response.statusCode).toBe(200);

        // Verify progress is linked to user
        const [progress] = await db.select()
          .from(watchProgress)
          .where(eq(watchProgress.userId, userId));
        
        expect(progress).toBeDefined();
        expect(progress.anonymousId).toBeNull();
      });
    });

    describe('POST /api/watch-progress/migrate', () => {
      it('should migrate anonymous progress to authenticated user', async () => {
        const anonymousId = 'anon_migrate_progress';
        
        // Create anonymous progress
        await db.insert(watchProgress).values([
          {
            anonymousId,
            movieId: movieId1,
            progressSeconds: 600,
            durationSeconds: 5400,
            completed: false,
            lastWatchedAt: new Date(),
          },
          {
            anonymousId,
            movieId: movieId2,
            progressSeconds: 5000,
            durationSeconds: 5400,
            completed: true,
            lastWatchedAt: new Date(),
          },
        ]);

        const response = await app.inject({
          method: 'POST',
          url: '/api/watch-progress/migrate',
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

        // Verify progress is now linked to user
        const userProgress = await db.select()
          .from(watchProgress)
          .where(eq(watchProgress.userId, userId));
        
        expect(userProgress).toHaveLength(2);
        expect(userProgress[0].anonymousId).toBeNull();
        expect(userProgress[1].anonymousId).toBeNull();
      });

      it('should require authentication', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/watch-progress/migrate',
          headers: {
            'x-anonymous-id': 'anon_test',
          },
          payload: {
            anonymousId: 'anon_test',
          },
        });

        expect(response.statusCode).toBe(401);
      });

      it('should require anonymous ID in body', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/watch-progress/migrate',
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
          payload: {},
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.detail).toContain('Anonymous ID is required');
      });

      it('should handle migration with no matching progress', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/watch-progress/migrate',
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
          payload: {
            anonymousId: 'anon_nonexistent',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.migratedProgress).toBe(0);
      });
    });
  });

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  describe('Error Handling', () => {
    it('should require authentication or anonymous ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/watch-progress',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
