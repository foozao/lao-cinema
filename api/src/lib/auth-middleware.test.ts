// Tests for auth-middleware.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, schema } from '../db/index.js';
import { hashPassword, generateSessionToken } from './auth-utils.js';
import {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireEditor,
  requireEditorOrAdmin,
  requireAuthOrAnonymous,
  getUserContext,
} from './auth-middleware.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Helper to create mock request/reply objects
function createMockRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    headers: {},
    log: {
      warn: vi.fn(),
      error: vi.fn(),
    },
    user: undefined,
    userId: undefined,
    anonymousId: undefined,
    ...overrides,
  } as unknown as FastifyRequest;
}

function createMockReply(): FastifyReply & { sentStatus?: number; sentBody?: any } {
  const reply: any = {
    sentStatus: undefined,
    sentBody: undefined,
    status: vi.fn().mockImplementation(function(this: any, code: number) {
      this.sentStatus = code;
      return this;
    }),
    send: vi.fn().mockImplementation(function(this: any, body: any) {
      this.sentBody = body;
      return this;
    }),
  };
  return reply;
}

describe('Auth Middleware', () => {
  let testUserId: string;
  let testToken: string;
  let adminUserId: string;
  let adminToken: string;
  let editorUserId: string;
  let editorToken: string;

  beforeEach(async () => {
    // Clean up
    await db.delete(schema.userSessions);
    await db.delete(schema.users);

    // Create regular user
    const passwordHash = await hashPassword('password123');
    const [user] = await db.insert(schema.users).values({
      email: 'user@test.com',
      passwordHash,
      displayName: 'Test User',
      role: 'user',
    }).returning();
    testUserId = user.id;

    testToken = generateSessionToken();
    await db.insert(schema.userSessions).values({
      userId: testUserId,
      token: testToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Create admin user
    const [admin] = await db.insert(schema.users).values({
      email: 'admin@test.com',
      passwordHash,
      displayName: 'Admin User',
      role: 'admin',
    }).returning();
    adminUserId = admin.id;

    adminToken = generateSessionToken();
    await db.insert(schema.userSessions).values({
      userId: adminUserId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Create editor user
    const [editor] = await db.insert(schema.users).values({
      email: 'editor@test.com',
      passwordHash,
      displayName: 'Editor User',
      role: 'editor',
    }).returning();
    editorUserId = editor.id;

    editorToken = generateSessionToken();
    await db.insert(schema.userSessions).values({
      userId: editorUserId,
      token: editorToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  });

  describe('optionalAuth', () => {
    it('should set user when valid token provided', async () => {
      const request = createMockRequest({
        headers: { authorization: `Bearer ${testToken}` },
      });
      const reply = createMockReply();

      await optionalAuth(request, reply);

      expect(request.user).toBeDefined();
      expect(request.userId).toBe(testUserId);
    });

    it('should not block when no token provided', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await optionalAuth(request, reply);

      expect(request.user).toBeUndefined();
      expect(request.userId).toBeUndefined();
      expect(reply.sentStatus).toBeUndefined();
    });

    it('should extract anonymous ID from header', async () => {
      const request = createMockRequest({
        headers: { 'x-anonymous-id': 'anon-123' },
      });
      const reply = createMockReply();

      await optionalAuth(request, reply);

      expect(request.anonymousId).toBe('anon-123');
    });

    it('should handle invalid token gracefully', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const reply = createMockReply();

      await optionalAuth(request, reply);

      expect(request.user).toBeUndefined();
      expect(reply.sentStatus).toBeUndefined(); // Should not block
    });
  });

  describe('requireAuth', () => {
    it('should set user when valid token provided', async () => {
      const request = createMockRequest({
        headers: { authorization: `Bearer ${testToken}` },
      });
      const reply = createMockReply();

      await requireAuth(request, reply);

      expect(request.user).toBeDefined();
      expect(request.userId).toBe(testUserId);
      expect(reply.sentStatus).toBeUndefined();
    });

    it('should return 401 when no token provided', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await requireAuth(request, reply);

      expect(reply.sentStatus).toBe(401);
      expect(reply.sentBody.error).toBe('Unauthorized');
    });

    it('should return 401 for invalid token', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const reply = createMockReply();

      await requireAuth(request, reply);

      expect(reply.sentStatus).toBe(401);
      expect(reply.sentBody.message).toContain('Invalid or expired');
    });

    it('should return 401 for malformed authorization header', async () => {
      const request = createMockRequest({
        headers: { authorization: 'NotBearer token' },
      });
      const reply = createMockReply();

      await requireAuth(request, reply);

      expect(reply.sentStatus).toBe(401);
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin user', async () => {
      const request = createMockRequest();
      request.user = { id: adminUserId, role: 'admin' } as any;
      const reply = createMockReply();

      await requireAdmin(request, reply);

      expect(reply.sentStatus).toBeUndefined();
    });

    it('should return 401 when no user', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await requireAdmin(request, reply);

      expect(reply.sentStatus).toBe(401);
    });

    it('should return 403 for non-admin user', async () => {
      const request = createMockRequest();
      request.user = { id: testUserId, role: 'user' } as any;
      const reply = createMockReply();

      await requireAdmin(request, reply);

      expect(reply.sentStatus).toBe(403);
      expect(reply.sentBody.message).toContain('Admin access required');
    });

    it('should return 403 for editor user', async () => {
      const request = createMockRequest();
      request.user = { id: editorUserId, role: 'editor' } as any;
      const reply = createMockReply();

      await requireAdmin(request, reply);

      expect(reply.sentStatus).toBe(403);
    });
  });

  describe('requireEditor', () => {
    it('should allow editor user', async () => {
      const request = createMockRequest();
      request.user = { id: editorUserId, role: 'editor' } as any;
      const reply = createMockReply();

      await requireEditor(request, reply);

      expect(reply.sentStatus).toBeUndefined();
    });

    it('should allow admin user', async () => {
      const request = createMockRequest();
      request.user = { id: adminUserId, role: 'admin' } as any;
      const reply = createMockReply();

      await requireEditor(request, reply);

      expect(reply.sentStatus).toBeUndefined();
    });

    it('should return 401 when no user', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await requireEditor(request, reply);

      expect(reply.sentStatus).toBe(401);
    });

    it('should return 403 for regular user', async () => {
      const request = createMockRequest();
      request.user = { id: testUserId, role: 'user' } as any;
      const reply = createMockReply();

      await requireEditor(request, reply);

      expect(reply.sentStatus).toBe(403);
      expect(reply.sentBody.message).toContain('Editor access required');
    });
  });

  describe('requireEditorOrAdmin', () => {
    it('should allow editor with valid token', async () => {
      const request = createMockRequest({
        headers: { authorization: `Bearer ${editorToken}` },
      });
      const reply = createMockReply();

      await requireEditorOrAdmin(request, reply);

      expect(request.user).toBeDefined();
      expect(reply.sentStatus).toBeUndefined();
    });

    it('should allow admin with valid token', async () => {
      const request = createMockRequest({
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const reply = createMockReply();

      await requireEditorOrAdmin(request, reply);

      expect(request.user).toBeDefined();
      expect(reply.sentStatus).toBeUndefined();
    });

    it('should return 401 when no token', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await requireEditorOrAdmin(request, reply);

      expect(reply.sentStatus).toBe(401);
    });

    it('should return 403 for regular user', async () => {
      const request = createMockRequest({
        headers: { authorization: `Bearer ${testToken}` },
      });
      const reply = createMockReply();

      await requireEditorOrAdmin(request, reply);

      expect(reply.sentStatus).toBe(403);
    });
  });

  describe('requireAuthOrAnonymous', () => {
    it('should allow authenticated user', async () => {
      const request = createMockRequest({
        headers: { authorization: `Bearer ${testToken}` },
      });
      const reply = createMockReply();

      await requireAuthOrAnonymous(request, reply);

      expect(request.userId).toBe(testUserId);
      expect(reply.sentStatus).toBeUndefined();
    });

    it('should allow anonymous user with ID', async () => {
      const request = createMockRequest({
        headers: { 'x-anonymous-id': 'anon-123' },
      });
      const reply = createMockReply();

      await requireAuthOrAnonymous(request, reply);

      expect(request.anonymousId).toBe('anon-123');
      expect(reply.sentStatus).toBeUndefined();
    });

    it('should return 401 when neither auth nor anonymous ID', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await requireAuthOrAnonymous(request, reply);

      expect(reply.sentStatus).toBe(401);
      expect(reply.sentBody.message).toContain('anonymous ID required');
    });
  });

  describe('getUserContext', () => {
    it('should return userId when authenticated', () => {
      const request = createMockRequest();
      request.userId = testUserId;

      const context = getUserContext(request);

      expect(context.userId).toBe(testUserId);
      expect(context.isAuthenticated).toBe(true);
    });

    it('should return anonymousId when not authenticated', () => {
      const request = createMockRequest();
      request.anonymousId = 'anon-123';

      const context = getUserContext(request);

      expect(context.anonymousId).toBe('anon-123');
      expect(context.isAuthenticated).toBe(false);
    });

    it('should return both when both present', () => {
      const request = createMockRequest();
      request.userId = testUserId;
      request.anonymousId = 'anon-123';

      const context = getUserContext(request);

      expect(context.userId).toBe(testUserId);
      expect(context.anonymousId).toBe('anon-123');
      expect(context.isAuthenticated).toBe(true);
    });
  });
});
