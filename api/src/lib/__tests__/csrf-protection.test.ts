/**
 * CSRF Protection Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { csrfProtection, generateCsrfToken, setCsrfTokenCookie } from '../csrf-protection.js';

describe('CSRF Protection', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    app.addHook('preHandler', csrfProtection);
    
    // Test route for GET (safe method)
    app.get('/test', async () => ({ success: true }));
    
    // Test route for POST (requires CSRF)
    app.post('/test', async () => ({ success: true }));
    
    await app.ready();
  });

  describe('generateCsrfToken', () => {
    it('should generate a random token', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe('GET requests', () => {
    it('should allow GET without CSRF token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
    });

    it('should set CSRF token cookie on GET if not present', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      const setCookie = response.headers['set-cookie'];
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('csrf_token=');
      expect(setCookie).toContain('Path=/');
      expect(setCookie).toContain('SameSite=Lax');
      expect(setCookie).not.toContain('HttpOnly'); // Should NOT be HttpOnly
    });

    it('should not set cookie if CSRF token already exists', async () => {
      const token = generateCsrfToken();
      
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          cookie: `csrf_token=${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('POST requests', () => {
    it('should reject POST without CSRF token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/test',
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        error: 'Forbidden',
        code: 'CSRF_TOKEN_MISSING',
      });
    });

    it('should reject POST with cookie but no header', async () => {
      const token = generateCsrfToken();
      
      const response = await app.inject({
        method: 'POST',
        url: '/test',
        headers: {
          cookie: `csrf_token=${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        code: 'CSRF_TOKEN_MISSING',
      });
    });

    it('should reject POST with header but no cookie', async () => {
      const token = generateCsrfToken();
      
      const response = await app.inject({
        method: 'POST',
        url: '/test',
        headers: {
          'x-csrf-token': token,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        code: 'CSRF_TOKEN_MISSING',
      });
    });

    it('should reject POST with mismatched tokens', async () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      
      const response = await app.inject({
        method: 'POST',
        url: '/test',
        headers: {
          cookie: `csrf_token=${token1}`,
          'x-csrf-token': token2,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        code: 'CSRF_TOKEN_INVALID',
      });
    });

    it('should allow POST with matching CSRF tokens', async () => {
      const token = generateCsrfToken();
      
      const response = await app.inject({
        method: 'POST',
        url: '/test',
        headers: {
          cookie: `csrf_token=${token}`,
          'x-csrf-token': token,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
    });
  });

  describe('Exempt routes', () => {
    beforeEach(async () => {
      app = Fastify();
      app.addHook('preHandler', csrfProtection);
      
      app.get('/health', async () => ({ status: 'ok' }));
      app.get('/robots.txt', async () => 'robots');
      app.post('/api/anonymous-id', async () => ({ anonymousId: 'test' }));
      
      await app.ready();
    });

    it('should allow /health without CSRF token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('should allow /robots.txt without CSRF token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/robots.txt',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('should allow POST /api/anonymous-id without CSRF token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/anonymous-id',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ anonymousId: 'test' });
    });
  });

  describe('Other state-changing methods', () => {
    beforeEach(async () => {
      app = Fastify();
      app.addHook('preHandler', csrfProtection);
      
      app.put('/test', async () => ({ success: true }));
      app.patch('/test', async () => ({ success: true }));
      app.delete('/test', async () => ({ success: true }));
      
      await app.ready();
    });

    it('should require CSRF for PUT', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/test',
      });

      expect(response.statusCode).toBe(403);
    });

    it('should require CSRF for PATCH', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/test',
      });

      expect(response.statusCode).toBe(403);
    });

    it('should require CSRF for DELETE', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/test',
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow PUT with valid CSRF token', async () => {
      const token = generateCsrfToken();
      
      const response = await app.inject({
        method: 'PUT',
        url: '/test',
        headers: {
          cookie: `csrf_token=${token}`,
          'x-csrf-token': token,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
