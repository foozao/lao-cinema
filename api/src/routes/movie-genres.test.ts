import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestAdmin, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Movie Genres Routes', () => {
  let testMovieId: string;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(schema.movieGenres);
    await db.delete(schema.genreTranslations);
    await db.delete(schema.genres);
    await db.delete(schema.movieTranslations);
    await db.delete(schema.movies);

    // Generate UUID for test movie
    testMovieId = randomUUID();

    // Create test movie
    await db.insert(schema.movies).values({
      id: testMovieId,
      tmdbId: 12345,
      originalTitle: 'Test Movie',
    });

    // Create test genres
    await db.insert(schema.genres).values([
      { id: 28, isVisible: true },
      { id: 35, isVisible: true },
    ]);

    await db.insert(schema.genreTranslations).values([
      { genreId: 28, language: 'en', name: 'Action' },
      { genreId: 35, language: 'en', name: 'Comedy' },
    ]);
  });

  describe('POST /api/movies/:id/genres', () => {
    it('should return 401 when not authenticated', async () => {
      const app = await build({ includeMovieGenres: true });
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${testMovieId}/genres`,
        payload: { genreId: 28 },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should add a genre to a movie when authenticated as editor', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${testMovieId}/genres`,
        headers,
        payload: { genreId: 28 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Genre added to movie');
      expect(body.genre.id).toBe(28);
      expect(body.genre.name.en).toBe('Action');

      // Verify in database
      const movieGenres = await db.select()
        .from(schema.movieGenres)
        .where(and(
          eq(schema.movieGenres.movieId, testMovieId),
          eq(schema.movieGenres.genreId, 28)
        ));
      expect(movieGenres).toHaveLength(1);
    });

    it('should add a genre to a movie when authenticated as admin', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${testMovieId}/genres`,
        headers,
        payload: { genreId: 28 },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 for non-existent movie', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestEditor();

      // Use a valid UUID format that doesn't exist in DB
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${nonExistentId}/genres`,
        headers,
        payload: { genreId: 28 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent genre', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${testMovieId}/genres`,
        headers,
        payload: { genreId: 999 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 when genreId is not a number', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${testMovieId}/genres`,
        headers,
        payload: { genreId: 'action' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle adding the same genre twice gracefully', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestEditor();

      // Add genre first time
      await app.inject({
        method: 'POST',
        url: `/api/movies/${testMovieId}/genres`,
        headers,
        payload: { genreId: 28 },
      });

      // Add genre second time - should still succeed (upsert behavior)
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${testMovieId}/genres`,
        headers,
        payload: { genreId: 28 },
      });

      expect(response.statusCode).toBe(200);

      // Should still only have one entry
      const movieGenres = await db.select()
        .from(schema.movieGenres)
        .where(eq(schema.movieGenres.movieId, testMovieId));
      expect(movieGenres).toHaveLength(1);
    });
  });

  describe('DELETE /api/movies/:id/genres/:genreId', () => {
    beforeEach(async () => {
      // Add genre to movie
      await db.insert(schema.movieGenres).values({
        movieId: testMovieId,
        genreId: 28,
      });
    });

    it('should return 401 when not authenticated', async () => {
      const app = await build({ includeMovieGenres: true });
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${testMovieId}/genres/28`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should remove a genre from a movie when authenticated as editor', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestEditor();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${testMovieId}/genres/28`,
        headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Genre removed from movie');

      // Verify in database
      const movieGenres = await db.select()
        .from(schema.movieGenres)
        .where(and(
          eq(schema.movieGenres.movieId, testMovieId),
          eq(schema.movieGenres.genreId, 28)
        ));
      expect(movieGenres).toHaveLength(0);
    });

    it('should remove a genre from a movie when authenticated as admin', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestAdmin();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${testMovieId}/genres/28`,
        headers,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 for non-existent movie', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestEditor();

      // Use a valid UUID format that doesn't exist in DB
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${nonExistentId}/genres/28`,
        headers,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should succeed even if genre is not assigned (idempotent)', async () => {
      const app = await build({ includeAuth: true, includeMovieGenres: true });
      const { headers } = await createTestEditor();

      // Remove genre that was never added (genreId 35)
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${testMovieId}/genres/35`,
        headers,
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
