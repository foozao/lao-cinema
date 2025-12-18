/**
 * Audit Logs Routes
 * 
 * API endpoints for viewing audit logs.
 * Only accessible to admins.
 */

import { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../lib/auth-middleware.js';
import { getAuditLogs, getEntityAuditHistory, getUserAuditHistory } from '../lib/audit-service.js';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';

export default async function auditLogRoutes(fastify: FastifyInstance) {
  // Get all audit logs (admin only)
  fastify.get<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>('/audit-logs', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request) => {
    const limit = request.query.limit ? parseInt(request.query.limit) : 100;
    const offset = request.query.offset ? parseInt(request.query.offset) : 0;

    const logs = await getAuditLogs({ limit, offset });

    return {
      logs,
      pagination: {
        limit,
        offset,
        total: logs.length, // TODO: Get actual total count
      },
    };
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
