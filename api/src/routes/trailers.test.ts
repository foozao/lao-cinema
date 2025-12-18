// Tests for trailer routes
import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { createMinimalMovie } from '../test/helpers.js';
import { db, schema } from '../db/index.js';
import type { FastifyInstance } from 'fastify';

describe('Trailer Routes', () => {
  let app: FastifyInstance;
  let editorAuth: { headers: { authorization: string }; userId: string };
  let movieId: string;

  beforeEach(async () => {
    app = await build({ includeAuth: true, includeTrailers: true });
    
    // Clean up auth data
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    
    // Create editor user (has permission for trailer operations)
    editorAuth = await createTestEditor();
    
    // Create a test movie
    const movieData = createMinimalMovie();
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/movies',
      headers: editorAuth.headers,
      payload: movieData,
    });
    const created = JSON.parse(createResponse.body);
    movieId = created.id;
  });

  describe('GET /api/trailers/:movieId', () => {
    it('should return empty array when no trailers exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/trailers/${movieId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);
    });

    it('should return 404 for non-existent movie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/trailers/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Movie not found');
    });

    it('should return trailers ordered by order field', async () => {
      // Create two trailers
      await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          youtube_key: 'abc123',
          name: 'Trailer 2',
          order: 1,
        },
      });

      await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          youtube_key: 'xyz789',
          name: 'Trailer 1',
          order: 0,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/trailers/${movieId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      expect(body[0].name).toBe('Trailer 1');
      expect(body[1].name).toBe('Trailer 2');
    });
  });

  describe('POST /api/trailers/:movieId', () => {
    it('should require admin authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        payload: {
          type: 'youtube',
          youtube_key: 'abc123',
          name: 'Test Trailer',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create a YouTube trailer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          youtube_key: 'dQw4w9WgXcQ',
          name: 'Official Trailer',
          official: true,
          language: 'en',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.type).toBe('youtube');
      expect(body.youtubeKey).toBe('dQw4w9WgXcQ');
      expect(body.name).toBe('Official Trailer');
      expect(body.official).toBe(true);
      expect(body.language).toBe('en');
    });

    it('should create a video trailer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'video',
          video_url: 'https://example.com/trailer.mp4',
          video_format: 'mp4',
          video_quality: '1080p',
          name: 'HD Trailer',
          size_bytes: 104857600,
          width: 1920,
          height: 1080,
          duration_seconds: 120,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('video');
      expect(body.videoUrl).toBe('https://example.com/trailer.mp4');
      expect(body.videoFormat).toBe('mp4');
      expect(body.videoQuality).toBe('1080p');
      expect(body.sizeBytes).toBe(104857600);
    });

    it('should return 404 for non-existent movie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/trailers/00000000-0000-0000-0000-000000000000',
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          youtube_key: 'abc123',
          name: 'Test Trailer',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should validate trailer data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          // missing required youtube_key
          name: 'Test Trailer',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.detail).toBe('Invalid trailer data');
    });

    it('should validate video trailer has required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'video',
          name: 'Test Trailer',
          // missing required video_url, video_format, video_quality
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/trailers/:trailerId', () => {
    let trailerId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          youtube_key: 'abc123',
          name: 'Original Name',
          official: false,
        },
      });
      const created = JSON.parse(createResponse.body);
      trailerId = created.id;
    });

    it('should require admin authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/trailers/${trailerId}`,
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should update trailer name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/trailers/${trailerId}`,
        headers: editorAuth.headers,
        payload: {
          name: 'Updated Trailer Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Updated Trailer Name');
    });

    it('should update multiple fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/trailers/${trailerId}`,
        headers: editorAuth.headers,
        payload: {
          name: 'Updated Name',
          official: true,
          language: 'lo',
          order: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Updated Name');
      expect(body.official).toBe(true);
      expect(body.language).toBe('lo');
      expect(body.order).toBe(5);
    });

    it('should return 404 for non-existent trailer', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/trailers/00000000-0000-0000-0000-000000000000',
        headers: editorAuth.headers,
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/trailers/:trailerId', () => {
    let trailerId: string;

    beforeEach(async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          youtube_key: 'abc123',
          name: 'Trailer to Delete',
        },
      });
      const created = JSON.parse(createResponse.body);
      trailerId = created.id;
    });

    it('should require admin authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/trailers/${trailerId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should delete a trailer', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/trailers/${trailerId}`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.deleted.id).toBe(trailerId);

      // Verify trailer is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/trailers/${movieId}`,
      });
      const trailers = JSON.parse(getResponse.body);
      expect(trailers).toHaveLength(0);
    });

    it('should return 404 for non-existent trailer', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/trailers/00000000-0000-0000-0000-000000000000',
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/trailers/:movieId/reorder', () => {
    let trailer1Id: string;
    let trailer2Id: string;
    let trailer3Id: string;

    beforeEach(async () => {
      // Create three trailers
      const create1 = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          youtube_key: 'trailer1',
          name: 'Trailer 1',
          order: 0,
        },
      });
      trailer1Id = JSON.parse(create1.body).id;

      const create2 = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          youtube_key: 'trailer2',
          name: 'Trailer 2',
          order: 1,
        },
      });
      trailer2Id = JSON.parse(create2.body).id;

      const create3 = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}`,
        headers: editorAuth.headers,
        payload: {
          type: 'youtube',
          youtube_key: 'trailer3',
          name: 'Trailer 3',
          order: 2,
        },
      });
      trailer3Id = JSON.parse(create3.body).id;
    });

    it('should require admin authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}/reorder`,
        payload: {
          trailer_ids: [trailer3Id, trailer1Id, trailer2Id],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reorder trailers', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}/reorder`,
        headers: editorAuth.headers,
        payload: {
          trailer_ids: [trailer3Id, trailer1Id, trailer2Id],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(3);
      expect(body[0].id).toBe(trailer3Id);
      expect(body[0].order).toBe(0);
      expect(body[1].id).toBe(trailer1Id);
      expect(body[1].order).toBe(1);
      expect(body[2].id).toBe(trailer2Id);
      expect(body[2].order).toBe(2);
    });

    it('should return 400 for invalid trailer_ids', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/trailers/${movieId}/reorder`,
        headers: editorAuth.headers,
        payload: {
          trailer_ids: 'not an array',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
