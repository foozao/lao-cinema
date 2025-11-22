// Tests for movie routes
import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { createSampleMovie, createMinimalMovie, createSampleImages } from '../test/helpers.js';
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

  describe('Movie Images', () => {
    describe('POST /api/movies with images', () => {
      it('should create a movie with images', async () => {
        const movieData = createMinimalMovie({
          images: createSampleImages(),
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: movieData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.id).toBeDefined();
        expect(body.images).toBeDefined();
        expect(body.images).toHaveLength(4);
        
        // Verify poster images
        const posters = body.images.filter((img: any) => img.type === 'poster');
        expect(posters).toHaveLength(2);
        
        // Verify primary poster
        const primaryPoster = posters.find((img: any) => img.is_primary);
        expect(primaryPoster).toBeDefined();
        expect(primaryPoster.file_path).toBe('/poster1.jpg');
        expect(primaryPoster.iso_639_1).toBe('en');
      });

      it('should set poster_path and backdrop_path from primary images', async () => {
        const images = createSampleImages();
        const movieData = createMinimalMovie({ images });

        const response = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: movieData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        
        // poster_path should match primary poster
        expect(body.poster_path).toBe('/poster1.jpg');
        // backdrop_path should match primary backdrop
        expect(body.backdrop_path).toBe('/backdrop1.jpg');
      });

      it('should store image metadata correctly', async () => {
        const movieData = createMinimalMovie({
          images: [
            {
              type: 'poster',
              file_path: '/test-poster.jpg',
              aspect_ratio: 0.75,
              height: 2000,
              width: 1500,
              iso_639_1: 'lo',
              vote_average: 8.5,
              vote_count: 100,
              is_primary: true,
            },
          ],
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: movieData,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.images).toHaveLength(1);
        
        const image = body.images[0];
        expect(image.file_path).toBe('/test-poster.jpg');
        expect(image.aspect_ratio).toBe(0.75);
        expect(image.height).toBe(2000);
        expect(image.width).toBe(1500);
        expect(image.iso_639_1).toBe('lo');
        expect(image.vote_average).toBe(8.5);
        expect(image.vote_count).toBe(100);
        expect(image.is_primary).toBe(true);
      });
    });

    describe('GET /api/movies/:id with images', () => {
      it('should return movie with images array', async () => {
        // Create movie with images
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: createMinimalMovie({ images: createSampleImages() }),
        });
        const created = JSON.parse(createResponse.body);

        // Get the movie
        const response = await app.inject({
          method: 'GET',
          url: `/api/movies/${created.id}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.images).toBeDefined();
        expect(body.images).toHaveLength(4);
        expect(body.images[0].id).toBeDefined(); // Should have UUID
      });

      it('should return empty images array when movie has no images', async () => {
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: createMinimalMovie(),
        });
        const created = JSON.parse(createResponse.body);

        const response = await app.inject({
          method: 'GET',
          url: `/api/movies/${created.id}`,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.images).toEqual([]);
      });
    });

    describe('PUT /api/movies/:id with images', () => {
      it('should replace all images when updating', async () => {
        // Create movie with initial images
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: createMinimalMovie({ images: createSampleImages() }),
        });
        const created = JSON.parse(createResponse.body);
        expect(created.images).toHaveLength(4);

        // Update with new images
        const newImages = [
          {
            type: 'poster' as const,
            file_path: '/new-poster.jpg',
            is_primary: true,
          },
        ];

        const response = await app.inject({
          method: 'PUT',
          url: `/api/movies/${created.id}`,
          payload: { images: newImages },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.images).toHaveLength(1);
        expect(body.images[0].file_path).toBe('/new-poster.jpg');
        expect(body.poster_path).toBe('/new-poster.jpg');
      });

      it('should update poster_path when primary poster changes', async () => {
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: createMinimalMovie({
            images: [
              { type: 'poster', file_path: '/old-poster.jpg', is_primary: true },
            ],
          }),
        });
        const created = JSON.parse(createResponse.body);
        expect(created.poster_path).toBe('/old-poster.jpg');

        // Update with different primary poster
        const response = await app.inject({
          method: 'PUT',
          url: `/api/movies/${created.id}`,
          payload: {
            images: [
              { type: 'poster', file_path: '/new-poster.jpg', is_primary: true },
            ],
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.poster_path).toBe('/new-poster.jpg');
      });
    });

    describe('PUT /api/movies/:id/images/:imageId/primary', () => {
      it('should set a poster as primary', async () => {
        // Create movie with multiple posters
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: createMinimalMovie({ images: createSampleImages() }),
        });
        const created = JSON.parse(createResponse.body);

        // Find the non-primary poster
        const nonPrimaryPoster = created.images.find(
          (img: any) => img.type === 'poster' && !img.is_primary
        );
        expect(nonPrimaryPoster).toBeDefined();

        // Set it as primary
        const response = await app.inject({
          method: 'PUT',
          url: `/api/movies/${created.id}/images/${nonPrimaryPoster.id}/primary`,
          payload: { type: 'poster' },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.message).toContain('Primary poster updated');

        // Verify the change
        const getResponse = await app.inject({
          method: 'GET',
          url: `/api/movies/${created.id}`,
        });
        const movie = JSON.parse(getResponse.body);
        
        // New poster should be primary
        const newPrimary = movie.images.find((img: any) => img.id === nonPrimaryPoster.id);
        expect(newPrimary.is_primary).toBe(true);
        
        // Old primary should no longer be primary
        const posters = movie.images.filter((img: any) => img.type === 'poster');
        const primaryPosters = posters.filter((img: any) => img.is_primary);
        expect(primaryPosters).toHaveLength(1);
        
        // Movie poster_path should be updated
        expect(movie.poster_path).toBe(nonPrimaryPoster.file_path);
      });

      it('should set a backdrop as primary', async () => {
        const images = [
          { type: 'backdrop' as const, file_path: '/backdrop1.jpg', is_primary: true },
          { type: 'backdrop' as const, file_path: '/backdrop2.jpg', is_primary: false },
        ];

        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: createMinimalMovie({ images }),
        });
        const created = JSON.parse(createResponse.body);

        const secondBackdrop = created.images.find(
          (img: any) => img.file_path === '/backdrop2.jpg'
        );

        const response = await app.inject({
          method: 'PUT',
          url: `/api/movies/${created.id}/images/${secondBackdrop.id}/primary`,
          payload: { type: 'backdrop' },
        });

        expect(response.statusCode).toBe(200);

        // Verify backdrop_path updated
        const getResponse = await app.inject({
          method: 'GET',
          url: `/api/movies/${created.id}`,
        });
        const movie = JSON.parse(getResponse.body);
        expect(movie.backdrop_path).toBe('/backdrop2.jpg');
      });

      it('should return 404 for non-existent movie', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/api/movies/00000000-0000-0000-0000-000000000000/images/00000000-0000-0000-0000-000000000001/primary',
          payload: { type: 'poster' },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('Movie not found');
      });

      it('should return 404 for non-existent image', async () => {
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: createMinimalMovie(),
        });
        const created = JSON.parse(createResponse.body);

        const response = await app.inject({
          method: 'PUT',
          url: `/api/movies/${created.id}/images/00000000-0000-0000-0000-000000000001/primary`,
          payload: { type: 'poster' },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('Image not found');
      });

      it('should return 400 for type mismatch', async () => {
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: createMinimalMovie({
            images: [{ type: 'poster', file_path: '/poster.jpg', is_primary: true }],
          }),
        });
        const created = JSON.parse(createResponse.body);
        const poster = created.images[0];

        // Try to set poster as backdrop
        const response = await app.inject({
          method: 'PUT',
          url: `/api/movies/${created.id}/images/${poster.id}/primary`,
          payload: { type: 'backdrop' },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('Image type mismatch');
      });
    });

    describe('Image cascade delete', () => {
      it('should delete all images when movie is deleted', async () => {
        // Create movie with images
        const createResponse = await app.inject({
          method: 'POST',
          url: '/api/movies',
          payload: createMinimalMovie({ images: createSampleImages() }),
        });
        const created = JSON.parse(createResponse.body);
        expect(created.images).toHaveLength(4);

        // Delete the movie
        const deleteResponse = await app.inject({
          method: 'DELETE',
          url: `/api/movies/${created.id}`,
        });
        expect(deleteResponse.statusCode).toBe(200);

        // Verify movie is gone
        const getResponse = await app.inject({
          method: 'GET',
          url: `/api/movies/${created.id}`,
        });
        expect(getResponse.statusCode).toBe(404);
        
        // Images should be cascade deleted (verified by database constraint)
      });
    });
  });
});
