/**
 * Tests for Anonymous ID routes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { isValidAnonymousId, extractAnonymousId } from '../lib/anonymous-id.js';
import type { FastifyInstance } from 'fastify';

describe('Anonymous ID Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build();
  });

  describe('POST /api/anonymous-id', () => {
    it('should generate a signed anonymous ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/anonymous-id',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.anonymousId).toBeDefined();
      expect(body.expiresInDays).toBe(90);
    });

    it('should generate valid signed IDs', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/anonymous-id',
      });

      const body = JSON.parse(response.body);
      const signedId = body.anonymousId;

      // Should be valid
      expect(isValidAnonymousId(signedId)).toBe(true);
      
      // Should be extractable
      expect(() => extractAnonymousId(signedId)).not.toThrow();
    });

    it('should generate unique IDs on each request', async () => {
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/anonymous-id',
      });
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/anonymous-id',
      });

      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);

      expect(body1.anonymousId).not.toBe(body2.anonymousId);
    });

    it('should not require authentication', async () => {
      // No auth headers provided
      const response = await app.inject({
        method: 'POST',
        url: '/api/anonymous-id',
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
