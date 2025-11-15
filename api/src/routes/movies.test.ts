// Tests for movie routes
import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { createSampleMovie, createMinimalMovie } from '../test/helpers.js';
import type { FastifyInstance } from 'fastify';

describe('Movie Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build();
  });

  describe('GET /api/movies', () => {
    it('should return empty array when no movies exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/movies',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.movies).toEqual([]);
    });

    it('should return all movies', async () => {
      // Create a movie first
      const movieData = createMinimalMovie();
      await app.inject({
        method: 'POST',
        url: '/api/movies',
        payload: movieData,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/movies',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.movies).toHaveLength(1);
      expect(body.movies[0].title).toEqual(movieData.title);
    });
  });

  describe('POST /api/movies', () => {
    it('should create a movie with minimal data', async () => {
      const movieData = createMinimalMovie();

      const response = await app.inject({
        method: 'POST',
        url: '/api/movies',
        payload: movieData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.title).toEqual(movieData.title);
      expect(body.created_at).toBeDefined();
    });

    it('should create a movie with full TMDB data', async () => {
      const movieData = createSampleMovie();

      const response = await app.inject({
        method: 'POST',
        url: '/api/movies',
        payload: movieData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.tmdb_id).toBe(550);
      expect(body.title.en).toBe('Fight Club');
      expect(body.title.lo).toBe('ສະໂມສອນ');
      expect(body.genres).toHaveLength(1);
      expect(body.cast).toHaveLength(1);
    });

    it('should handle bilingual content correctly', async () => {
      const movieData = createMinimalMovie({
        title: { en: 'English Title', lo: 'ຊື່ພາສາລາວ' },
        overview: { en: 'English overview', lo: 'ພາສາລາວ' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/movies',
        payload: movieData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.title.en).toBe('English Title');
      expect(body.title.lo).toBe('ຊື່ພາສາລາວ');
      expect(body.overview.lo).toBe('ພາສາລາວ');
    });
  });

  describe('GET /api/movies/:id', () => {
    it('should return a movie by ID', async () => {
      // Create a movie
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/movies',
        payload: createMinimalMovie(),
      });
      const created = JSON.parse(createResponse.body);

      // Get the movie
      const response = await app.inject({
        method: 'GET',
        url: `/api/movies/${created.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(created.id);
      expect(body.title).toEqual(created.title);
    });

    it('should return 404 for non-existent movie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/movies/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Movie not found');
    });
  });

  describe('PUT /api/movies/:id', () => {
    it('should update a movie', async () => {
      // Create a movie
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/movies',
        payload: createMinimalMovie(),
      });
      const created = JSON.parse(createResponse.body);

      // Update the movie
      const updates = {
        title: { en: 'Updated Title', lo: 'ຊື່ໃໝ່' },
        runtime: 150,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/movies/${created.id}`,
        payload: updates,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title.en).toBe('Updated Title');
      expect(body.title.lo).toBe('ຊື່ໃໝ່');
      expect(body.runtime).toBe(150);
    });

    it('should return 404 when updating non-existent movie', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/movies/00000000-0000-0000-0000-000000000000',
        payload: { title: { en: 'Test' } },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/movies/:id', () => {
    it('should delete a movie', async () => {
      // Create a movie
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/movies',
        payload: createMinimalMovie(),
      });
      const created = JSON.parse(createResponse.body);

      // Delete the movie
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${created.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Movie deleted successfully');
      expect(body.id).toBe(created.id);

      // Verify it's deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/movies/${created.id}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 when deleting non-existent movie', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/movies/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
