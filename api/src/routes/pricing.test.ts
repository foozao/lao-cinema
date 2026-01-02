import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestAdmin, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Pricing Routes', () => {
  beforeEach(async () => {
    // Clean up test data in correct order (respect foreign keys)
    await db.delete(schema.promoCodeUses);
    await db.delete(schema.paymentTransactions);
    await db.delete(schema.promoCodes);
    // Don't delete movies - just unset their pricing tier
    await db.update(schema.movies).set({ pricingTierId: null });
    await db.delete(schema.pricingTiers);
  });

  // ===========================================================================
  // PRICING TIERS
  // ===========================================================================

  describe('GET /api/admin/pricing/tiers', () => {
    it('should return 401 when not authenticated', async () => {
      const app = await build({ includePricing: true });
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pricing/tiers',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when authenticated as editor (not admin)', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pricing/tiers',
        headers,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return empty array when no tiers exist', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pricing/tiers',
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tiers).toEqual([]);
    });

    it('should return pricing tiers ordered by sortOrder then priceLak', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create tiers
      await db.insert(schema.pricingTiers).values([
        { name: 'premium', displayNameEn: 'Premium', priceLak: 100000, sortOrder: 2 },
        { name: 'standard', displayNameEn: 'Standard', priceLak: 75000, sortOrder: 1 },
        { name: 'budget', displayNameEn: 'Budget', priceLak: 50000, sortOrder: 0 },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pricing/tiers',
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tiers).toHaveLength(3);
      expect(body.tiers[0].name).toBe('budget');
      expect(body.tiers[1].name).toBe('standard');
      expect(body.tiers[2].name).toBe('premium');
    });
  });

  describe('POST /api/admin/pricing/tiers', () => {
    it('should return 401 when not authenticated', async () => {
      const app = await build({ includePricing: true });
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/pricing/tiers',
        payload: { name: 'test', displayNameEn: 'Test', priceLak: 50000 },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/pricing/tiers',
        headers,
        payload: { name: 'test' }, // Missing displayNameEn and priceLak
      });

      expect(response.statusCode).toBe(400);
    });

    it('should create a pricing tier', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/pricing/tiers',
        headers,
        payload: {
          name: 'standard',
          displayNameEn: 'Standard',
          displayNameLo: 'ມາດຕະຖານ',
          priceLak: 75000,
          sortOrder: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.tier).toMatchObject({
        name: 'standard',
        displayNameEn: 'Standard',
        displayNameLo: 'ມາດຕະຖານ',
        priceLak: 75000,
        sortOrder: 1,
        isActive: true,
      });
      expect(body.tier.id).toBeDefined();
    });

    it('should return 409 when tier name already exists', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create first tier
      await db.insert(schema.pricingTiers).values({
        name: 'standard',
        displayNameEn: 'Standard',
        priceLak: 75000,
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/pricing/tiers',
        headers,
        payload: {
          name: 'standard',
          displayNameEn: 'Standard 2',
          priceLak: 80000,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('PATCH /api/admin/pricing/tiers/:id', () => {
    it('should update a pricing tier', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create tier
      const [tier] = await db.insert(schema.pricingTiers).values({
        name: 'standard',
        displayNameEn: 'Standard',
        priceLak: 75000,
      }).returning();

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/pricing/tiers/${tier.id}`,
        headers,
        payload: {
          priceLak: 80000,
          isActive: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tier.priceLak).toBe(80000);
      expect(body.tier.isActive).toBe(false);
    });

    it('should return 404 for non-existent tier', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/pricing/tiers/${randomUUID()}`,
        headers,
        payload: { priceLak: 80000 },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/admin/pricing/tiers/:id', () => {
    it('should delete a pricing tier', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create tier
      const [tier] = await db.insert(schema.pricingTiers).values({
        name: 'standard',
        displayNameEn: 'Standard',
        priceLak: 75000,
      }).returning();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/pricing/tiers/${tier.id}`,
        headers,
      });

      expect(response.statusCode).toBe(204);

      // Verify deleted
      const [deleted] = await db.select().from(schema.pricingTiers).where(eq(schema.pricingTiers.id, tier.id));
      expect(deleted).toBeUndefined();
    });

    it('should return 400 when tier is in use by movies', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create tier
      const [tier] = await db.insert(schema.pricingTiers).values({
        name: 'standard',
        displayNameEn: 'Standard',
        priceLak: 75000,
      }).returning();

      // Get a movie and assign the tier to it
      const [movie] = await db.select().from(schema.movies).limit(1);
      if (movie) {
        await db.update(schema.movies).set({ pricingTierId: tier.id }).where(eq(schema.movies.id, movie.id));

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/admin/pricing/tiers/${tier.id}`,
          headers,
        });

        expect(response.statusCode).toBe(400);
      }
    });
  });

  // ===========================================================================
  // PROMO CODES
  // ===========================================================================

  describe('GET /api/admin/promo-codes', () => {
    it('should return 401 when not authenticated', async () => {
      const app = await build({ includePricing: true });
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/promo-codes',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return empty array when no promo codes exist', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/promo-codes',
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.promoCodes).toEqual([]);
    });

    it('should return promo codes', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create promo codes
      await db.insert(schema.promoCodes).values([
        { code: 'FREE100', discountType: 'free' },
        { code: 'HALF50', discountType: 'percentage', discountValue: 50 },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/promo-codes',
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.promoCodes).toHaveLength(2);
    });
  });

  describe('POST /api/admin/promo-codes', () => {
    it('should create a free promo code', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/promo-codes',
        headers,
        payload: {
          code: 'FREEFILM',
          discountType: 'free',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.promoCode).toMatchObject({
        code: 'FREEFILM',
        discountType: 'free',
        isActive: true,
        usesCount: 0,
      });
    });

    it('should create a percentage promo code', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/promo-codes',
        headers,
        payload: {
          code: 'HALF50',
          discountType: 'percentage',
          discountValue: 50,
          maxUses: 100,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.promoCode).toMatchObject({
        code: 'HALF50',
        discountType: 'percentage',
        discountValue: 50,
        maxUses: 100,
      });
    });

    it('should create a fixed amount promo code', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/promo-codes',
        headers,
        payload: {
          code: 'SAVE20K',
          discountType: 'fixed',
          discountValue: 20000,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.promoCode).toMatchObject({
        code: 'SAVE20K',
        discountType: 'fixed',
        discountValue: 20000,
      });
    });

    it('should uppercase the promo code', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/promo-codes',
        headers,
        payload: {
          code: 'lowercase',
          discountType: 'free',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.promoCode.code).toBe('LOWERCASE');
    });

    it('should return 400 when discountValue is missing for percentage type', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/promo-codes',
        headers,
        payload: {
          code: 'INVALID',
          discountType: 'percentage',
          // Missing discountValue
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 when promo code already exists', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create first promo code
      await db.insert(schema.promoCodes).values({
        code: 'EXISTING',
        discountType: 'free',
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/promo-codes',
        headers,
        payload: {
          code: 'EXISTING',
          discountType: 'percentage',
          discountValue: 25,
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should create promo code with validity period', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const validFrom = new Date('2025-01-01');
      const validTo = new Date('2025-12-31');

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/promo-codes',
        headers,
        payload: {
          code: 'NEWYEAR2025',
          discountType: 'percentage',
          discountValue: 25,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(new Date(body.promoCode.validFrom).getFullYear()).toBe(2025);
      expect(new Date(body.promoCode.validTo).getFullYear()).toBe(2025);
    });
  });

  describe('PATCH /api/admin/promo-codes/:id', () => {
    it('should update a promo code', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create promo code
      const [promoCode] = await db.insert(schema.promoCodes).values({
        code: 'TESTCODE',
        discountType: 'percentage',
        discountValue: 25,
      }).returning();

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/promo-codes/${promoCode.id}`,
        headers,
        payload: {
          discountValue: 30,
          isActive: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.promoCode.discountValue).toBe(30);
      expect(body.promoCode.isActive).toBe(false);
    });

    it('should return 404 for non-existent promo code', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/promo-codes/${randomUUID()}`,
        headers,
        payload: { isActive: false },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/admin/promo-codes/:id', () => {
    it('should delete a promo code', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create promo code
      const [promoCode] = await db.insert(schema.promoCodes).values({
        code: 'DELETEME',
        discountType: 'free',
      }).returning();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/promo-codes/${promoCode.id}`,
        headers,
      });

      expect(response.statusCode).toBe(204);

      // Verify deleted
      const [deleted] = await db.select().from(schema.promoCodes).where(eq(schema.promoCodes.id, promoCode.id));
      expect(deleted).toBeUndefined();
    });

    it('should return 404 for non-existent promo code', async () => {
      const app = await build({ includePricing: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/promo-codes/${randomUUID()}`,
        headers,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================================================
  // PUBLIC PRICING ENDPOINTS
  // ===========================================================================

  describe('GET /api/movies/:movieId/pricing', () => {
    it('should return unavailable for movie without pricing tier', async () => {
      const app = await build({ includePricing: true });

      // Get a movie
      const [movie] = await db.select().from(schema.movies).limit(1);
      if (!movie) {
        console.log('No movies in test database, skipping test');
        return;
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/movies/${movie.id}/pricing`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pricing.available).toBe(false);
      expect(body.pricing.unavailableReason).toBe('no_pricing');
    });

    it('should return pricing for movie with tier', async () => {
      const app = await build({ includePricing: true });

      // Create tier
      const [tier] = await db.insert(schema.pricingTiers).values({
        name: 'standard',
        displayNameEn: 'Standard',
        displayNameLo: 'ມາດຕະຖານ',
        priceLak: 75000,
      }).returning();

      // Get a movie and assign tier
      const [movie] = await db.select().from(schema.movies).limit(1);
      if (!movie) {
        console.log('No movies in test database, skipping test');
        return;
      }

      await db.update(schema.movies).set({ pricingTierId: tier.id }).where(eq(schema.movies.id, movie.id));

      const response = await app.inject({
        method: 'GET',
        url: `/api/movies/${movie.id}/pricing`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pricing.available).toBe(true);
      expect(body.pricing.originalAmountLak).toBe(75000);
      expect(body.pricing.finalAmountLak).toBe(75000);
      expect(body.pricing.tier.name).toBe('standard');
    });

    it('should return 404 for non-existent movie', async () => {
      const app = await build({ includePricing: true });

      const response = await app.inject({
        method: 'GET',
        url: `/api/movies/${randomUUID()}/pricing`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/promo-codes/validate', () => {
    it('should validate a free promo code', async () => {
      const app = await build({ includePricing: true });

      // Create tier and promo code
      const [tier] = await db.insert(schema.pricingTiers).values({
        name: 'standard',
        displayNameEn: 'Standard',
        priceLak: 75000,
      }).returning();

      await db.insert(schema.promoCodes).values({
        code: 'FREEWATCH',
        discountType: 'free',
      });

      // Get a movie and assign tier
      const [movie] = await db.select().from(schema.movies).limit(1);
      if (!movie) {
        console.log('No movies in test database, skipping test');
        return;
      }

      await db.update(schema.movies).set({ pricingTierId: tier.id }).where(eq(schema.movies.id, movie.id));

      const response = await app.inject({
        method: 'POST',
        url: '/api/promo-codes/validate',
        payload: {
          code: 'FREEWATCH',
          movieId: movie.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.validation.valid).toBe(true);
      expect(body.validation.discountType).toBe('free');
      expect(body.validation.discountAmountLak).toBe(75000);
      expect(body.validation.finalAmountLak).toBe(0);
    });

    it('should validate a percentage promo code', async () => {
      const app = await build({ includePricing: true });

      // Create tier and promo code
      const [tier] = await db.insert(schema.pricingTiers).values({
        name: 'standard',
        displayNameEn: 'Standard',
        priceLak: 100000,
      }).returning();

      await db.insert(schema.promoCodes).values({
        code: 'HALF50',
        discountType: 'percentage',
        discountValue: 50,
      });

      // Get a movie and assign tier
      const [movie] = await db.select().from(schema.movies).limit(1);
      if (!movie) {
        console.log('No movies in test database, skipping test');
        return;
      }

      await db.update(schema.movies).set({ pricingTierId: tier.id }).where(eq(schema.movies.id, movie.id));

      const response = await app.inject({
        method: 'POST',
        url: '/api/promo-codes/validate',
        payload: {
          code: 'half50', // lowercase should work
          movieId: movie.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.validation.valid).toBe(true);
      expect(body.validation.discountType).toBe('percentage');
      expect(body.validation.discountAmountLak).toBe(50000);
      expect(body.validation.finalAmountLak).toBe(50000);
    });

    it('should return invalid for expired promo code', async () => {
      const app = await build({ includePricing: true });

      // Create tier and expired promo code
      const [tier] = await db.insert(schema.pricingTiers).values({
        name: 'standard',
        displayNameEn: 'Standard',
        priceLak: 75000,
      }).returning();

      await db.insert(schema.promoCodes).values({
        code: 'EXPIRED',
        discountType: 'free',
        validTo: new Date('2020-01-01'), // In the past
      });

      // Get a movie and assign tier
      const [movie] = await db.select().from(schema.movies).limit(1);
      if (!movie) {
        console.log('No movies in test database, skipping test');
        return;
      }

      await db.update(schema.movies).set({ pricingTierId: tier.id }).where(eq(schema.movies.id, movie.id));

      const response = await app.inject({
        method: 'POST',
        url: '/api/promo-codes/validate',
        payload: {
          code: 'EXPIRED',
          movieId: movie.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.validation.valid).toBe(false);
      expect(body.validation.error).toContain('expired');
    });

    it('should return invalid for non-existent promo code', async () => {
      const app = await build({ includePricing: true });

      // Create tier
      const [tier] = await db.insert(schema.pricingTiers).values({
        name: 'standard',
        displayNameEn: 'Standard',
        priceLak: 75000,
      }).returning();

      // Get a movie and assign tier
      const [movie] = await db.select().from(schema.movies).limit(1);
      if (!movie) {
        console.log('No movies in test database, skipping test');
        return;
      }

      await db.update(schema.movies).set({ pricingTierId: tier.id }).where(eq(schema.movies.id, movie.id));

      const response = await app.inject({
        method: 'POST',
        url: '/api/promo-codes/validate',
        payload: {
          code: 'DOESNOTEXIST',
          movieId: movie.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.validation.valid).toBe(false);
    });

    it('should return 400 for movie without pricing', async () => {
      const app = await build({ includePricing: true });

      // Get a movie without pricing tier
      const [movie] = await db.select().from(schema.movies).limit(1);
      if (!movie) {
        console.log('No movies in test database, skipping test');
        return;
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/promo-codes/validate',
        payload: {
          code: 'ANYCODE',
          movieId: movie.id,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
