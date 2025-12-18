/**
 * Auth Helper Functions
 * 
 * Utility functions for common authentication patterns.
 */

import { FastifyRequest } from 'fastify';
import { eq, SQL } from 'drizzle-orm';
import { getUserContext } from './auth-middleware.js';

/**
 * Build a WHERE clause for dual-mode (userId OR anonymousId) queries
 * 
 * This helper standardizes the pattern of querying tables that support
 * both authenticated users and anonymous users.
 * 
 * @param request - Fastify request object
 * @param table - Table columns object with userId and anonymousId fields
 * @returns SQL WHERE clause for the appropriate user context
 * 
 * @example
 * const whereClause = buildDualModeWhereClause(request, rentals);
 * const userRentals = await db.select().from(rentals).where(whereClause);
 */
export function buildDualModeWhereClause(
  request: FastifyRequest,
  table: { userId: any; anonymousId: any }
): SQL {
  const { userId, anonymousId } = getUserContext(request);
  
  return userId 
    ? eq(table.userId, userId)
    : eq(table.anonymousId, anonymousId!);
}
