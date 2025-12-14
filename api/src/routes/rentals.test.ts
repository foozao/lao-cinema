/**
 * Rental Routes Tests
 * 
 * Tests movie rental management for both authenticated and anonymous users.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { db } from '../db/index.js';
import { users, userSessions, rentals, movies, shortPacks, shortPackItems, shortPackTranslations } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

describe('Rental Routes', () => {
  let app: FastifyInstance;
  let movieId1: string;
  let movieId2: string;

  beforeEach(async () => {
    app = await build({ includeAuth: true, includeRentals: true, includeShortPacks: true });
    
    // Clean up test data
    await db.delete(rentals);
    await db.delete(userSessions);
    await db.delete(users);
    
    // Create test movies
    const [movie1] = await db.insert(movies).values({
      originalTitle: 'Test Movie 1',
      releaseDate: '2024-01-01',
    }).returning();
    movieId1 = movie1.id;
    
    const [movie2] = await db.insert(movies).values({
      originalTitle: 'Test Movie 2',
      releaseDate: '2024-01-02',
    }).returning();
    movieId2 = movie2.id;
  });

  // =============================================================================
  // ANONYMOUS USER TESTS
  // =============================================================================

  describe('Anonymous User', () => {
    const anonymousId = 'anon_test_12345';

    describe('GET /api/rentals', () => {
      it.skip('should return empty array when no rentals exist', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/rentals',
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rentals).toEqual([]);
        expect(body.total).toBe(0);
      });

      it.skip('should return only active rentals', async () => {
        // Create an active rental
        await db.insert(rentals).values({
          anonymousId,
          movieId: movieId1,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          transactionId: 'txn_active',
          amount: 500,
          paymentMethod: 'demo',
        });

        // Create an expired rental
        await db.insert(rentals).values({
          anonymousId,
          movieId: movieId2,
          purchasedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago (expired)
          transactionId: 'txn_expired',
          amount: 500,
          paymentMethod: 'demo',
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/rentals',
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rentals).toHaveLength(1);
        expect(body.rentals[0].transactionId).toBe('txn_active');
      });

      it.skip('should not return rentals from other anonymous users', async () => {
        // Create rental for different anonymous user
        await db.insert(rentals).values({
          anonymousId: 'anon_other_user',
          movieId: movieId1,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn_other',
          amount: 500,
          paymentMethod: 'demo',
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/rentals',
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        if (response.statusCode !== 200) {
          console.error('Error response:', response.body);
        }
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rentals).toHaveLength(0);
      });
    });

    describe('GET /api/rentals/:movieId', () => {
      it('should return null for movie without rental', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/rentals/${movieId1}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rental).toBeNull();
      });

      it('should return active rental details', async () => {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.insert(rentals).values({
          anonymousId,
          movieId: movieId1,
          purchasedAt: new Date(),
          expiresAt,
          transactionId: 'txn_check',
          amount: 500,
          paymentMethod: 'demo',
        });

        const response = await app.inject({
          method: 'GET',
          url: `/api/rentals/${movieId1}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rental).not.toBeNull();
        expect(body.rental.movieId).toBe(movieId1);
        expect(body.rental.transactionId).toBe('txn_check');
        expect(body.rental.amount).toBe(500);
      });

      it('should indicate expired rental', async () => {
        const expiredAt = new Date(Date.now() - 1000); // 1 second ago
        await db.insert(rentals).values({
          anonymousId,
          movieId: movieId1,
          purchasedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          expiresAt: expiredAt,
          transactionId: 'txn_expired',
          amount: 500,
          paymentMethod: 'demo',
        });

        const response = await app.inject({
          method: 'GET',
          url: `/api/rentals/${movieId1}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rental).toBeNull();
        expect(body.expired).toBe(true);
        expect(body.expiredAt).toBeDefined();
      });
    });

    describe('POST /api/rentals/:movieId', () => {
      it('should create a rental successfully', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/rentals/${movieId1}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
          payload: {
            transactionId: 'txn_new',
            amount: 500,
            paymentMethod: 'demo',
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.rental).toBeDefined();
        expect(body.rental.movieId).toBe(movieId1);
        expect(body.rental.transactionId).toBe('txn_new');
        expect(body.rental.amount).toBe(500);
        expect(body.rental.currency).toBe('USD');
        expect(body.rental.expiresAt).toBeDefined();
      });

      it('should reject rental without transaction ID', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/rentals/${movieId1}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
          payload: {},
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain('Transaction ID is required');
      });

      it('should reject rental for non-existent movie', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/rentals/00000000-0000-0000-0000-000000000000',
          headers: {
            'x-anonymous-id': anonymousId,
          },
          payload: {
            transactionId: 'txn_bad',
          },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body);
        expect(body.message).toContain('Movie not found');
      });

      it('should reject duplicate active rental', async () => {
        // Create first rental
        await db.insert(rentals).values({
          anonymousId,
          movieId: movieId1,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn_first',
          amount: 500,
          paymentMethod: 'demo',
        });

        // Try to create another
        const response = await app.inject({
          method: 'POST',
          url: `/api/rentals/${movieId1}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
          payload: {
            transactionId: 'txn_duplicate',
          },
        });

        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.body);
        expect(body.message).toContain('already have an active rental');
      });

      it('should allow rental after previous one expires', async () => {
        // Create expired rental
        await db.insert(rentals).values({
          anonymousId,
          movieId: movieId1,
          purchasedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
          transactionId: 'txn_old',
          amount: 500,
          paymentMethod: 'demo',
        });

        // Should be able to create new rental
        const response = await app.inject({
          method: 'POST',
          url: `/api/rentals/${movieId1}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
          payload: {
            transactionId: 'txn_renewed',
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.rental.transactionId).toBe('txn_renewed');
      });

      it('should use default amount and payment method', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/rentals/${movieId1}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
          payload: {
            transactionId: 'txn_defaults',
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.rental.amount).toBe(500); // Default
        expect(body.rental.paymentMethod).toBe('demo'); // Default
      });
    });
  });

  // =============================================================================
  // AUTHENTICATED USER TESTS
  // =============================================================================

  describe('Authenticated User', () => {
    let sessionToken: string;
    let userId: string;

    beforeEach(async () => {
      // Register user
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'rental@example.com',
          password: 'password123',
        },
      });
      const body = JSON.parse(response.body);
      sessionToken = body.session.token;
      userId = body.user.id;
    });

    describe('GET /api/rentals', () => {
      it.skip('should return user rentals', async () => {
        await db.insert(rentals).values({
          userId,
          movieId: movieId1,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn_user',
          amount: 500,
          paymentMethod: 'demo',
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/rentals',
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rentals).toHaveLength(1);
        expect(body.rentals[0].movieId).toBe(movieId1);
      });

      it.skip('should not return anonymous rentals', async () => {
        await db.insert(rentals).values({
          anonymousId: 'anon_other',
          movieId: movieId1,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn_anon',
          amount: 500,
          paymentMethod: 'demo',
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/rentals',
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rentals).toHaveLength(0);
      });
    });

    describe('POST /api/rentals/:movieId', () => {
      it('should create rental for authenticated user', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/api/rentals/${movieId1}`,
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
          payload: {
            transactionId: 'txn_auth',
          },
        });

        expect(response.statusCode).toBe(201);
        
        // Verify rental is linked to user
        const [rental] = await db.select()
          .from(rentals)
          .where(eq(rentals.userId, userId));
        
        expect(rental).toBeDefined();
        expect(rental.anonymousId).toBeNull();
      });
    });

    describe('POST /api/rentals/migrate', () => {
      it('should migrate anonymous rentals to authenticated user', async () => {
        const anonymousId = 'anon_migrate_test';
        
        // Create anonymous rentals
        await db.insert(rentals).values([
          {
            anonymousId,
            movieId: movieId1,
            purchasedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            transactionId: 'txn_migrate1',
            amount: 500,
            paymentMethod: 'demo',
          },
          {
            anonymousId,
            movieId: movieId2,
            purchasedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            transactionId: 'txn_migrate2',
            amount: 500,
            paymentMethod: 'demo',
          },
        ]);

        const response = await app.inject({
          method: 'POST',
          url: '/api/rentals/migrate',
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
          payload: {
            anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.migratedRentals).toBe(2);

        // Verify rentals are now linked to user
        const userRentals = await db.select()
          .from(rentals)
          .where(eq(rentals.userId, userId));
        
        expect(userRentals).toHaveLength(2);
        expect(userRentals[0].anonymousId).toBeNull();
        expect(userRentals[1].anonymousId).toBeNull();
      });

      it('should require authentication', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/rentals/migrate',
          headers: {
            'x-anonymous-id': 'anon_test',
          },
          payload: {
            anonymousId: 'anon_test',
          },
        });

        expect(response.statusCode).toBe(401);
      });

      it('should require anonymous ID in body', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/rentals/migrate',
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
          payload: {},
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain('Anonymous ID is required');
      });

      it('should handle migration with no matching rentals', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/rentals/migrate',
          headers: {
            authorization: `Bearer ${sessionToken}`,
          },
          payload: {
            anonymousId: 'anon_nonexistent',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.migratedRentals).toBe(0);
      });
    });
  });

  // =============================================================================
  // PACK RENTAL TESTS
  // =============================================================================

  describe('Pack Rentals', () => {
    const anonymousId = 'anon_pack_test';
    let packId: string;
    let shortId1: string;
    let shortId2: string;
    let shortId3: string;

    beforeEach(async () => {
      // Clean up pack-related data
      await db.delete(shortPackItems);
      await db.delete(shortPackTranslations);
      await db.delete(shortPacks);
      
      // Create short films
      const [short1] = await db.insert(movies).values({
        originalTitle: 'Short Film 1',
        releaseDate: '2024-01-01',
        runtime: 15,
      }).returning();
      shortId1 = short1.id;
      
      const [short2] = await db.insert(movies).values({
        originalTitle: 'Short Film 2',
        releaseDate: '2024-01-02',
        runtime: 12,
      }).returning();
      shortId2 = short2.id;
      
      const [short3] = await db.insert(movies).values({
        originalTitle: 'Short Film 3',
        releaseDate: '2024-01-03',
        runtime: 18,
      }).returning();
      shortId3 = short3.id;
      
      // Create a pack
      const [pack] = await db.insert(shortPacks).values({
        slug: 'test-pack',
        isPublished: true,
      }).returning();
      packId = pack.id;
      
      // Add translations
      await db.insert(shortPackTranslations).values([
        { packId, language: 'en', title: 'Test Pack' },
        { packId, language: 'lo', title: 'ແພັກທົດສອບ' },
      ]);
      
      // Add shorts to pack
      await db.insert(shortPackItems).values([
        { packId, movieId: shortId1, order: 1 },
        { packId, movieId: shortId2, order: 2 },
        { packId, movieId: shortId3, order: 3 },
      ]);
    });

    describe('GET /api/rentals/:movieId (with pack access)', () => {
      it('should return pack rental when short is in rented pack', async () => {
        // Create pack rental
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.insert(rentals).values({
          anonymousId,
          shortPackId: packId,
          purchasedAt: new Date(),
          expiresAt,
          transactionId: 'txn_pack',
          amount: 1000,
          paymentMethod: 'demo',
        });

        // Check access for a short in the pack
        const response = await app.inject({
          method: 'GET',
          url: `/api/rentals/${shortId2}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rental).not.toBeNull();
        expect(body.rental.shortPackId).toBe(packId);
        expect(body.rental.movieId).toBeNull();
      });

      it('should return null when short is not in any rented pack', async () => {
        // Create a different movie not in pack
        const [standaloneMovie] = await db.insert(movies).values({
          originalTitle: 'Standalone Movie',
          releaseDate: '2024-01-04',
        }).returning();

        const response = await app.inject({
          method: 'GET',
          url: `/api/rentals/${standaloneMovie.id}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rental).toBeNull();
      });

      it('should prioritize direct rental over pack rental', async () => {
        // Create both direct and pack rental
        const directExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
        await db.insert(rentals).values({
          anonymousId,
          movieId: shortId1,
          purchasedAt: new Date(),
          expiresAt: directExpiresAt,
          transactionId: 'txn_direct',
          amount: 500,
          paymentMethod: 'demo',
        });

        const packExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.insert(rentals).values({
          anonymousId,
          shortPackId: packId,
          purchasedAt: new Date(),
          expiresAt: packExpiresAt,
          transactionId: 'txn_pack',
          amount: 1000,
          paymentMethod: 'demo',
        });

        const response = await app.inject({
          method: 'GET',
          url: `/api/rentals/${shortId1}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rental.movieId).toBe(shortId1);
        expect(body.rental.shortPackId).toBeUndefined();
      });
    });

    describe('GET /api/rentals/access/:movieId (pack access)', () => {
      it('should grant access when movie is in rented pack', async () => {
        await db.insert(rentals).values({
          anonymousId,
          shortPackId: packId,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn_pack',
          amount: 1000,
          paymentMethod: 'demo',
        });

        const response = await app.inject({
          method: 'GET',
          url: `/api/rentals/access/${shortId2}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.hasAccess).toBe(true);
        expect(body.accessType).toBe('pack');
        expect(body.rental.shortPackId).toBe(packId);
      });
    });

    describe('GET /api/rentals/packs/:packId', () => {
      it.skip('should return pack rental with currentShortId', async () => {
        const [rental] = await db.insert(rentals).values({
          anonymousId,
          shortPackId: packId,
          currentShortId: shortId2,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn_pack',
          amount: 1000,
          paymentMethod: 'demo',
        }).returning();

        const response = await app.inject({
          method: 'GET',
          url: `/api/rentals/packs/${packId}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        if (response.statusCode !== 200) {
          console.error('Pack rental status error:', response.body);
        }
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rental).not.toBeNull();
        expect(body.rental.id).toBe(rental.id);
        expect(body.rental.shortPackId).toBe(packId);
        expect(body.rental.currentShortId).toBe(shortId2);
      });

      it.skip('should return null currentShortId when not set', async () => {
        await db.insert(rentals).values({
          anonymousId,
          shortPackId: packId,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn_pack',
          amount: 1000,
          paymentMethod: 'demo',
        });

        const response = await app.inject({
          method: 'GET',
          url: `/api/rentals/packs/${packId}`,
          headers: {
            'x-anonymous-id': anonymousId,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.rental.currentShortId).toBeNull();
      });
    });

    describe('PATCH /api/rentals/:rentalId/position', () => {
      it.skip('should update pack position successfully', async () => {
        const [rental] = await db.insert(rentals).values({
          anonymousId,
          shortPackId: packId,
          currentShortId: shortId1,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn_pack',
          amount: 1000,
          paymentMethod: 'demo',
        }).returning();

        const response = await app.inject({
          method: 'PATCH',
          url: `/api/rentals/${rental.id}/position`,
          headers: {
            'x-anonymous-id': anonymousId,
            'content-type': 'application/json',
          },
          payload: {
            currentShortId: shortId3,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        // Verify the update in database
        const [updated] = await db.select()
          .from(rentals)
          .where(eq(rentals.id, rental.id));
        expect(updated.currentShortId).toBe(shortId3);
      });

      it('should fail when rental does not belong to user', async () => {
        const [rental] = await db.insert(rentals).values({
          anonymousId: 'different_user',
          shortPackId: packId,
          purchasedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          transactionId: 'txn_pack',
          amount: 1000,
          paymentMethod: 'demo',
        }).returning();

        const response = await app.inject({
          method: 'PATCH',
          url: `/api/rentals/${rental.id}/position`,
          headers: {
            'x-anonymous-id': anonymousId,
            'content-type': 'application/json',
          },
          payload: {
            currentShortId: shortId2,
          },
        });

        expect(response.statusCode).toBe(404);
      });

      it('should fail when rental is expired', async () => {
        const [rental] = await db.insert(rentals).values({
          anonymousId,
          shortPackId: packId,
          purchasedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 1000), // Expired
          transactionId: 'txn_pack',
          amount: 1000,
          paymentMethod: 'demo',
        }).returning();

        const response = await app.inject({
          method: 'PATCH',
          url: `/api/rentals/${rental.id}/position`,
          headers: {
            'x-anonymous-id': anonymousId,
            'content-type': 'application/json',
          },
          payload: {
            currentShortId: shortId2,
          },
        });

        expect(response.statusCode).toBe(404);
      });
    });
  });

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  describe('Error Handling', () => {
    it('should require authentication or anonymous ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/rentals',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
