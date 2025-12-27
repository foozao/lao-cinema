// Tests for movie subtitle routes
import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { createMinimalMovie } from '../test/helpers.js';
import { db, schema } from '../db/index.js';
import type { FastifyInstance } from 'fastify';

describe('Movie Subtitle Routes', () => {
  let app: FastifyInstance;
  let editorAuth: { headers: { authorization: string }; userId: string };
  let movieId: string;

  beforeEach(async () => {
    app = await build({ includeAuth: true, includeSubtitles: true });
    
    // Clean up auth data
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    
    // Create editor user (has permission for subtitle operations)
    editorAuth = await createTestEditor();
    
    // Create a test movie
    const movieData = createMinimalMovie();
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/movies',
      headers: editorAuth.headers,
      payload: movieData,
    });
    
    if (createResponse.statusCode !== 201) {
      throw new Error(`Failed to create test movie: ${createResponse.statusCode}`);
    }
    
    const created = JSON.parse(createResponse.body);
    movieId = created.id;
  });

  describe('GET /api/movies/:id/subtitles', () => {
    it('should return empty array when no subtitles exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/movies/${movieId}/subtitles`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);
    });

    it('should return subtitles ordered by language', async () => {
      // Create two subtitles
      await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'lo',
          label: 'ລາວ',
          url: 'https://example.com/subtitles/movie-lo.vtt',
          isDefault: false,
        },
      });

      await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'en',
          label: 'English',
          url: 'https://example.com/subtitles/movie-en.vtt',
          isDefault: true,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/movies/${movieId}/subtitles`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      // Should be ordered by language (en before lo)
      expect(body[0].language).toBe('en');
      expect(body[1].language).toBe('lo');
    });
  });

  describe('POST /api/movies/:id/subtitles', () => {
    it('should require admin/editor authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        payload: {
          language: 'en',
          label: 'English',
          url: 'https://example.com/subtitles/movie-en.vtt',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create a subtitle track', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'en',
          label: 'English',
          url: 'https://example.com/subtitles/movie-en.vtt',
          isDefault: true,
          kind: 'subtitles',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.language).toBe('en');
      expect(body.label).toBe('English');
      expect(body.url).toBe('https://example.com/subtitles/movie-en.vtt');
      expect(body.isDefault).toBe(true);
      expect(body.kind).toBe('subtitles');
    });

    it('should create a captions track', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'en',
          label: 'English (SDH)',
          url: 'https://example.com/subtitles/movie-en-sdh.vtt',
          kind: 'captions',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.kind).toBe('captions');
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'en',
          // Missing label and url
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate URL format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'en',
          label: 'English',
          url: 'not-a-valid-url',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should unset existing default when setting new default for same language', async () => {
      // Create first subtitle as default
      const first = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'en',
          label: 'English',
          url: 'https://example.com/subtitles/movie-en.vtt',
          isDefault: true,
        },
      });
      expect(first.statusCode).toBe(201);
      const firstBody = JSON.parse(first.body);

      // Create second subtitle as default for same language
      const second = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'en',
          label: 'English (Alternate)',
          url: 'https://example.com/subtitles/movie-en-alt.vtt',
          isDefault: true,
        },
      });
      expect(second.statusCode).toBe(201);

      // Check that first is no longer default
      const list = await app.inject({
        method: 'GET',
        url: `/api/movies/${movieId}/subtitles`,
      });
      const listBody = JSON.parse(list.body);
      
      const firstTrack = listBody.find((t: any) => t.id === firstBody.id);
      expect(firstTrack.isDefault).toBe(false);
    });
  });

  describe('PUT /api/movies/:id/subtitles/:trackId', () => {
    let trackId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'en',
          label: 'English',
          url: 'https://example.com/subtitles/movie-en.vtt',
        },
      });
      const body = JSON.parse(response.body);
      trackId = body.id;
    });

    it('should require admin/editor authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/movies/${movieId}/subtitles/${trackId}`,
        payload: {
          label: 'Updated English',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should update subtitle track', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/movies/${movieId}/subtitles/${trackId}`,
        headers: editorAuth.headers,
        payload: {
          label: 'English (Updated)',
          isDefault: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.label).toBe('English (Updated)');
      expect(body.isDefault).toBe(true);
    });

    it('should return 404 for non-existent track', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/movies/${movieId}/subtitles/00000000-0000-0000-0000-000000000000`,
        headers: editorAuth.headers,
        payload: {
          label: 'Test',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/movies/:id/subtitles/:trackId', () => {
    let trackId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/subtitles`,
        headers: editorAuth.headers,
        payload: {
          language: 'en',
          label: 'English',
          url: 'https://example.com/subtitles/movie-en.vtt',
        },
      });
      const body = JSON.parse(response.body);
      trackId = body.id;
    });

    it('should require admin/editor authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${movieId}/subtitles/${trackId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should delete subtitle track', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${movieId}/subtitles/${trackId}`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(204);

      // Verify it's deleted
      const list = await app.inject({
        method: 'GET',
        url: `/api/movies/${movieId}/subtitles`,
      });
      const listBody = JSON.parse(list.body);
      expect(listBody).toHaveLength(0);
    });

    it('should return 404 for non-existent track', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${movieId}/subtitles/00000000-0000-0000-0000-000000000000`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
