/**
 * Pricing Resolver
 * 
 * Resolves the final price for a movie rental, applying pricing tiers and promo codes.
 */

import { db } from '../../db/index.js';
import { movies, pricingTiers, promoCodes } from '../../db/schema.js';
import { eq, and, gt, or, isNull, sql } from 'drizzle-orm';
import type { ResolvedPrice, PromoCodeValidation, DiscountType } from '../payment/types.js';

/**
 * Resolve the price for a movie, optionally applying a promo code
 */
export async function resolvePrice(
  movieId: string,
  promoCode?: string
): Promise<ResolvedPrice> {
  // Get movie with pricing tier
  const [movie] = await db
    .select({
      id: movies.id,
      pricingTierId: movies.pricingTierId,
    })
    .from(movies)
    .where(eq(movies.id, movieId))
    .limit(1);

  if (!movie) {
    return {
      available: false,
      unavailableReason: 'no_pricing',
    };
  }

  // If no pricing tier assigned, movie is not available for rent
  if (!movie.pricingTierId) {
    return {
      available: false,
      unavailableReason: 'no_pricing',
    };
  }

  // Get pricing tier
  const [tier] = await db
    .select()
    .from(pricingTiers)
    .where(eq(pricingTiers.id, movie.pricingTierId))
    .limit(1);

  if (!tier || !tier.isActive) {
    return {
      available: false,
      unavailableReason: 'inactive_tier',
    };
  }

  const originalAmountLak = tier.priceLak;
  let finalAmountLak = originalAmountLak;
  let promoApplied: ResolvedPrice['promoApplied'] = undefined;

  // Apply promo code if provided
  if (promoCode) {
    const validation = await validatePromoCode(promoCode, movieId, originalAmountLak);
    
    if (validation.valid && validation.discountAmountLak !== undefined) {
      finalAmountLak = validation.finalAmountLak ?? originalAmountLak;
      promoApplied = {
        id: '', // Will be set when we have the promo code ID
        code: promoCode,
        discountType: validation.discountType!,
        discountValue: validation.discountValue ?? null,
        discountAmountLak: validation.discountAmountLak,
      };
    }
  }

  return {
    available: true,
    tier: {
      id: tier.id,
      name: tier.name,
      displayNameEn: tier.displayNameEn,
      displayNameLo: tier.displayNameLo,
      priceLak: tier.priceLak,
      isActive: tier.isActive,
      sortOrder: tier.sortOrder,
    },
    originalAmountLak,
    finalAmountLak,
    promoApplied,
  };
}

/**
 * Validate a promo code for a specific movie and amount
 */
export async function validatePromoCode(
  code: string,
  movieId: string,
  originalAmountLak: number
): Promise<PromoCodeValidation> {
  const now = new Date();

  // Find the promo code
  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.code, code.toUpperCase()),
        eq(promoCodes.isActive, true),
        // Must not exceed max uses (if set)
        or(
          isNull(promoCodes.maxUses),
          gt(promoCodes.maxUses, promoCodes.usesCount)
        )
      )
    )
    .limit(1);

  if (!promo) {
    return {
      valid: false,
      code,
      error: 'Invalid or expired promo code',
    };
  }

  // Check validity period
  if (promo.validFrom && now < promo.validFrom) {
    return {
      valid: false,
      code,
      error: 'Promo code is not yet valid',
    };
  }

  if (promo.validTo && now > promo.validTo) {
    return {
      valid: false,
      code,
      error: 'Promo code has expired',
    };
  }

  // Check movie restriction
  if (promo.movieId && promo.movieId !== movieId) {
    return {
      valid: false,
      code,
      error: 'Promo code is not valid for this movie',
    };
  }

  // Calculate discount
  let discountAmountLak: number;
  let finalAmountLak: number;

  switch (promo.discountType) {
    case 'free':
      discountAmountLak = originalAmountLak;
      finalAmountLak = 0;
      break;
    
    case 'percentage':
      if (!promo.discountValue) {
        return {
          valid: false,
          code,
          error: 'Invalid promo code configuration',
        };
      }
      discountAmountLak = Math.round(originalAmountLak * (promo.discountValue / 100));
      finalAmountLak = originalAmountLak - discountAmountLak;
      break;
    
    case 'fixed':
      if (!promo.discountValue) {
        return {
          valid: false,
          code,
          error: 'Invalid promo code configuration',
        };
      }
      discountAmountLak = Math.min(promo.discountValue, originalAmountLak);
      finalAmountLak = originalAmountLak - discountAmountLak;
      break;
    
    default:
      return {
        valid: false,
        code,
        error: 'Unknown discount type',
      };
  }

  return {
    valid: true,
    code: promo.code,
    discountType: promo.discountType as DiscountType,
    discountValue: promo.discountValue,
    discountAmountLak,
    finalAmountLak,
  };
}

/**
 * Get promo code by code string
 */
export async function getPromoCode(code: string) {
  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, code.toUpperCase()))
    .limit(1);

  return promo;
}

/**
 * Increment promo code usage count
 */
export async function incrementPromoCodeUsage(promoCodeId: string): Promise<void> {
  await db
    .update(promoCodes)
    .set({
      usesCount: sql`${promoCodes.usesCount} + 1`,
    })
    .where(eq(promoCodes.id, promoCodeId));
}
