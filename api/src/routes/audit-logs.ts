/**
 * Audit Logs Routes
 * 
 * API endpoints for viewing audit logs.
 * Only accessible to admins.
 */

import { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../lib/auth-middleware.js';
import { getAuditLogs, getAuditLogsCount, getEntityAuditHistory, getUserAuditHistory, AuditAction, AuditEntityType } from '../lib/audit-service.js';
import { sendBadRequest, sendInternalError } from '../lib/response-helpers.js';

export default async function auditLogRoutes(fastify: FastifyInstance) {
  // Get all audit logs (admin only)
  fastify.get<{
    Querystring: {
      limit?: string;
      offset?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    };
  }>('/audit-logs', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 100;
      const offset = request.query.offset ? parseInt(request.query.offset) : 0;
      
      // Validate limit
      if (limit > 500) {
        return sendBadRequest(reply, 'Limit cannot exceed 500');
      }

      // Build filter from query params
      const filter: {
        limit: number;
        offset: number;
        action?: AuditAction;
        entityType?: AuditEntityType;
        entityId?: string;
        userId?: string;
        startDate?: Date;
        endDate?: Date;
      } = { limit, offset };
      
      if (request.query.action) {
        filter.action = request.query.action as AuditAction;
      }
      if (request.query.entityType) {
        filter.entityType = request.query.entityType as AuditEntityType;
      }
      if (request.query.entityId) {
        filter.entityId = request.query.entityId;
      }
      if (request.query.userId) {
        filter.userId = request.query.userId;
      }
      if (request.query.startDate) {
        const startDate = new Date(request.query.startDate);
        if (isNaN(startDate.getTime())) {
          return sendBadRequest(reply, 'Invalid startDate format');
        }
        filter.startDate = startDate;
      }
      if (request.query.endDate) {
        const endDate = new Date(request.query.endDate);
        if (isNaN(endDate.getTime())) {
          return sendBadRequest(reply, 'Invalid endDate format');
        }
        filter.endDate = endDate;
      }

      // Get logs and total count in parallel
      const [logs, total] = await Promise.all([
        getAuditLogs(filter),
        getAuditLogsCount(filter),
      ]);

      return {
        logs,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + logs.length < total,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch audit logs');
    }
  });

  // Get audit logs for a specific entity
  fastify.get<{
    Params: {
      entityType: string;
      entityId: string;
    };
    Querystring: {
      limit?: string;
    };
  }>('/audit-logs/:entityType/:entityId', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request) => {
    const { entityType, entityId } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit) : 50;

    const logs = await getEntityAuditHistory(
      entityType as any,
      entityId,
      limit
    );

    return { logs };
  });

  // Get audit logs for a specific user
  fastify.get<{
    Params: {
      userId: string;
    };
    Querystring: {
      limit?: string;
    };
  }>('/audit-logs/user/:userId', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request) => {
    const { userId } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit) : 100;

    const logs = await getUserAuditHistory(userId, limit);

    return { logs };
  });
}
