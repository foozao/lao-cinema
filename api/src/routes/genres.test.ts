import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestAdmin, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Genres Routes', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(schema.movieGenres);
    await db.delete(schema.genreTranslations);
    await db.delete(schema.genres);
  });

  describe('GET /api/genres', () => {
    it('should return 401 when not authenticated', async () => {
      const app = await build({ includeGenres: true });
      const response = await app.inject({
        method: 'GET',
        url: '/api/genres',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when authenticated as editor (not admin)', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'GET',
        url: '/api/genres',
        headers,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return genres when authenticated as admin', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create test genres
      await db.insert(schema.genres).values([
        { id: 28, isVisible: true },
        { id: 35, isVisible: false },
      ]);

      await db.insert(schema.genreTranslations).values([
        { genreId: 28, language: 'en', name: 'Action' },
        { genreId: 28, language: 'lo', name: 'ແອັກຊັ່ນ' },
        { genreId: 35, language: 'en', name: 'Comedy' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/genres',
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.genres).toHaveLength(2);
      expect(body.genres[0]).toMatchObject({
        id: 28,
        name: { en: 'Action', lo: 'ແອັກຊັ່ນ' },
        movieCount: 0,
      });
      expect(body.genres[0].isVisible).toBe(true);
      expect(body.genres[1]).toMatchObject({
        id: 35,
        name: { en: 'Comedy' },
        movieCount: 0,
      });
      expect(body.genres[1].isVisible).toBe(false);
    });

    it('should include movie count for each genre', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      // Create test genre
      await db.insert(schema.genres).values({ id: 28, isVisible: true });
      await db.insert(schema.genreTranslations).values({
        genreId: 28,
        language: 'en',
        name: 'Action',
      });

      // Create test movies and link to genre
      const movieId1 = randomUUID();
      const movieId2 = randomUUID();
      await db.insert(schema.movies).values([
        { id: movieId1, tmdbId: 1, originalTitle: 'Movie 1' },
        { id: movieId2, tmdbId: 2, originalTitle: 'Movie 2' },
      ]);

      await db.insert(schema.movieGenres).values([
        { movieId: movieId1, genreId: 28 },
        { movieId: movieId2, genreId: 28 },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/genres',
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.genres[0].movieCount).toBe(2);
    });
  });

  describe('POST /api/genres', () => {
    it('should return 401 when not authenticated', async () => {
      const app = await build({ includeGenres: true });
      const response = await app.inject({
        method: 'POST',
        url: '/api/genres',
        payload: { nameEn: 'New Genre' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when authenticated as editor', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'POST',
        url: '/api/genres',
        headers,
        payload: { nameEn: 'New Genre' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should create a custom genre with negative ID', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/genres',
        headers,
        payload: {
          nameEn: 'Lao Comedy',
          nameLo: 'ຕະຫຼົກລາວ',
          isVisible: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.genre.id).toBeLessThan(0); // Custom genres use negative IDs
      expect(body.genre.name).toEqual({ en: 'Lao Comedy', lo: 'ຕະຫຼົກລາວ' });

      // Verify in database
      const genres = await db.select()
        .from(schema.genres)
        .where(eq(schema.genres.id, body.genre.id));
      expect(genres).toHaveLength(1);
    });

    it('should create genre with only English name', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/genres',
        headers,
        payload: { nameEn: 'Documentary' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.genre.name).toEqual({ en: 'Documentary' });
    });

    it('should reject request without English name', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: '/api/genres',
        headers,
        payload: { nameLo: 'ລາວເທົ່ານັ້ນ' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should create multiple custom genres with sequential negative IDs', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response1 = await app.inject({
        method: 'POST',
        url: '/api/genres',
        headers,
        payload: { nameEn: 'Genre 1' },
      });
      const body1 = JSON.parse(response1.body);

      const response2 = await app.inject({
        method: 'POST',
        url: '/api/genres',
        headers,
        payload: { nameEn: 'Genre 2' },
      });
      const body2 = JSON.parse(response2.body);

      expect(body1.genre.id).toBe(-1);
      expect(body2.genre.id).toBe(-2);
    });
  });

  describe('PATCH /api/genres/:id/visibility', () => {
    it('should return 401 when not authenticated', async () => {
      const app = await build({ includeGenres: true });

      await db.insert(schema.genres).values({ id: 28, isVisible: true });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/genres/28/visibility',
        payload: { isVisible: false },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should toggle genre visibility', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      await db.insert(schema.genres).values({ id: 28, isVisible: true });
      await db.insert(schema.genreTranslations).values({
        genreId: 28,
        language: 'en',
        name: 'Action',
      });

      // Hide the genre
      const response1 = await app.inject({
        method: 'PATCH',
        url: '/api/genres/28/visibility',
        headers,
        payload: { isVisible: false },
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      expect(body1.genre.isVisible).toBe(false);

      // Show the genre again
      const response2 = await app.inject({
        method: 'PATCH',
        url: '/api/genres/28/visibility',
        headers,
        payload: { isVisible: true },
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.genre.isVisible).toBe(true);
    });

    it('should return 404 for non-existent genre', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/genres/999/visibility',
        headers,
        payload: { isVisible: false },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 when isVisible is not a boolean', async () => {
      const app = await build({ includeGenres: true, includeAuth: true });
      const { headers } = await createTestAdmin();

      await db.insert(schema.genres).values({ id: 28, isVisible: true });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/genres/28/visibility',
        headers,
        payload: { isVisible: 'yes' },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
