/**
 * Rental Access Service Tests
 * 
 * Tests the centralized logic for checking movie access via
 * direct rental or pack rental.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, schema } from '../db/index.js';
import { checkMovieAccess, checkPackAccess } from './rental-access.js';
import { randomUUID } from 'crypto';

describe('Rental Access Service', () => {
  let testMovieId: string;
  let testPackId: string;
  let testUserId: string;
  const testAnonymousId = 'anon-test-123';

  beforeEach(async () => {
    // Generate UUIDs for each test
    testMovieId = randomUUID();
    testPackId = randomUUID();

    // Clean up test data
    await db.delete(schema.rentals);
    await db.delete(schema.shortPackItems);
    await db.delete(schema.shortPackTranslations);
    await db.delete(schema.shortPacks);
    await db.delete(schema.movieTranslations);
    await db.delete(schema.movies);
    await db.delete(schema.userSessions);
    await db.delete(schema.users);

    // Create test user
    const [user] = await db.insert(schema.users).values({
      email: `test-${Date.now()}@example.com`,
      passwordHash: 'test-hash',
      displayName: 'Test User',
      role: 'user',
    }).returning();
    testUserId = user.id;

    // Create test movie
    await db.insert(schema.movies).values({
      id: testMovieId,
      tmdbId: 999999,
      originalTitle: 'Test Movie',
      originalLanguage: 'en',
      releaseDate: '2024-01-01',
      voteAverage: 7.5,
      voteCount: 100,
      popularity: 50,
      adult: false,
    });

    // Create test pack
    await db.insert(schema.shortPacks).values({
      id: testPackId,
      slug: 'test-pack',
      isPublished: true,
    });

    // Add movie to pack
    await db.insert(schema.shortPackItems).values({
      packId: testPackId,
      movieId: testMovieId,
      order: 1,
    });
  });

  // =============================================================================
  // checkMovieAccess TESTS
  // =============================================================================

  describe('checkMovieAccess', () => {
    describe('Direct Movie Rental', () => {
      it('should return hasAccess true for valid direct rental with userId', async () => {
        // Create a valid rental
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        await db.insert(schema.rentals).values({
          userId: testUserId,
          movieId: testMovieId,
          expiresAt,
          transactionId: `txn-${Date.now()}`,
        amount: 300,
        });

        const result = await checkMovieAccess(testMovieId, { userId: testUserId });

        expect(result.hasAccess).toBe(true);
        expect(result.accessType).toBe('movie');
        expect(result.rental).not.toBeNull();
        expect(result.rental?.movieId).toBe(testMovieId);
      });

      it('should return hasAccess true for valid direct rental with anonymousId', async () => {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.insert(schema.rentals).values({
          anonymousId: testAnonymousId,
          movieId: testMovieId,
          expiresAt,
          transactionId: `txn-${Date.now()}`,
        amount: 300,
        });

        const result = await checkMovieAccess(testMovieId, { anonymousId: testAnonymousId });

        expect(result.hasAccess).toBe(true);
        expect(result.accessType).toBe('movie');
      });

      it('should return hasAccess false for expired direct rental', async () => {
        // Create an expired rental
        const expiresAt = new Date(Date.now() - 1000); // 1 second ago
        await db.insert(schema.rentals).values({
          userId: testUserId,
          movieId: testMovieId,
          expiresAt,
          transactionId: `txn-${Date.now()}`,
        amount: 300,
        });

        const result = await checkMovieAccess(testMovieId, { userId: testUserId });

        expect(result.hasAccess).toBe(false);
        expect(result.accessType).toBeNull();
        expect(result.rental).toBeNull();
      });

      it('should return hasAccess false for rental by different user', async () => {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.insert(schema.rentals).values({
          anonymousId: 'other-user-id',
          movieId: testMovieId,
          expiresAt,
          transactionId: `txn-${Date.now()}`,
        amount: 300,
        });

        const result = await checkMovieAccess(testMovieId, { userId: testUserId });

        expect(result.hasAccess).toBe(false);
      });
    });

    describe('Pack Rental', () => {
      it('should return hasAccess true for valid pack rental', async () => {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.insert(schema.rentals).values({
          userId: testUserId,
          shortPackId: testPackId,
          expiresAt,
          transactionId: `txn-${Date.now()}`,
        amount: 500,
        });

        const result = await checkMovieAccess(testMovieId, { userId: testUserId });

        expect(result.hasAccess).toBe(true);
        expect(result.accessType).toBe('pack');
        expect(result.rental?.shortPackId).toBe(testPackId);
      });

      it('should return hasAccess true for pack rental with anonymousId', async () => {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.insert(schema.rentals).values({
          anonymousId: testAnonymousId,
          shortPackId: testPackId,
          expiresAt,
          transactionId: `txn-${Date.now()}`,
        amount: 500,
        });

        const result = await checkMovieAccess(testMovieId, { anonymousId: testAnonymousId });

        expect(result.hasAccess).toBe(true);
        expect(result.accessType).toBe('pack');
      });

      it('should return hasAccess false for expired pack rental', async () => {
        const expiresAt = new Date(Date.now() - 1000);
        await db.insert(schema.rentals).values({
          userId: testUserId,
          shortPackId: testPackId,
          expiresAt,
          transactionId: `txn-${Date.now()}`,
        amount: 500,
        });

        const result = await checkMovieAccess(testMovieId, { userId: testUserId });

        expect(result.hasAccess).toBe(false);
      });

      it('should return hasAccess false if movie is not in the pack', async () => {
        // Create a different movie not in the pack
        const otherMovieId = randomUUID();
        await db.insert(schema.movies).values({
          id: otherMovieId,
          tmdbId: 888888,
          originalTitle: 'Other Movie',
          originalLanguage: 'en',
          releaseDate: '2024-01-01',
          voteAverage: 7.5,
          voteCount: 100,
          popularity: 50,
          adult: false,
        });

        // Create pack rental
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.insert(schema.rentals).values({
          userId: testUserId,
          shortPackId: testPackId,
          expiresAt,
          transactionId: `txn-${Date.now()}`,
        amount: 500,
        });

        const result = await checkMovieAccess(otherMovieId, { userId: testUserId });

        expect(result.hasAccess).toBe(false);
      });
    });

    describe('Priority', () => {
      it('should prefer direct rental over pack rental', async () => {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Create both direct and pack rental
        await db.insert(schema.rentals).values([
          {
            userId: testUserId,
            movieId: testMovieId,
            expiresAt,
            transactionId: `txn-${Date.now()}`,
        amount: 300,
          },
          {
            userId: testUserId,
            shortPackId: testPackId,
            expiresAt,
            transactionId: `txn-${Date.now()}`,
        amount: 500,
          },
        ]);

        const result = await checkMovieAccess(testMovieId, { userId: testUserId });

        expect(result.hasAccess).toBe(true);
        expect(result.accessType).toBe('movie'); // Direct rental takes priority
      });
    });

    describe('No Access', () => {
      it('should return hasAccess false when no rental exists', async () => {
        const result = await checkMovieAccess(testMovieId, { userId: testUserId });

        expect(result.hasAccess).toBe(false);
        expect(result.accessType).toBeNull();
        expect(result.rental).toBeNull();
      });

      it('should return hasAccess false for non-existent movie', async () => {
        const nonExistentMovieId = randomUUID();
        const result = await checkMovieAccess(nonExistentMovieId, { userId: testUserId });

        expect(result.hasAccess).toBe(false);
      });
    });
  });

  // =============================================================================
  // checkPackAccess TESTS
  // =============================================================================

  describe('checkPackAccess', () => {
    it('should return rental for valid pack rental with userId', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.insert(schema.rentals).values({
        userId: testUserId,
        shortPackId: testPackId,
        expiresAt,
        transactionId: `txn-${Date.now()}`,
        amount: 500,
      });

      const result = await checkPackAccess(testPackId, { userId: testUserId });

      expect(result.rental).not.toBeNull();
      expect(result.rental?.shortPackId).toBe(testPackId);
      expect(result.expired).toBeUndefined();
    });

    it('should return rental for valid pack rental with anonymousId', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.insert(schema.rentals).values({
        anonymousId: testAnonymousId,
        shortPackId: testPackId,
        expiresAt,
        transactionId: `txn-${Date.now()}`,
        amount: 500,
      });

      const result = await checkPackAccess(testPackId, { anonymousId: testAnonymousId });

      expect(result.rental).not.toBeNull();
    });

    it('should return expired flag for expired pack rental', async () => {
      const expiresAt = new Date(Date.now() - 1000);
      await db.insert(schema.rentals).values({
        userId: testUserId,
        shortPackId: testPackId,
        expiresAt,
        transactionId: `txn-${Date.now()}`,
        amount: 500,
      });

      const result = await checkPackAccess(testPackId, { userId: testUserId });

      expect(result.rental).toBeNull();
      expect(result.expired).toBe(true);
      expect(result.expiredAt).toEqual(expiresAt);
    });

    it('should return null rental when no pack rental exists', async () => {
      const result = await checkPackAccess(testPackId, { userId: testUserId });

      expect(result.rental).toBeNull();
      expect(result.expired).toBeUndefined();
    });

    it('should return null for rental by different user', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.insert(schema.rentals).values({
        anonymousId: 'other-user',
        shortPackId: testPackId,
        expiresAt,
        transactionId: `txn-${Date.now()}`,
        amount: 500,
      });

      const result = await checkPackAccess(testPackId, { userId: testUserId });

      expect(result.rental).toBeNull();
    });
  });
});
