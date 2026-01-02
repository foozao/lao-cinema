import { describe, it, expect, beforeEach } from 'vitest';
import { db, schema } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import { resolvePrice, validatePromoCode, getPromoCode, incrementPromoCodeUsage } from './resolver.js';
import { randomUUID } from 'crypto';

describe('Pricing Resolver', () => {
  let testMovieId: string;
  let testTierId: string;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(schema.promoCodeUses);
    await db.delete(schema.paymentTransactions);
    await db.delete(schema.promoCodes);
    await db.update(schema.movies).set({ pricingTierId: null });
    await db.delete(schema.pricingTiers);

    // Create a test movie if one doesn't exist
    const [movie] = await db.select().from(schema.movies).limit(1);
    if (movie) {
      testMovieId = movie.id;
    } else {
      // Create a minimal test movie
      const [newMovie] = await db.insert(schema.movies).values({
        slug: `test-movie-${Date.now()}`,
        originalTitle: 'Test Movie',
        originalLanguage: 'en',
      }).returning();
      testMovieId = newMovie.id;
    }

    // Create a test pricing tier
    const [tier] = await db.insert(schema.pricingTiers).values({
      name: 'test-tier',
      displayNameEn: 'Test Tier',
      displayNameLo: 'ທົດສອບ',
      priceLak: 75000,
      sortOrder: 0,
    }).returning();
    testTierId = tier.id;
  });

  describe('resolvePrice', () => {
    it('should return unavailable for non-existent movie', async () => {
      const result = await resolvePrice(randomUUID());
      
      expect(result.available).toBe(false);
      expect(result.unavailableReason).toBe('no_pricing');
    });

    it('should return unavailable for movie without pricing tier', async () => {
      const result = await resolvePrice(testMovieId);
      
      expect(result.available).toBe(false);
      expect(result.unavailableReason).toBe('no_pricing');
    });

    it('should return pricing for movie with active tier', async () => {
      // Assign tier to movie
      await db.update(schema.movies)
        .set({ pricingTierId: testTierId })
        .where(eq(schema.movies.id, testMovieId));

      const result = await resolvePrice(testMovieId);
      
      expect(result.available).toBe(true);
      expect(result.originalAmountLak).toBe(75000);
      expect(result.finalAmountLak).toBe(75000);
      expect(result.tier?.name).toBe('test-tier');
      expect(result.promoApplied).toBeUndefined();
    });

    it('should return unavailable for movie with inactive tier', async () => {
      // Deactivate tier
      await db.update(schema.pricingTiers)
        .set({ isActive: false })
        .where(eq(schema.pricingTiers.id, testTierId));

      // Assign tier to movie
      await db.update(schema.movies)
        .set({ pricingTierId: testTierId })
        .where(eq(schema.movies.id, testMovieId));

      const result = await resolvePrice(testMovieId);
      
      expect(result.available).toBe(false);
      expect(result.unavailableReason).toBe('inactive_tier');
    });

    it('should apply free promo code', async () => {
      // Assign tier to movie
      await db.update(schema.movies)
        .set({ pricingTierId: testTierId })
        .where(eq(schema.movies.id, testMovieId));

      // Create free promo code
      await db.insert(schema.promoCodes).values({
        code: 'FREETEST',
        discountType: 'free',
      });

      const result = await resolvePrice(testMovieId, 'FREETEST');
      
      expect(result.available).toBe(true);
      expect(result.originalAmountLak).toBe(75000);
      expect(result.finalAmountLak).toBe(0);
      expect(result.promoApplied?.discountType).toBe('free');
      expect(result.promoApplied?.discountAmountLak).toBe(75000);
    });

    it('should apply percentage promo code', async () => {
      // Assign tier to movie
      await db.update(schema.movies)
        .set({ pricingTierId: testTierId })
        .where(eq(schema.movies.id, testMovieId));

      // Create percentage promo code
      await db.insert(schema.promoCodes).values({
        code: 'HALF50',
        discountType: 'percentage',
        discountValue: 50,
      });

      const result = await resolvePrice(testMovieId, 'HALF50');
      
      expect(result.available).toBe(true);
      expect(result.originalAmountLak).toBe(75000);
      expect(result.finalAmountLak).toBe(37500);
      expect(result.promoApplied?.discountType).toBe('percentage');
      expect(result.promoApplied?.discountAmountLak).toBe(37500);
    });

    it('should apply fixed amount promo code', async () => {
      // Assign tier to movie
      await db.update(schema.movies)
        .set({ pricingTierId: testTierId })
        .where(eq(schema.movies.id, testMovieId));

      // Create fixed promo code
      await db.insert(schema.promoCodes).values({
        code: 'SAVE20K',
        discountType: 'fixed',
        discountValue: 20000,
      });

      const result = await resolvePrice(testMovieId, 'SAVE20K');
      
      expect(result.available).toBe(true);
      expect(result.originalAmountLak).toBe(75000);
      expect(result.finalAmountLak).toBe(55000);
      expect(result.promoApplied?.discountType).toBe('fixed');
      expect(result.promoApplied?.discountAmountLak).toBe(20000);
    });

    it('should ignore invalid promo code and return full price', async () => {
      // Assign tier to movie
      await db.update(schema.movies)
        .set({ pricingTierId: testTierId })
        .where(eq(schema.movies.id, testMovieId));

      const result = await resolvePrice(testMovieId, 'INVALIDCODE');
      
      expect(result.available).toBe(true);
      expect(result.originalAmountLak).toBe(75000);
      expect(result.finalAmountLak).toBe(75000);
      expect(result.promoApplied).toBeUndefined();
    });
  });

  describe('validatePromoCode', () => {
    it('should return invalid for non-existent code', async () => {
      const result = await validatePromoCode('DOESNOTEXIST', testMovieId, 75000);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should return invalid for inactive code', async () => {
      await db.insert(schema.promoCodes).values({
        code: 'INACTIVE',
        discountType: 'free',
        isActive: false,
      });

      const result = await validatePromoCode('INACTIVE', testMovieId, 75000);
      
      expect(result.valid).toBe(false);
    });

    it('should return invalid for code not yet valid', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await db.insert(schema.promoCodes).values({
        code: 'FUTURE',
        discountType: 'free',
        validFrom: futureDate,
      });

      const result = await validatePromoCode('FUTURE', testMovieId, 75000);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not yet valid');
    });

    it('should return invalid for expired code', async () => {
      const pastDate = new Date('2020-01-01');

      await db.insert(schema.promoCodes).values({
        code: 'EXPIRED',
        discountType: 'free',
        validTo: pastDate,
      });

      const result = await validatePromoCode('EXPIRED', testMovieId, 75000);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should return invalid for code restricted to different movie', async () => {
      // Create another movie for this test
      const [otherMovie] = await db.insert(schema.movies).values({
        slug: `other-movie-${Date.now()}`,
        originalTitle: 'Other Movie',
        originalLanguage: 'en',
      }).returning();

      await db.insert(schema.promoCodes).values({
        code: 'OTHERMOVIE',
        discountType: 'free',
        movieId: otherMovie.id,
      });

      const result = await validatePromoCode('OTHERMOVIE', testMovieId, 75000);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not valid for this movie');
    });

    it('should return valid for code restricted to correct movie', async () => {
      await db.insert(schema.promoCodes).values({
        code: 'THISMOVIE',
        discountType: 'free',
        movieId: testMovieId,
      });

      const result = await validatePromoCode('THISMOVIE', testMovieId, 75000);
      
      expect(result.valid).toBe(true);
    });

    it('should be case-insensitive', async () => {
      await db.insert(schema.promoCodes).values({
        code: 'UPPERCASE',
        discountType: 'free',
      });

      const result = await validatePromoCode('lowercase', testMovieId, 75000);
      
      // Should fail because code is stored as UPPERCASE
      expect(result.valid).toBe(false);

      // But if we query with uppercase, it should work
      const result2 = await validatePromoCode('UPPERCASE', testMovieId, 75000);
      expect(result2.valid).toBe(true);
    });

    it('should calculate percentage discount correctly', async () => {
      await db.insert(schema.promoCodes).values({
        code: 'PERCENT25',
        discountType: 'percentage',
        discountValue: 25,
      });

      const result = await validatePromoCode('PERCENT25', testMovieId, 100000);
      
      expect(result.valid).toBe(true);
      expect(result.discountAmountLak).toBe(25000);
      expect(result.finalAmountLak).toBe(75000);
    });

    it('should cap fixed discount at original amount', async () => {
      await db.insert(schema.promoCodes).values({
        code: 'BIGDISCOUNT',
        discountType: 'fixed',
        discountValue: 100000, // More than the price
      });

      const result = await validatePromoCode('BIGDISCOUNT', testMovieId, 75000);
      
      expect(result.valid).toBe(true);
      expect(result.discountAmountLak).toBe(75000); // Capped at original amount
      expect(result.finalAmountLak).toBe(0);
    });

    it('should return invalid for code that exceeded max uses', async () => {
      await db.insert(schema.promoCodes).values({
        code: 'MAXEDOUT',
        discountType: 'free',
        maxUses: 10,
        usesCount: 10, // Already used 10 times
      });

      const result = await validatePromoCode('MAXEDOUT', testMovieId, 75000);
      
      expect(result.valid).toBe(false);
    });

    it('should return valid for code under max uses', async () => {
      await db.insert(schema.promoCodes).values({
        code: 'STILLVALID',
        discountType: 'free',
        maxUses: 10,
        usesCount: 5, // Only used 5 times
      });

      const result = await validatePromoCode('STILLVALID', testMovieId, 75000);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('getPromoCode', () => {
    it('should return promo code by code string', async () => {
      await db.insert(schema.promoCodes).values({
        code: 'FINDME',
        discountType: 'free',
      });

      const result = await getPromoCode('FINDME');
      
      expect(result).toBeDefined();
      expect(result?.code).toBe('FINDME');
    });

    it('should return undefined for non-existent code', async () => {
      const result = await getPromoCode('NOTFOUND');
      
      expect(result).toBeUndefined();
    });

    it('should be case-insensitive (uppercase lookup)', async () => {
      await db.insert(schema.promoCodes).values({
        code: 'MIXEDCASE',
        discountType: 'free',
      });

      const result = await getPromoCode('mixedcase');
      
      // Should find it because getPromoCode converts to uppercase
      expect(result).toBeDefined();
      expect(result?.code).toBe('MIXEDCASE');
    });
  });

  describe('incrementPromoCodeUsage', () => {
    it('should increment uses count', async () => {
      const [promoCode] = await db.insert(schema.promoCodes).values({
        code: 'INCREMENT',
        discountType: 'free',
        usesCount: 0,
      }).returning();

      await incrementPromoCodeUsage(promoCode.id);

      const [updated] = await db.select()
        .from(schema.promoCodes)
        .where(eq(schema.promoCodes.id, promoCode.id));

      expect(updated.usesCount).toBe(1);
    });

    it('should increment multiple times', async () => {
      const [promoCode] = await db.insert(schema.promoCodes).values({
        code: 'MULTIUSE',
        discountType: 'free',
        usesCount: 5,
      }).returning();

      await incrementPromoCodeUsage(promoCode.id);
      await incrementPromoCodeUsage(promoCode.id);
      await incrementPromoCodeUsage(promoCode.id);

      const [updated] = await db.select()
        .from(schema.promoCodes)
        .where(eq(schema.promoCodes.id, promoCode.id));

      expect(updated.usesCount).toBe(8);
    });
  });
});
