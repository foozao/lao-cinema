/**
 * Audit Logging Service
 * 
 * Tracks all content changes made by editors and admins.
 * Provides functions to log actions and query audit history.
 */

import { db, schema } from '../db/index.js';
import { eq, and, desc, gte, lte, sql, SQL } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';

// =============================================================================
// TYPES
// =============================================================================

export type AuditAction = 
  | 'create' | 'update' | 'delete'
  | 'add_cast' | 'remove_cast' | 'update_cast'
  | 'add_crew' | 'remove_crew' | 'update_crew'
  | 'add_image' | 'remove_image' | 'set_primary_image'
  | 'add_video' | 'remove_video' | 'update_video'
  | 'add_subtitle' | 'remove_subtitle' | 'update_subtitle'
  | 'add_genre' | 'remove_genre'
  | 'add_production_company' | 'remove_production_company'
  | 'add_platform' | 'remove_platform' | 'update_platform'
  | 'feature_movie' | 'unfeature_movie'
  | 'merge_people' | 'update_person';

export type AuditEntityType = 
  | 'movie' | 'person' | 'genre' | 'production_company' | 'user' | 'settings';

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  changes?: Record<string, { before: any; after: any }>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// =============================================================================
// AUDIT LOGGING FUNCTIONS
// =============================================================================

/**
 * Log an audit entry
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityName: entry.entityName,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });
  } catch (error) {
    console.error('[Audit] Failed to log audit entry:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Helper to extract IP and User-Agent from request
 */
export function getRequestMetadata(request: FastifyRequest): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: request.ip || request.headers['x-forwarded-for'] as string || undefined,
    userAgent: request.headers['user-agent'] || undefined,
  };
}

/**
 * Log audit entry from a Fastify request
 */
export async function logAuditFromRequest(
  request: FastifyRequest,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  entityName?: string,
  changes?: Record<string, { before: any; after: any }>
): Promise<void> {
  if (!request.user) {
    console.warn('[Audit] Cannot log audit entry without authenticated user');
    return;
  }

  const metadata = getRequestMetadata(request);
  
  await logAudit({
    userId: request.user.id,
    action,
    entityType,
    entityId,
    entityName,
    changes,
    ...metadata,
  });
}

/**
 * Build WHERE conditions from filter
 */
function buildFilterConditions(filter: AuditLogFilter): SQL[] {
  const conditions: SQL[] = [];
  
  if (filter.userId) {
    conditions.push(eq(schema.auditLogs.userId, filter.userId));
  }
  if (filter.action) {
    conditions.push(eq(schema.auditLogs.action, filter.action));
  }
  if (filter.entityType) {
    conditions.push(eq(schema.auditLogs.entityType, filter.entityType));
  }
  if (filter.entityId) {
    conditions.push(eq(schema.auditLogs.entityId, filter.entityId));
  }
  if (filter.startDate) {
    conditions.push(gte(schema.auditLogs.createdAt, filter.startDate));
  }
  if (filter.endDate) {
    conditions.push(lte(schema.auditLogs.createdAt, filter.endDate));
  }
  
  return conditions;
}

/**
 * Get total count of audit logs matching filter
 */
export async function getAuditLogsCount(filter: AuditLogFilter = {}): Promise<number> {
  const conditions = buildFilterConditions(filter);
  
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  return result?.count ?? 0;
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(filter: AuditLogFilter = {}) {
  const { limit = 100, offset = 0 } = filter;
  const conditions = buildFilterConditions(filter);
  
  const logs = await db
    .select({
      id: schema.auditLogs.id,
      userId: schema.auditLogs.userId,
      userEmail: schema.users.email,
      userDisplayName: schema.users.displayName,
      userRole: schema.users.role,
      action: schema.auditLogs.action,
      entityType: schema.auditLogs.entityType,
      entityId: schema.auditLogs.entityId,
      entityName: schema.auditLogs.entityName,
      changes: schema.auditLogs.changes,
      ipAddress: schema.auditLogs.ipAddress,
      userAgent: schema.auditLogs.userAgent,
      createdAt: schema.auditLogs.createdAt,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return logs.map(log => ({
    ...log,
    changes: log.changes ? JSON.parse(log.changes) : null,
  }));
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditHistory(
  entityType: AuditEntityType,
  entityId: string,
  limit: number = 50
) {
  const logs = await db
    .select({
      id: schema.auditLogs.id,
      userId: schema.auditLogs.userId,
      userEmail: schema.users.email,
      userDisplayName: schema.users.displayName,
      action: schema.auditLogs.action,
      entityType: schema.auditLogs.entityType,
      entityId: schema.auditLogs.entityId,
      entityName: schema.auditLogs.entityName,
      changes: schema.auditLogs.changes,
      createdAt: schema.auditLogs.createdAt,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
    .where(and(
      eq(schema.auditLogs.entityType, entityType),
      eq(schema.auditLogs.entityId, entityId)
    ))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit);

  return logs.map(log => ({
    ...log,
    changes: log.changes ? JSON.parse(log.changes) : null,
  }));
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditHistory(userId: string, limit: number = 100) {
  const logs = await db
    .select()
    .from(schema.auditLogs)
    .where(eq(schema.auditLogs.userId, userId))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit);

  return logs.map(log => ({
    ...log,
    changes: log.changes ? JSON.parse(log.changes) : null,
  }));
}

/**
 * Helper to create a changes object for updates
 */
export function createChangesObject(
  before: Record<string, any>,
  after: Record<string, any>
): Record<string, { before: any; after: any }> {
  const changes: Record<string, { before: any; after: any }> = {};
  
  // Find all changed fields
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    if (before[key] !== after[key]) {
      changes[key] = {
        before: before[key],
        after: after[key],
      };
    }
  }
  
  return changes;
}
