// Tests for video token routes
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { createMinimalMovie } from '../test/helpers.js';
import { db, schema } from '../db/index.js';
import { generateVideoToken, verifyVideoToken } from '../lib/video-token.js';
import { clearAllRateLimits } from '../lib/rate-limiter.js';
import type { FastifyInstance } from 'fastify';

describe('Video Token Routes', () => {
  let app: FastifyInstance;
  let editorAuth: { headers: { authorization: string }; userId: string };
  let movieId: string;
  let videoSourceId: string;

  beforeEach(async () => {
    app = await build({ includeAuth: true, includeRentals: true, includeVideoTokens: true });
    
    // Clean up auth data
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    
    // Clear rate limits
    clearAllRateLimits();
    
    // Create editor user
    editorAuth = await createTestEditor();
    
    // Create a test movie
    const movieData = createMinimalMovie();
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/movies',
      headers: editorAuth.headers,
      payload: movieData,
    });
    const created = JSON.parse(createResponse.body);
    movieId = created.id;
    
    // Insert video source directly into database
    const [videoSource] = await db.insert(schema.videoSources).values({
      movieId,
      url: 'https://example.com/test-movie.m3u8',
      format: 'hls',
      quality: '1080p',
    }).returning();
    videoSourceId = videoSource.id;
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe('POST /api/video-tokens', () => {
    it('should require authentication or anonymous ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/video-tokens',
        payload: {
          movieId,
          videoSourceId,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent video source', async () => {
      // Create rental first
      await db.insert(schema.rentals).values({
        movieId,
        userId: editorAuth.userId,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        transactionId: 'test-txn',
        amount: 500,
        currency: 'USD',
        paymentMethod: 'demo',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/video-tokens',
        headers: editorAuth.headers,
        payload: {
          movieId,
          videoSourceId: '00000000-0000-0000-0000-000000000000',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Video source not found');
    });

    it('should return 403 when no valid rental exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/video-tokens',
        headers: editorAuth.headers,
        payload: {
          movieId,
          videoSourceId,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('No valid rental found');
      expect(body.code).toBe('RENTAL_REQUIRED');
    });

    it('should return 403 when rental is expired', async () => {
      // Create expired rental
      await db.insert(schema.rentals).values({
        movieId,
        userId: editorAuth.userId,
        purchasedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 24 hours ago
        transactionId: 'test-txn-expired',
        amount: 500,
        currency: 'USD',
        paymentMethod: 'demo',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/video-tokens',
        headers: editorAuth.headers,
        payload: {
          movieId,
          videoSourceId,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('RENTAL_REQUIRED');
    });

    it('should generate signed URL for valid rental', async () => {
      // Create valid rental
      await db.insert(schema.rentals).values({
        movieId,
        userId: editorAuth.userId,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        transactionId: 'test-txn-valid',
        amount: 500,
        currency: 'USD',
        paymentMethod: 'demo',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/video-tokens',
        headers: editorAuth.headers,
        payload: {
          movieId,
          videoSourceId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toBeDefined();
      expect(body.url).toContain('token=');
      expect(body.url).toContain('master.m3u8');
      expect(body.expiresIn).toBe(900); // 15 minutes
    });

    it('should work with anonymous ID', async () => {
      const anonymousId = 'anon-test-123';
      
      // Create valid rental for anonymous user
      await db.insert(schema.rentals).values({
        movieId,
        anonymousId,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        transactionId: 'test-txn-anon',
        amount: 500,
        currency: 'USD',
        paymentMethod: 'demo',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/video-tokens',
        headers: {
          'x-anonymous-id': anonymousId,
        },
        payload: {
          movieId,
          videoSourceId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toBeDefined();
      expect(body.expiresIn).toBe(900);
    });

    it.skip('should allow access via pack rental (regression test)', async () => {
      // This test ensures pack rental validation doesn't get accidentally removed
      
      // Create a short pack
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'test-pack',
      }).returning();

      // Add translations for the pack
      await db.insert(schema.shortPackTranslations).values([
        { packId: pack.id, language: 'en', title: 'Test Pack', description: 'Test description' },
      ]);

      // Link the movie to the pack
      await db.insert(schema.shortPackItems).values({
        packId: pack.id,
        movieId,
        order: 1,
      });

      // Create a PACK rental (not a direct movie rental)
      await db.insert(schema.rentals).values({
        shortPackId: pack.id,
        movieId: null, // Important: no direct movie rental
        userId: editorAuth.userId,
        purchasedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        transactionId: 'test-pack-rental',
        amount: 499,
        currency: 'USD',
        paymentMethod: 'demo',
      });

      // Request video token for the movie
      const response = await app.inject({
        method: 'POST',
        url: '/api/video-tokens',
        headers: editorAuth.headers,
        payload: {
          movieId,
          videoSourceId,
        },
      });

      // Should succeed because user has pack rental
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toBeDefined();
      expect(body.url).toContain('token=');
      expect(body.expiresIn).toBe(900);
    });

    it.skip('should deny access when pack rental is expired', async () => {
      // Create a short pack
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'test-pack-expired',
      }).returning();

      await db.insert(schema.shortPackTranslations).values([
        { packId: pack.id, language: 'en', title: 'Test Pack', description: 'Test description' },
      ]);

      await db.insert(schema.shortPackItems).values({
        packId: pack.id,
        movieId,
        order: 1,
      });

      // Create an EXPIRED pack rental
      await db.insert(schema.rentals).values({
        shortPackId: pack.id,
        movieId: null,
        userId: editorAuth.userId,
        purchasedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 24 hours ago
        transactionId: 'test-pack-rental-expired',
        amount: 499,
        currency: 'USD',
        paymentMethod: 'demo',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/video-tokens',
        headers: editorAuth.headers,
        payload: {
          movieId,
          videoSourceId,
        },
      });

      // Should fail because pack rental is expired
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('RENTAL_REQUIRED');
    });

    it('should enforce rate limiting (30 requests per minute)', async () => {
      // Create a rental for the user
      await db.insert(schema.rentals).values({
        movieId,
        userId: editorAuth.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        transactionId: 'test-txn-' + Date.now(),
        amount: 299, // $2.99 in cents
        currency: 'USD',
      });

      // Make 30 requests (should all succeed)
      for (let i = 0; i < 30; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/video-tokens',
          headers: editorAuth.headers,
          payload: {
            movieId,
            videoSourceId,
          },
        });
        expect(response.statusCode).toBe(200);
      }

      // 31st request should be rate limited
      const rateLimitedResponse = await app.inject({
        method: 'POST',
        url: '/api/video-tokens',
        headers: editorAuth.headers,
        payload: {
          movieId,
          videoSourceId,
        },
      });

      expect(rateLimitedResponse.statusCode).toBe(429);
      const body = JSON.parse(rateLimitedResponse.body);
      expect(body.error).toBe('Too Many Requests');
      expect(body.message).toContain('Rate limit exceeded');
      expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
    });
  });

  describe('GET /api/video-tokens/validate/:token', () => {
    it('should reject an invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/video-tokens/validate/invalid-token-here',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should reject a malformed token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/video-tokens/validate/not.a.valid.token.format',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
    });
  });
});

describe('Video Token Utilities', () => {
  describe('generateVideoToken', () => {
    it('should generate a valid token', () => {
      const token = generateVideoToken({
        movieId: 'test-movie-id',
        userId: 'test-user-id',
        videoPath: 'hls/movie/master.m3u8',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(2);
    });

    it('should generate token with anonymousId', () => {
      const token = generateVideoToken({
        movieId: 'test-movie-id',
        anonymousId: 'anon-123',
        videoPath: 'hls/movie/master.m3u8',
      });

      expect(token).toBeDefined();
      const payload = verifyVideoToken(token);
      expect(payload.anonymousId).toBe('anon-123');
    });
  });

  describe('verifyVideoToken', () => {
    it('should verify and decode a valid token', () => {
      const originalPayload = {
        movieId: 'test-movie-id',
        userId: 'test-user-id',
        videoPath: 'hls/movie/master.m3u8',
      };

      const token = generateVideoToken(originalPayload);
      const decoded = verifyVideoToken(token);

      expect(decoded.movieId).toBe(originalPayload.movieId);
      expect(decoded.userId).toBe(originalPayload.userId);
      expect(decoded.videoPath).toBe(originalPayload.videoPath);
      expect(decoded.exp).toBeDefined();
    });

    it('should throw for invalid token format', () => {
      expect(() => verifyVideoToken('invalid')).toThrow('Invalid video token format');
    });

    it('should throw for tampered token', () => {
      const token = generateVideoToken({
        movieId: 'test-movie-id',
        userId: 'test-user-id',
        videoPath: 'hls/movie/master.m3u8',
      });

      // Tamper with the payload
      const [payload, signature] = token.split('.');
      const tamperedToken = `${payload}modified.${signature}`;

      expect(() => verifyVideoToken(tamperedToken)).toThrow();
    });
  });
});
