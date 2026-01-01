/**
 * Rental Pack Routes
 * 
 * Pack-related rental operations: access check, get/create pack rentals, position updates
 */

import { FastifyInstance } from 'fastify';
import { sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { eq, and, gt, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { rentals, shortPacks, shortPackTranslations } from '../db/schema.js';
import { requireAuthOrAnonymous, getUserContext } from '../lib/auth-middleware.js';
import { buildDualModeWhereClause } from '../lib/auth-helpers.js';
import { RENTAL_DURATION_MS } from '../config.js';
import { buildLocalizedText } from '../lib/translation-helpers.js';
import { checkMovieAccess } from '../lib/rental-access.js';
import { z } from 'zod';
import { validateBody, validateParams, createRentalSchema, packIdParamSchema, updatePackPositionSchema, uuidSchema } from '../lib/validation.js';

const rentalIdParamSchema = z.object({ rentalId: uuidSchema });

export default async function rentalPackRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // CHECK ACCESS (Movie or Pack)
  // =============================================================================
  
  /**
   * GET /api/rentals/access/:movieId
   * Check if user has access to a movie (via direct rental or pack rental)
   */
  fastify.get('/rentals/access/:movieId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      const result = await checkMovieAccess(movieId, { userId, anonymousId });
      
      if (result.hasAccess && result.rental) {
        return reply.send({
          hasAccess: true,
          accessType: result.accessType,
          rental: {
            id: result.rental.id,
            shortPackId: result.rental.shortPackId || undefined,
            expiresAt: result.rental.expiresAt,
          },
        });
      }
      
      return reply.send({
        hasAccess: false,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to check access');
      return sendInternalError(reply, 'Failed to check access');
    }
  });
  
  // =============================================================================
  // GET PACK RENTAL STATUS
  // =============================================================================
  
  /**
   * GET /api/rentals/packs/:packId
   * Check if user has active rental for a specific pack
   */
  fastify.get('/rentals/packs/:packId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { packId } = request.params as { packId: string };
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      const userClause = buildDualModeWhereClause(request, rentals);
      
      const [rental] = await db.select({
        id: rentals.id,
        userId: rentals.userId,
        anonymousId: rentals.anonymousId,
        movieId: rentals.movieId,
        shortPackId: rentals.shortPackId,
        currentShortId: rentals.currentShortId,
        purchasedAt: rentals.purchasedAt,
        expiresAt: rentals.expiresAt,
        transactionId: rentals.transactionId,
        amount: rentals.amount,
        currency: rentals.currency,
        paymentMethod: rentals.paymentMethod,
      })
        .from(rentals)
        .where(
          and(
            eq(rentals.shortPackId, packId),
            userClause
          )
        )
        .orderBy(desc(rentals.purchasedAt))
        .limit(1);
      
      if (!rental) {
        return reply.send({ rental: null });
      }
      
      // Check if rental is expired
      const now = new Date();
      const isExpired = new Date(rental.expiresAt) <= now;
      
      if (isExpired) {
        return reply.send({ 
          rental: null,
          expired: true,
          expiredAt: rental.expiresAt,
        });
      }
      
      return reply.send({
        rental: {
          id: rental.id,
          shortPackId: rental.shortPackId,
          currentShortId: rental.currentShortId ?? null,
          purchasedAt: rental.purchasedAt,
          expiresAt: rental.expiresAt,
          transactionId: rental.transactionId,
          amount: rental.amount,
          currency: rental.currency,
          paymentMethod: rental.paymentMethod,
        },
      });
    } catch (error) {
      request.log.error({ err: error }, 'Failed to fetch pack rental');
      return sendInternalError(reply, 'Failed to fetch pack rental');
    }
  });
  
  // =============================================================================
  // CREATE PACK RENTAL
  // =============================================================================
  
  /**
   * POST /api/rentals/packs/:packId
   * Create a new rental for a short pack (grants access to all shorts in the pack)
   */
  fastify.post('/rentals/packs/:packId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const params = validateParams(packIdParamSchema, request.params, reply);
    if (!params) return;
    
    const body = validateBody(createRentalSchema, request.body, reply);
    if (!body) return;
    
    const { packId } = params;
    const { transactionId, paymentMethod } = body;
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      // Check if pack exists
      const [pack] = await db.select()
        .from(shortPacks)
        .where(eq(shortPacks.id, packId))
        .limit(1);
      
      if (!pack) {
        return sendNotFound(reply, 'Short pack not found');
      }
      
      // Check if user already has an active rental for this pack
      const userClause = buildDualModeWhereClause(request, rentals);
      
      const [existingRental] = await db.select()
        .from(rentals)
        .where(
          and(
            eq(rentals.shortPackId, packId),
            userClause,
            gt(rentals.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (existingRental) {
        return reply.status(409).type('application/problem+json').send({
          type: 'about:blank',
          title: 'Conflict',
          status: 409,
          detail: 'You already have an active rental for this pack',
          rental: existingRental,
        });
      }
      
      // Create rental
      const now = new Date();
      const expiresAt = new Date(now.getTime() + RENTAL_DURATION_MS);
      
      const [rental] = await db.insert(rentals).values({
        userId: userId || null,
        anonymousId: anonymousId || null,
        shortPackId: packId,
        movieId: null,
        purchasedAt: now,
        expiresAt,
        transactionId,
        amount: 499, // Default price in cents ($4.99) - pricing TBD
        currency: 'USD',
        paymentMethod,
      }).returning();
      
      // Get pack title for response
      const translations = await db.select()
        .from(shortPackTranslations)
        .where(eq(shortPackTranslations.packId, packId));
      
      const title = buildLocalizedText(translations, 'title');
      
      return sendCreated(reply, {
        rental: {
          id: rental.id,
          shortPackId: rental.shortPackId,
          purchasedAt: rental.purchasedAt,
          expiresAt: rental.expiresAt,
          transactionId: rental.transactionId,
          amount: rental.amount,
          currency: rental.currency,
          paymentMethod: rental.paymentMethod,
        },
        pack: {
          id: pack.id,
          slug: pack.slug,
          title,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to create pack rental');
      return sendInternalError(reply, 'Failed to create pack rental');
    }
  });
  
  // =============================================================================
  // UPDATE PACK POSITION
  // =============================================================================
  
  /**
   * PATCH /api/rentals/:rentalId/position
   * Update the current short position for a pack rental
   */
  fastify.patch('/rentals/:rentalId/position', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const params = validateParams(rentalIdParamSchema, request.params, reply);
    if (!params) return;
    
    const body = validateBody(updatePackPositionSchema, request.body, reply);
    if (!body) return;
    
    const { rentalId } = params;
    const { currentShortId } = body;
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      // Verify rental belongs to user
      const userClause = buildDualModeWhereClause(request, rentals);
      
      const [rental] = await db.select()
        .from(rentals)
        .where(
          and(
            eq(rentals.id, rentalId),
            userClause,
            gt(rentals.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!rental) {
        return sendNotFound(reply, 'Rental not found or expired');
      }
      
      // Update the current short position
      await db.update(rentals)
        .set({ currentShortId })
        .where(eq(rentals.id, rentalId));
      
      return reply.send({ success: true });
    } catch (error) {
      request.log.error({ error }, 'Failed to update pack position');
      return sendInternalError(reply, 'Failed to update pack position');
    }
  });
}
