// Tests for trailer token routes
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { createMinimalMovie } from '../test/helpers.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { generateTrailerToken, verifyTrailerToken } from '../lib/trailer-token.js';
import { generateAnonymousId, extractAnonymousId } from '../lib/anonymous-id.js';
import { clearAllRateLimits } from '../lib/rate-limiter.js';
import type { FastifyInstance } from 'fastify';

describe('Trailer Token Routes', () => {
  let app: FastifyInstance;
  let editorAuth: { headers: { authorization: string }; userId: string };
  let movieId: string;
  let trailerId: string;

  beforeEach(async () => {
    app = await build({ includeAuth: true, includeTrailerTokens: true });
    
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
    
    // Insert trailer directly into database
    const [trailer] = await db.insert(schema.trailers).values({
      movieId,
      type: 'video',
      name: 'Test Trailer',
      videoUrl: 'chanthaly', // Slug format
      videoFormat: 'hls',
      videoQuality: '1080p',
    }).returning();
    trailerId = trailer.id;
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe('POST /api/trailer-tokens', () => {
    it('should require authentication or anonymous ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        payload: {
          trailerId,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent trailer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: editorAuth.headers,
        payload: {
          trailerId: '00000000-0000-0000-0000-000000000000',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Trailer not found');
    });

    it('should return 400 for YouTube trailers', async () => {
      // Create a YouTube trailer
      const [youtubeTrailer] = await db.insert(schema.trailers).values({
        movieId,
        type: 'youtube',
        name: 'YouTube Trailer',
        youtubeKey: 'dQw4w9WgXcQ',
      }).returning();

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: editorAuth.headers,
        payload: {
          trailerId: youtubeTrailer.id,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Trailer tokens are only for self-hosted videos');
    });

    it('should generate signed URL without rental check', async () => {
      // NO RENTAL CREATED - this is the key difference from video tokens
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: editorAuth.headers,
        payload: {
          trailerId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toBeDefined();
      expect(body.url).toContain('token=');
      expect(body.url).toContain('/trailers/');
      expect(body.expiresIn).toBe(7200); // 2 hours
    });

    it('should work with anonymous ID', async () => {
      const signedAnonymousId = generateAnonymousId();
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: {
          'x-anonymous-id': signedAnonymousId,
        },
        payload: {
          trailerId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toBeDefined();
      expect(body.expiresIn).toBe(7200);
    });

    it('should handle trailer URL as slug format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: editorAuth.headers,
        payload: {
          trailerId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toContain('trailers/hls/chanthaly/master.m3u8');
    });

    it('should handle trailer URL with /trailers/ prefix', async () => {
      // Update trailer with full path
      await db.update(schema.trailers)
        .set({ videoUrl: '/trailers/hls/test-movie/master.m3u8' })
        .where(eq(schema.trailers.id, trailerId));

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: editorAuth.headers,
        payload: {
          trailerId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toContain('trailers/hls/test-movie/master.m3u8');
    });

    it('should handle trailer URL as full URL', async () => {
      // Update trailer with full URL
      await db.update(schema.trailers)
        .set({ videoUrl: 'http://localhost:3002/trailers/hls/test-movie/master.m3u8' })
        .where(eq(schema.trailers.id, trailerId));

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: editorAuth.headers,
        payload: {
          trailerId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toContain('trailers/hls/test-movie/master.m3u8');
    });

    it('should return 400 when trailer has no video URL', async () => {
      // Update trailer to have null videoUrl
      await db.update(schema.trailers)
        .set({ videoUrl: null })
        .where(eq(schema.trailers.id, trailerId));

      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: editorAuth.headers,
        payload: {
          trailerId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Trailer has no video URL');
    });

    it('should enforce rate limiting (30 requests per minute)', async () => {
      // Make 30 requests (should all succeed)
      for (let i = 0; i < 30; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/trailer-tokens',
          headers: editorAuth.headers,
          payload: {
            trailerId,
          },
        });
        expect(response.statusCode).toBe(200);
      }

      // 31st request should be rate limited
      const rateLimitedResponse = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: editorAuth.headers,
        payload: {
          trailerId,
        },
      });

      expect(rateLimitedResponse.statusCode).toBe(429);
      const body = JSON.parse(rateLimitedResponse.body);
      expect(body.title).toBe('Too Many Requests');
      expect(body.detail).toContain('Rate limit exceeded');
      expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
    });

    it('should include userId in token payload when authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: editorAuth.headers,
        payload: {
          trailerId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Extract and verify token
      const urlParams = new URL(body.url, 'http://localhost').searchParams;
      const token = urlParams.get('token');
      expect(token).toBeDefined();
      
      const payload = verifyTrailerToken(token!);
      expect(payload.userId).toBe(editorAuth.userId);
      expect(payload.trailerId).toBe(trailerId);
      expect(payload.movieId).toBe(movieId);
    });

    it('should include anonymousId in token payload when using anonymous ID', async () => {
      const signedAnonymousId = generateAnonymousId();
      const anonymousId = extractAnonymousId(signedAnonymousId);
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/trailer-tokens',
        headers: {
          'x-anonymous-id': signedAnonymousId,
        },
        payload: {
          trailerId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      // Extract and verify token
      const urlParams = new URL(body.url, 'http://localhost').searchParams;
      const token = urlParams.get('token');
      expect(token).toBeDefined();
      
      const payload = verifyTrailerToken(token!);
      expect(payload.anonymousId).toBe(anonymousId);
      expect(payload.userId).toBeUndefined();
    });
  });

  describe('GET /api/trailer-tokens/validate', () => {
    it('should reject missing token parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/trailer-tokens/validate',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Token parameter is required');
    });

    it('should reject an invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/trailer-tokens/validate?token=invalid-token-here',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should reject a malformed token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/trailer-tokens/validate?token=not.a.valid.token.format',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
    });

    it('should validate and return payload for valid token', async () => {
      const token = generateTrailerToken({
        trailerId,
        movieId,
        userId: editorAuth.userId,
        trailerPath: 'trailers/hls/chanthaly/master.m3u8',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/trailer-tokens/validate?token=${encodeURIComponent(token)}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(true);
      expect(body.payload).toBeDefined();
      expect(body.payload.trailerId).toBe(trailerId);
      expect(body.payload.movieId).toBe(movieId);
      expect(body.payload.userId).toBe(editorAuth.userId);
      expect(body.payload.trailerPath).toBe('trailers/hls/chanthaly/master.m3u8');
    });
  });
});

describe('Trailer Token Utilities', () => {
  describe('generateTrailerToken', () => {
    it('should generate a valid token', () => {
      const token = generateTrailerToken({
        trailerId: 'test-trailer-id',
        movieId: 'test-movie-id',
        userId: 'test-user-id',
        trailerPath: 'trailers/hls/test/master.m3u8',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(2);
    });

    it('should generate token with anonymousId', () => {
      const token = generateTrailerToken({
        trailerId: 'test-trailer-id',
        movieId: 'test-movie-id',
        anonymousId: 'anon-123',
        trailerPath: 'trailers/hls/test/master.m3u8',
      });

      expect(token).toBeDefined();
      const payload = verifyTrailerToken(token);
      expect(payload.anonymousId).toBe('anon-123');
      expect(payload.userId).toBeUndefined();
    });

    it('should include 2-hour expiry', () => {
      const token = generateTrailerToken({
        trailerId: 'test-trailer-id',
        movieId: 'test-movie-id',
        userId: 'test-user-id',
        trailerPath: 'trailers/hls/test/master.m3u8',
      });

      const payload = verifyTrailerToken(token);
      const now = Math.floor(Date.now() / 1000);
      const twoHours = 2 * 60 * 60;
      
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(now);
      expect(payload.exp).toBeLessThanOrEqual(now + twoHours + 5); // Allow 5 second buffer
    });
  });

  describe('verifyTrailerToken', () => {
    it('should verify and decode a valid token', () => {
      const originalPayload = {
        trailerId: 'test-trailer-id',
        movieId: 'test-movie-id',
        userId: 'test-user-id',
        trailerPath: 'trailers/hls/test/master.m3u8',
      };

      const token = generateTrailerToken(originalPayload);
      const decoded = verifyTrailerToken(token);

      expect(decoded.trailerId).toBe(originalPayload.trailerId);
      expect(decoded.movieId).toBe(originalPayload.movieId);
      expect(decoded.userId).toBe(originalPayload.userId);
      expect(decoded.trailerPath).toBe(originalPayload.trailerPath);
      expect(decoded.exp).toBeDefined();
    });

    it('should throw for invalid token format', () => {
      expect(() => verifyTrailerToken('invalid')).toThrow('Invalid trailer token format');
    });

    it('should throw for tampered token', () => {
      const token = generateTrailerToken({
        trailerId: 'test-trailer-id',
        movieId: 'test-movie-id',
        userId: 'test-user-id',
        trailerPath: 'trailers/hls/test/master.m3u8',
      });

      // Tamper with the payload
      const [payload, signature] = token.split('.');
      const tamperedToken = `${payload}modified.${signature}`;

      expect(() => verifyTrailerToken(tamperedToken)).toThrow();
    });

    it('should throw for token with missing required fields', () => {
      // Create a token-like string with missing fields
      const incompletePayload = {
        trailerId: 'test-trailer-id',
        // Missing movieId and trailerPath
      };
      
      const payloadStr = JSON.stringify(incompletePayload);
      const payloadB64 = Buffer.from(payloadStr).toString('base64url');
      const fakeToken = `${payloadB64}.fakesignature`;

      expect(() => verifyTrailerToken(fakeToken)).toThrow();
    });

    it('should handle both userId and anonymousId correctly', () => {
      const tokenWithUser = generateTrailerToken({
        trailerId: 'test-trailer-id',
        movieId: 'test-movie-id',
        userId: 'user-123',
        trailerPath: 'trailers/hls/test/master.m3u8',
      });

      const tokenWithAnon = generateTrailerToken({
        trailerId: 'test-trailer-id',
        movieId: 'test-movie-id',
        anonymousId: 'anon-456',
        trailerPath: 'trailers/hls/test/master.m3u8',
      });

      const decodedUser = verifyTrailerToken(tokenWithUser);
      expect(decodedUser.userId).toBe('user-123');
      expect(decodedUser.anonymousId).toBeUndefined();

      const decodedAnon = verifyTrailerToken(tokenWithAnon);
      expect(decodedAnon.anonymousId).toBe('anon-456');
      expect(decodedAnon.userId).toBeUndefined();
    });
  });
});
