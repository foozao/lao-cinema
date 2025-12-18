/**
 * Homepage Routes Tests
 * 
 * Tests for featured films aggregation endpoint.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

describe('Homepage Routes', () => {
  let app: FastifyInstance;
  let testMovieId1: string;
  let testMovieId2: string;
  let editorAuth: { headers: { authorization: string }, userId: string };

  beforeEach(async () => {
    app = await build({ includeHomepage: true, includeAuth: true });
    
    // Clean up auth data and create editor
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    editorAuth = await createTestEditor();
    
    // Clean up test data
    await db.delete(schema.homepageFeatured);
    await db.delete(schema.movieTranslations);
    await db.delete(schema.movies);
    
    // Create test movies
    const [movie1] = await db.insert(schema.movies).values({
      originalTitle: 'Test Movie 1',
      releaseDate: '2024-01-01',
      posterPath: '/poster1.jpg',
    }).returning();
    testMovieId1 = movie1.id;

    const [movie2] = await db.insert(schema.movies).values({
      originalTitle: 'Test Movie 2',
      releaseDate: '2024-02-01',
      posterPath: '/poster2.jpg',
    }).returning();
    testMovieId2 = movie2.id;

    // Add translations
    await db.insert(schema.movieTranslations).values([
      { movieId: testMovieId1, language: 'en', title: 'Test Movie 1', overview: 'Overview 1' },
      { movieId: testMovieId1, language: 'lo', title: 'ຮູບເງົາທົດສອບ 1', overview: 'ພາບລວມ 1' },
      { movieId: testMovieId2, language: 'en', title: 'Test Movie 2', overview: 'Overview 2' },
    ]);
  });

  afterEach(async () => {
    await db.delete(schema.homepageFeatured);
    await db.delete(schema.movieTranslations);
    await db.delete(schema.movies).where(eq(schema.movies.id, testMovieId1));
    await db.delete(schema.movies).where(eq(schema.movies.id, testMovieId2));
  });

  // =============================================================================
  // GET FEATURED FILMS
  // =============================================================================

  describe('GET /api/homepage/featured', () => {
    it('should return empty array when no featured films', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/homepage/featured',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.movies).toEqual([]);
    });

    it('should return featured films with full movie data', async () => {
      // Add featured film
      await db.insert(schema.homepageFeatured).values({
        movieId: testMovieId1,
        order: 0,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/homepage/featured',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.movies).toHaveLength(1);
      expect(body.movies[0].id).toBe(testMovieId1);
      expect(body.movies[0].title.en).toBe('Test Movie 1');
      expect(body.movies[0].title.lo).toBe('ຮູບເງົາທົດສອບ 1');
    });

    it('should return films in correct order', async () => {
      // Add featured films in reverse order
      await db.insert(schema.homepageFeatured).values([
        { movieId: testMovieId2, order: 0 },
        { movieId: testMovieId1, order: 1 },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/homepage/featured',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.movies).toHaveLength(2);
      expect(body.movies[0].id).toBe(testMovieId2); // Order 0 first
      expect(body.movies[1].id).toBe(testMovieId1); // Order 1 second
    });
  });

  // =============================================================================
  // GET FEATURED (ADMIN)
  // =============================================================================

  describe('GET /api/homepage/featured/admin', () => {
    it('should return featured entries with movie details', async () => {
      await db.insert(schema.homepageFeatured).values({
        movieId: testMovieId1,
        order: 0,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/homepage/featured/admin',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.featured).toHaveLength(1);
      expect(body.featured[0].movieId).toBe(testMovieId1);
      expect(body.featured[0].order).toBe(0);
      expect(body.featured[0].movie.title.en).toBe('Test Movie 1');
    });
  });

  // =============================================================================
  // ADD FEATURED FILM
  // =============================================================================

  describe('POST /api/homepage/featured', () => {
    it('should add a film to featured', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/homepage/featured',
        headers: editorAuth.headers,
        payload: {
          movieId: testMovieId1,
          order: 0,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.movieId).toBe(testMovieId1);
      expect(body.order).toBe(0);
    });

    it('should return 404 for non-existent movie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/homepage/featured',
        headers: editorAuth.headers,
        payload: {
          movieId: '00000000-0000-0000-0000-000000000000',
          order: 0,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Movie not found');
    });

    it('should return 400 if movie already featured', async () => {
      // Add first time
      await app.inject({
        method: 'POST',
        url: '/api/homepage/featured',
        headers: editorAuth.headers,
        payload: {
          movieId: testMovieId1,
          order: 0,
        },
      });

      // Try to add again
      const response = await app.inject({
        method: 'POST',
        url: '/api/homepage/featured',
        headers: editorAuth.headers,
        payload: {
          movieId: testMovieId1,
          order: 1,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Movie is already featured');
    });
  });

  // =============================================================================
  // REORDER FEATURED FILMS
  // =============================================================================

  describe('PUT /api/homepage/featured/reorder', () => {
    it('should update order of featured films', async () => {
      // Add featured films
      const [featured1] = await db.insert(schema.homepageFeatured).values({
        movieId: testMovieId1,
        order: 0,
      }).returning();
      const [featured2] = await db.insert(schema.homepageFeatured).values({
        movieId: testMovieId2,
        order: 1,
      }).returning();

      // Swap order
      const response = await app.inject({
        method: 'PUT',
        url: '/api/homepage/featured/reorder',
        headers: editorAuth.headers,
        payload: {
          items: [
            { id: featured1.id, order: 1 },
            { id: featured2.id, order: 0 },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify order changed
      const getResponse = await app.inject({
        method: 'GET',
        url: '/api/homepage/featured',
      });
      const getBody = JSON.parse(getResponse.body);
      expect(getBody.movies[0].id).toBe(testMovieId2); // Now first
      expect(getBody.movies[1].id).toBe(testMovieId1); // Now second
    });
  });

  // =============================================================================
  // REMOVE FEATURED FILM
  // =============================================================================

  describe('DELETE /api/homepage/featured/:id', () => {
    it('should remove a film from featured', async () => {
      // Add featured
      const [featured] = await db.insert(schema.homepageFeatured).values({
        movieId: testMovieId1,
        order: 0,
      }).returning();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/homepage/featured/${featured.id}`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify removed
      const getResponse = await app.inject({
        method: 'GET',
        url: '/api/homepage/featured',
      });
      const getBody = JSON.parse(getResponse.body);
      expect(getBody.movies).toEqual([]);
    });

    it('should return 404 for non-existent featured', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/homepage/featured/00000000-0000-0000-0000-000000000000',
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Featured film not found');
    });
  });
});
