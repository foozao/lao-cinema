/**
 * Audit Logs Tests
 * 
 * Tests for audit log routes and helper functions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { build, createTestAdmin, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';
import { createChangesObject, logAudit } from '../lib/audit-service.js';
import type { FastifyInstance } from 'fastify';

// =============================================================================
// ROUTE TESTS
// =============================================================================

describe('Audit Logs Routes', () => {
  let app: FastifyInstance;
  let adminAuth: { headers: { authorization: string }; userId: string };
  let editorAuth: { headers: { authorization: string }; userId: string };

  beforeEach(async () => {
    app = await build({ includeAuditLogs: true, includeAuth: true });
    
    // Clean up
    await db.delete(schema.auditLogs);
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    
    // Create test users
    adminAuth = await createTestAdmin();
    editorAuth = await createTestEditor();
  });

  afterEach(async () => {
    await db.delete(schema.auditLogs);
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
  });

  describe('GET /api/audit-logs', () => {
    it('should return empty array when no logs exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs',
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.logs).toEqual([]);
      expect(body.pagination.total).toBe(0);
    });

    it('should return audit logs with pagination', async () => {
      // Create test audit logs
      await logAudit({
        userId: adminAuth.userId,
        action: 'create',
        entityType: 'movie',
        entityId: 'test-movie-1',
        entityName: 'Test Movie 1',
      });
      await logAudit({
        userId: adminAuth.userId,
        action: 'update',
        entityType: 'movie',
        entityId: 'test-movie-2',
        entityName: 'Test Movie 2',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs',
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.logs).toHaveLength(2);
      expect(body.pagination.total).toBe(2);
      expect(body.pagination.hasMore).toBe(false);
    });

    it('should filter by action', async () => {
      await logAudit({
        userId: adminAuth.userId,
        action: 'create',
        entityType: 'movie',
        entityId: 'test-1',
      });
      await logAudit({
        userId: adminAuth.userId,
        action: 'delete',
        entityType: 'movie',
        entityId: 'test-2',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?action=create',
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.logs).toHaveLength(1);
      expect(body.logs[0].action).toBe('create');
      expect(body.pagination.total).toBe(1);
    });

    it('should filter by entityType', async () => {
      await logAudit({
        userId: adminAuth.userId,
        action: 'create',
        entityType: 'movie',
        entityId: 'test-1',
      });
      await logAudit({
        userId: adminAuth.userId,
        action: 'create',
        entityType: 'person',
        entityId: 'test-2',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?entityType=person',
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.logs).toHaveLength(1);
      expect(body.logs[0].entityType).toBe('person');
    });

    it('should filter by entityId', async () => {
      await logAudit({
        userId: adminAuth.userId,
        action: 'create',
        entityType: 'movie',
        entityId: 'specific-id',
      });
      await logAudit({
        userId: adminAuth.userId,
        action: 'update',
        entityType: 'movie',
        entityId: 'other-id',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?entityId=specific-id',
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.logs).toHaveLength(1);
      expect(body.logs[0].entityId).toBe('specific-id');
    });

    it('should respect limit and offset', async () => {
      // Create 5 audit logs
      for (let i = 0; i < 5; i++) {
        await logAudit({
          userId: adminAuth.userId,
          action: 'create',
          entityType: 'movie',
          entityId: `test-${i}`,
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?limit=2&offset=1',
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.logs).toHaveLength(2);
      expect(body.pagination.total).toBe(5);
      expect(body.pagination.limit).toBe(2);
      expect(body.pagination.offset).toBe(1);
      expect(body.pagination.hasMore).toBe(true);
    });

    it('should reject limit over 500', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?limit=501',
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid date format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?startDate=invalid-date',
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.detail).toContain('Invalid startDate');
    });

    it('should require admin role', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs',
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/audit-logs/:entityType/:entityId', () => {
    it('should return logs for specific entity', async () => {
      await logAudit({
        userId: adminAuth.userId,
        action: 'create',
        entityType: 'movie',
        entityId: 'target-movie',
        entityName: 'Target Movie',
      });
      await logAudit({
        userId: adminAuth.userId,
        action: 'update',
        entityType: 'movie',
        entityId: 'target-movie',
        entityName: 'Target Movie',
        changes: { title_en: { before: 'Old', after: 'New' } },
      });
      await logAudit({
        userId: adminAuth.userId,
        action: 'create',
        entityType: 'movie',
        entityId: 'other-movie',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/audit-logs/movie/target-movie',
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.logs).toHaveLength(2);
      expect(body.logs.every((l: any) => l.entityId === 'target-movie')).toBe(true);
    });
  });

  describe('GET /api/audit-logs/user/:userId', () => {
    it('should return logs for specific user', async () => {
      await logAudit({
        userId: adminAuth.userId,
        action: 'create',
        entityType: 'movie',
        entityId: 'test-1',
      });
      await logAudit({
        userId: editorAuth.userId,
        action: 'update',
        entityType: 'movie',
        entityId: 'test-2',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/audit-logs/user/${adminAuth.userId}`,
        headers: adminAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.logs).toHaveLength(1);
      expect(body.logs[0].userId).toBe(adminAuth.userId);
    });
  });
});

// =============================================================================
// UNIT TESTS FOR createChangesObject
// =============================================================================

describe('createChangesObject', () => {
  it('should detect changed fields', () => {
    const before = { name: 'Old', age: 30 };
    const after = { name: 'New', age: 30 };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({
      name: { before: 'Old', after: 'New' },
    });
  });

  it('should detect added fields', () => {
    const before = { name: 'Test' };
    const after = { name: 'Test', description: 'New description' };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({
      description: { before: undefined, after: 'New description' },
    });
  });

  it('should detect removed fields', () => {
    const before = { name: 'Test', description: 'Old description' };
    const after = { name: 'Test' };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({
      description: { before: 'Old description', after: undefined },
    });
  });

  it('should return empty object when nothing changed', () => {
    const before = { name: 'Test', age: 30 };
    const after = { name: 'Test', age: 30 };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({});
  });

  it('should handle null values', () => {
    const before = { name: 'Test', bio: null };
    const after = { name: 'Test', bio: 'New bio' };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({
      bio: { before: null, after: 'New bio' },
    });
  });

  it('should handle multiple changes', () => {
    const before = { 
      title_en: 'Old Title',
      title_lo: 'ຊື່ເກົ່າ',
      runtime: 90,
      adult: false,
    };
    const after = {
      title_en: 'New Title',
      title_lo: 'ຊື່ໃໝ່',
      runtime: 120,
      adult: false,
    };
    
    const changes = createChangesObject(before, after);
    
    expect(Object.keys(changes).length).toBe(3);
    expect(changes.title_en).toEqual({ before: 'Old Title', after: 'New Title' });
    expect(changes.title_lo).toEqual({ before: 'ຊື່ເກົ່າ', after: 'ຊື່ໃໝ່' });
    expect(changes.runtime).toEqual({ before: 90, after: 120 });
    expect(changes.adult).toBeUndefined(); // No change
  });
});
