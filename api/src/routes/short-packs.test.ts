// Short Packs API tests

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

describe('Short Packs API', () => {
  let app: Awaited<ReturnType<typeof build>>;
  let editorAuth: { headers: { authorization: string }; userId: string };

  beforeEach(async () => {
    // Clean up test data
    await db.delete(schema.shortPackItems);
    await db.delete(schema.shortPackTranslations);
    await db.delete(schema.shortPacks);
    await db.delete(schema.movieTranslations);
    await db.delete(schema.movies);
    await db.delete(schema.userSessions);
    await db.delete(schema.users);

    app = await build({ includeShortPacks: true });
    editorAuth = await createTestEditor();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/short-packs', () => {
    it('should return empty array when no packs exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/short-packs',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.short_packs).toEqual([]);
    });

    it('should return all packs', async () => {
      // Create a pack directly in DB
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'test-pack',
        priceUsd: 499,
        isPublished: true,
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Test Pack',
        description: 'A test pack',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/short-packs',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.short_packs).toHaveLength(1);
      expect(body.short_packs[0].title.en).toBe('Test Pack');
      expect(body.short_packs[0].slug).toBe('test-pack');
    });

    it('should filter by published status', async () => {
      // Create published and unpublished packs
      const [publishedPack] = await db.insert(schema.shortPacks).values({
        slug: 'published-pack',
        isPublished: true,
      }).returning();

      const [unpublishedPack] = await db.insert(schema.shortPacks).values({
        slug: 'unpublished-pack',
        isPublished: false,
      }).returning();

      await db.insert(schema.shortPackTranslations).values([
        { packId: publishedPack.id, language: 'en', title: 'Published Pack' },
        { packId: unpublishedPack.id, language: 'en', title: 'Unpublished Pack' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/short-packs?published=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.short_packs).toHaveLength(1);
      expect(body.short_packs[0].title.en).toBe('Published Pack');
    });
  });

  describe('POST /api/short-packs', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/short-packs',
        payload: {
          title: { en: 'Test Pack' },
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create a new pack', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/short-packs',
        headers: editorAuth.headers,
        payload: {
          slug: 'new-pack',
          title: { en: 'New Pack', lo: 'ແພັກໃໝ່' },
          description: { en: 'A new pack' },
          price_usd: 599,
          is_published: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.title.en).toBe('New Pack');
      expect(body.title.lo).toBe('ແພັກໃໝ່');
      expect(body.price_usd).toBe(599);
      expect(body.is_published).toBe(false);
    });
  });

  describe('GET /api/short-packs/:id', () => {
    it('should return 404 for non-existent pack', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/short-packs/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return pack by ID', async () => {
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'detail-pack',
        priceUsd: 499,
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Detail Pack',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/short-packs/${pack.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title.en).toBe('Detail Pack');
      expect(body.shorts).toEqual([]);
    });

    it('should return pack by slug', async () => {
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'slug-test-pack',
        priceUsd: 499,
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Slug Test Pack',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/short-packs/slug-test-pack',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title.en).toBe('Slug Test Pack');
    });
  });

  describe('POST /api/short-packs/:id/shorts', () => {
    it('should add a short to a pack', async () => {
      // Create a short film (runtime <= 40 minutes)
      const [movie] = await db.insert(schema.movies).values({
        originalTitle: 'Test Short',
        runtime: 15,
      }).returning();

      await db.insert(schema.movieTranslations).values({
        movieId: movie.id,
        language: 'en',
        title: 'Test Short',
        overview: 'A test short film',
      });

      // Create a pack
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'shorts-pack',
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Shorts Pack',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/short-packs/${pack.id}/shorts`,
        headers: editorAuth.headers,
        payload: {
          movie_id: movie.id,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.shorts).toHaveLength(1);
      expect(body.shorts[0].movie.id).toBe(movie.id);
      expect(body.shorts[0].order).toBe(0);
    });

    it('should reject adding a feature film to a pack', async () => {
      // Create a feature film (runtime > 40 minutes)
      const [movie] = await db.insert(schema.movies).values({
        originalTitle: 'Test Feature',
        runtime: 120,
      }).returning();

      // Create a pack
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'shorts-only-pack',
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Shorts Only Pack',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/short-packs/${pack.id}/shorts`,
        headers: editorAuth.headers,
        payload: {
          movie_id: movie.id,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('not a short film');
    });
  });

  describe('PUT /api/short-packs/:id/reorder', () => {
    it('should reorder shorts in a pack', async () => {
      // Create two short films (runtime <= 40 minutes)
      const [short1] = await db.insert(schema.movies).values({
        originalTitle: 'Short 1',
        runtime: 15,
      }).returning();

      const [short2] = await db.insert(schema.movies).values({
        originalTitle: 'Short 2',
        runtime: 20,
      }).returning();

      await db.insert(schema.movieTranslations).values([
        { movieId: short1.id, language: 'en', title: 'Short 1', overview: '' },
        { movieId: short2.id, language: 'en', title: 'Short 2', overview: '' },
      ]);

      // Create a pack with both shorts
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'reorder-pack',
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Reorder Pack',
      });

      await db.insert(schema.shortPackItems).values([
        { packId: pack.id, movieId: short1.id, order: 0 },
        { packId: pack.id, movieId: short2.id, order: 1 },
      ]);

      // Reorder: swap positions
      const response = await app.inject({
        method: 'PUT',
        url: `/api/short-packs/${pack.id}/reorder`,
        headers: editorAuth.headers,
        payload: {
          shorts: [
            { movie_id: short1.id, order: 1 },
            { movie_id: short2.id, order: 0 },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.shorts[0].movie.original_title).toBe('Short 2');
      expect(body.shorts[1].movie.original_title).toBe('Short 1');
    });
  });

  describe('DELETE /api/short-packs/:id', () => {
    it('should delete a pack', async () => {
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'delete-pack',
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Delete Pack',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/short-packs/${pack.id}`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(200);

      // Verify it's deleted
      const [deleted] = await db.select()
        .from(schema.shortPacks)
        .where(eq(schema.shortPacks.id, pack.id));
      expect(deleted).toBeUndefined();
    });

    it('should return 404 for non-existent pack', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/short-packs/00000000-0000-0000-0000-000000000000',
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should cascade delete pack items and translations', async () => {
      // Create a short film (runtime <= 40 minutes)
      const [movie] = await db.insert(schema.movies).values({
        originalTitle: 'Cascade Test Short',
        runtime: 25,
      }).returning();

      await db.insert(schema.movieTranslations).values({
        movieId: movie.id,
        language: 'en',
        title: 'Cascade Test Short',
        overview: '',
      });

      // Create a pack with the short
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'cascade-delete-pack',
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Cascade Delete Pack',
      });

      await db.insert(schema.shortPackItems).values({
        packId: pack.id,
        movieId: movie.id,
        order: 0,
      });

      // Delete the pack
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/short-packs/${pack.id}`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(200);

      // Verify translations are deleted
      const translations = await db.select()
        .from(schema.shortPackTranslations)
        .where(eq(schema.shortPackTranslations.packId, pack.id));
      expect(translations).toHaveLength(0);

      // Verify items are deleted
      const items = await db.select()
        .from(schema.shortPackItems)
        .where(eq(schema.shortPackItems.packId, pack.id));
      expect(items).toHaveLength(0);

      // Verify movie still exists (not cascade deleted)
      const [movieStillExists] = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, movie.id));
      expect(movieStillExists).toBeDefined();
    });
  });

  describe('PUT /api/short-packs/:id', () => {
    it('should update pack metadata', async () => {
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'update-pack',
        priceUsd: 499,
        isPublished: false,
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Original Title',
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/short-packs/${pack.id}`,
        headers: editorAuth.headers,
        payload: {
          title: { en: 'Updated Title', lo: 'ຊື່ໃໝ່' },
          price_usd: 699,
          is_published: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title.en).toBe('Updated Title');
      expect(body.title.lo).toBe('ຊື່ໃໝ່');
      expect(body.price_usd).toBe(699);
      expect(body.is_published).toBe(true);
    });

    it('should return 404 for non-existent pack', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/short-packs/00000000-0000-0000-0000-000000000000',
        headers: editorAuth.headers,
        payload: {
          title: { en: 'Updated Title' },
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/short-packs/:id/shorts/:movieId', () => {
    it('should remove a short from a pack', async () => {
      // Create a short film (runtime <= 40 minutes)
      const [movie] = await db.insert(schema.movies).values({
        originalTitle: 'Remove Test Short',
        runtime: 18,
      }).returning();

      await db.insert(schema.movieTranslations).values({
        movieId: movie.id,
        language: 'en',
        title: 'Remove Test Short',
        overview: '',
      });

      // Create a pack with the short
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'remove-short-pack',
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Remove Short Pack',
      });

      await db.insert(schema.shortPackItems).values({
        packId: pack.id,
        movieId: movie.id,
        order: 0,
      });

      // Remove the short
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/short-packs/${pack.id}/shorts/${movie.id}`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.shorts).toHaveLength(0);
    });

    it('should return 404 for non-existent short in pack', async () => {
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'empty-pack',
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Empty Pack',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/short-packs/${pack.id}/shorts/00000000-0000-0000-0000-000000000000`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Short pack with runtime calculation', () => {
    it('should calculate total runtime from shorts', async () => {
      // Create shorts with different runtimes (all <= 40 minutes)
      const [short1] = await db.insert(schema.movies).values({
        originalTitle: 'Short 1',
        runtime: 10,
      }).returning();

      const [short2] = await db.insert(schema.movies).values({
        originalTitle: 'Short 2',
        runtime: 15,
      }).returning();

      const [short3] = await db.insert(schema.movies).values({
        originalTitle: 'Short 3',
        runtime: 20,
      }).returning();

      await db.insert(schema.movieTranslations).values([
        { movieId: short1.id, language: 'en', title: 'Short 1', overview: '' },
        { movieId: short2.id, language: 'en', title: 'Short 2', overview: '' },
        { movieId: short3.id, language: 'en', title: 'Short 3', overview: '' },
      ]);

      // Create a pack with all shorts
      const [pack] = await db.insert(schema.shortPacks).values({
        slug: 'runtime-pack',
      }).returning();

      await db.insert(schema.shortPackTranslations).values({
        packId: pack.id,
        language: 'en',
        title: 'Runtime Pack',
      });

      await db.insert(schema.shortPackItems).values([
        { packId: pack.id, movieId: short1.id, order: 0 },
        { packId: pack.id, movieId: short2.id, order: 1 },
        { packId: pack.id, movieId: short3.id, order: 2 },
      ]);

      // Get the pack and verify runtime
      const response = await app.inject({
        method: 'GET',
        url: `/api/short-packs/${pack.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total_runtime).toBe(45); // 10 + 15 + 20
      expect(body.short_count).toBe(3);
    });
  });
});
