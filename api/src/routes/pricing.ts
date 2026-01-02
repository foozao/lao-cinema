/**
 * Pricing Routes
 * 
 * Admin endpoints for managing pricing tiers and promo codes.
 * Public pricing resolution endpoints (for when pricing goes live).
 */

import { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../lib/auth-middleware.js';
import { sendNotFound, sendBadRequest, sendConflict } from '../lib/response-helpers.js';
import { db } from '../db/index.js';
import { pricingTiers, promoCodes, movies } from '../db/schema.js';
import { eq, asc, desc } from 'drizzle-orm';
import { resolvePrice, validatePromoCode } from '../lib/pricing/resolver.js';

// =============================================================================
// TYPES
// =============================================================================

interface CreatePricingTierBody {
  name: string;
  displayNameEn: string;
  displayNameLo?: string;
  priceLak: number;
  sortOrder?: number;
}

interface UpdatePricingTierBody {
  name?: string;
  displayNameEn?: string;
  displayNameLo?: string;
  priceLak?: number;
  isActive?: boolean;
  sortOrder?: number;
}

interface CreatePromoCodeBody {
  code: string;
  discountType: 'percentage' | 'fixed' | 'free';
  discountValue?: number;
  maxUses?: number;
  validFrom?: string;
  validTo?: string;
  movieId?: string;
}

interface UpdatePromoCodeBody {
  discountType?: 'percentage' | 'fixed' | 'free';
  discountValue?: number;
  maxUses?: number;
  validFrom?: string;
  validTo?: string;
  movieId?: string;
  isActive?: boolean;
}

// =============================================================================
// ROUTES
// =============================================================================

export default async function pricingRoutes(fastify: FastifyInstance) {
  
  // ===========================================================================
  // PRICING TIERS (Admin)
  // ===========================================================================

  /**
   * GET /api/admin/pricing/tiers
   * List all pricing tiers
   */
  fastify.get('/admin/pricing/tiers', {
    preHandler: [requireAuth, requireAdmin],
  }, async () => {
    const tiers = await db
      .select()
      .from(pricingTiers)
      .orderBy(asc(pricingTiers.sortOrder), asc(pricingTiers.priceLak));

    return { tiers };
  });

  /**
   * POST /api/admin/pricing/tiers
   * Create a new pricing tier
   */
  fastify.post<{ Body: CreatePricingTierBody }>('/admin/pricing/tiers', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    const { name, displayNameEn, displayNameLo, priceLak, sortOrder } = request.body;

    // Validate required fields
    if (!name || !displayNameEn || priceLak === undefined) {
      return sendBadRequest(reply, 'name, displayNameEn, and priceLak are required');
    }

    // Check for duplicate name
    const [existing] = await db
      .select()
      .from(pricingTiers)
      .where(eq(pricingTiers.name, name))
      .limit(1);

    if (existing) {
      return sendConflict(reply, 'A pricing tier with this name already exists');
    }

    // Create the tier
    const [tier] = await db
      .insert(pricingTiers)
      .values({
        name,
        displayNameEn,
        displayNameLo: displayNameLo || null,
        priceLak,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    return reply.status(201).send({ tier });
  });

  /**
   * PATCH /api/admin/pricing/tiers/:id
   * Update a pricing tier
   */
  fastify.patch<{ Params: { id: string }; Body: UpdatePricingTierBody }>('/admin/pricing/tiers/:id', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;

    // Check tier exists
    const [existing] = await db
      .select()
      .from(pricingTiers)
      .where(eq(pricingTiers.id, id))
      .limit(1);

    if (!existing) {
      return sendNotFound(reply, 'Pricing tier not found');
    }

    // Check for name conflict if updating name
    if (updates.name && updates.name !== existing.name) {
      const [conflict] = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.name, updates.name))
        .limit(1);

      if (conflict) {
        return sendConflict(reply, 'A pricing tier with this name already exists');
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.displayNameEn !== undefined) updateData.displayNameEn = updates.displayNameEn;
    if (updates.displayNameLo !== undefined) updateData.displayNameLo = updates.displayNameLo;
    if (updates.priceLak !== undefined) updateData.priceLak = updates.priceLak;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

    const [tier] = await db
      .update(pricingTiers)
      .set(updateData)
      .where(eq(pricingTiers.id, id))
      .returning();

    return { tier };
  });

  /**
   * DELETE /api/admin/pricing/tiers/:id
   * Delete a pricing tier (only if not in use)
   */
  fastify.delete<{ Params: { id: string } }>('/admin/pricing/tiers/:id', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;

    // Check tier exists
    const [existing] = await db
      .select()
      .from(pricingTiers)
      .where(eq(pricingTiers.id, id))
      .limit(1);

    if (!existing) {
      return sendNotFound(reply, 'Pricing tier not found');
    }

    // Check if any movies use this tier
    const [movieUsingTier] = await db
      .select({ id: movies.id })
      .from(movies)
      .where(eq(movies.pricingTierId, id))
      .limit(1);

    if (movieUsingTier) {
      return sendBadRequest(reply, 'Cannot delete tier that is assigned to movies. Reassign or remove pricing from movies first.');
    }

    await db
      .delete(pricingTiers)
      .where(eq(pricingTiers.id, id));

    return reply.status(204).send();
  });

  // ===========================================================================
  // PROMO CODES (Admin)
  // ===========================================================================

  /**
   * GET /api/admin/promo-codes
   * List all promo codes
   */
  fastify.get('/admin/promo-codes', {
    preHandler: [requireAuth, requireAdmin],
  }, async () => {
    const codes = await db
      .select()
      .from(promoCodes)
      .orderBy(desc(promoCodes.createdAt));

    return { promoCodes: codes };
  });

  /**
   * POST /api/admin/promo-codes
   * Create a new promo code
   */
  fastify.post<{ Body: CreatePromoCodeBody }>('/admin/promo-codes', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    const { code, discountType, discountValue, maxUses, validFrom, validTo, movieId } = request.body;

    // Validate required fields
    if (!code || !discountType) {
      return sendBadRequest(reply, 'code and discountType are required');
    }

    // Validate discount value for non-free types
    if (discountType !== 'free' && !discountValue) {
      return sendBadRequest(reply, 'discountValue is required for percentage and fixed discount types');
    }

    // Check for duplicate code
    const normalizedCode = code.toUpperCase();
    const [existing] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, normalizedCode))
      .limit(1);

    if (existing) {
      return sendConflict(reply, 'A promo code with this code already exists');
    }

    // Validate movie exists if specified
    if (movieId) {
      const [movie] = await db
        .select({ id: movies.id })
        .from(movies)
        .where(eq(movies.id, movieId))
        .limit(1);

      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }
    }

    // Create the promo code
    const [promoCode] = await db
      .insert(promoCodes)
      .values({
        code: normalizedCode,
        discountType,
        discountValue: discountValue ?? null,
        maxUses: maxUses ?? null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
        movieId: movieId ?? null,
      })
      .returning();

    return reply.status(201).send({ promoCode });
  });

  /**
   * PATCH /api/admin/promo-codes/:id
   * Update a promo code
   */
  fastify.patch<{ Params: { id: string }; Body: UpdatePromoCodeBody }>('/admin/promo-codes/:id', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;

    // Check promo code exists
    const [existing] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);

    if (!existing) {
      return sendNotFound(reply, 'Promo code not found');
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (updates.discountType !== undefined) updateData.discountType = updates.discountType;
    if (updates.discountValue !== undefined) updateData.discountValue = updates.discountValue;
    if (updates.maxUses !== undefined) updateData.maxUses = updates.maxUses;
    if (updates.validFrom !== undefined) updateData.validFrom = updates.validFrom ? new Date(updates.validFrom) : null;
    if (updates.validTo !== undefined) updateData.validTo = updates.validTo ? new Date(updates.validTo) : null;
    if (updates.movieId !== undefined) updateData.movieId = updates.movieId || null;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const [promoCode] = await db
      .update(promoCodes)
      .set(updateData)
      .where(eq(promoCodes.id, id))
      .returning();

    return { promoCode };
  });

  /**
   * DELETE /api/admin/promo-codes/:id
   * Delete a promo code
   */
  fastify.delete<{ Params: { id: string } }>('/admin/promo-codes/:id', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params;

    // Check promo code exists
    const [existing] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);

    if (!existing) {
      return sendNotFound(reply, 'Promo code not found');
    }

    await db
      .delete(promoCodes)
      .where(eq(promoCodes.id, id));

    return reply.status(204).send();
  });

  // ===========================================================================
  // PUBLIC ENDPOINTS (for when pricing goes live)
  // ===========================================================================

  /**
   * GET /api/movies/:movieId/pricing
   * Get the resolved price for a movie
   * 
   * Currently returns { available: false } for all movies since
   * no pricing tiers are assigned yet (demo mode).
   */
  fastify.get<{ Params: { movieId: string } }>('/movies/:movieId/pricing', async (request, reply) => {
    const { movieId } = request.params;

    // Check movie exists
    const [movie] = await db
      .select({ id: movies.id })
      .from(movies)
      .where(eq(movies.id, movieId))
      .limit(1);

    if (!movie) {
      return sendNotFound(reply, 'Movie not found');
    }

    const pricing = await resolvePrice(movieId);
    return { pricing };
  });

  /**
   * POST /api/promo-codes/validate
   * Validate a promo code for a specific movie
   */
  fastify.post<{ Body: { code: string; movieId: string } }>('/promo-codes/validate', async (request, reply) => {
    const { code, movieId } = request.body;

    if (!code || !movieId) {
      return sendBadRequest(reply, 'code and movieId are required');
    }

    // Get the movie's current price to calculate discount
    const pricing = await resolvePrice(movieId);
    
    if (!pricing.available || !pricing.originalAmountLak) {
      return sendBadRequest(reply, 'Movie is not available for rent');
    }

    const validation = await validatePromoCode(code, movieId, pricing.originalAmountLak);
    return { validation };
  });
}
