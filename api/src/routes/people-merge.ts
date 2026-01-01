/**
 * People Merge Routes
 * 
 * Handles merging duplicate people entries (e.g., duplicate TMDB imports)
 */

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError } from '../lib/response-helpers.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';
import { mergePeople, isMergeError } from '../lib/people-merge-service.js';

export default async function peopleMergeRoutes(fastify: FastifyInstance) {
  // Merge two people (combine duplicate TMDB entries)
  fastify.post<{
    Body: {
      sourceId: number; // Person to merge from (will be deleted)
      targetId: number; // Person to merge into (will be kept)
    };
  }>('/people/merge', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { sourceId, targetId } = request.body;

      if (!sourceId || !targetId) {
        return sendBadRequest(reply, 'Both sourceId and targetId are required');
      }

      const result = await mergePeople(sourceId, targetId);

      if (isMergeError(result)) {
        switch (result.code) {
          case 'SAME_PERSON':
            return sendBadRequest(reply, result.message);
          case 'SOURCE_NOT_FOUND':
          case 'TARGET_NOT_FOUND':
            return sendNotFound(reply, result.message);
          default:
            return sendInternalError(reply, result.message);
        }
      }

      // Log audit event
      await logAuditFromRequest(request, 'merge_people', 'person', String(targetId), `Merged ${sourceId} into ${targetId}`);

      return result;
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to merge people');
    }
  });
}
