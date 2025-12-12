import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { createSampleMovie } from '../test/helpers.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

describe('Movie-Production Company Association Routes', () => {
  let app: FastifyInstance;
  let movieId: string;
  let editorAuth: { headers: { authorization: string }, userId: string };

  beforeEach(async () => {
    app = await build({ includeProductionCompanies: true, includeAuth: true });
    
    // Clean up auth data and create editor
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    editorAuth = await createTestEditor();
    
    // Clean up test data
    await db.delete(schema.movieProductionCompanies);
    await db.delete(schema.productionCompanyTranslations);
    await db.delete(schema.productionCompanies);
    
    // Create a test movie via API
    const movieData = createSampleMovie();
    const response = await app.inject({
      method: 'POST',
      url: '/api/movies',
      headers: editorAuth.headers,
      payload: movieData,
    });
    const movie = JSON.parse(response.body);
    movieId = movie.id;
    
    // Create test production companies
    await db.insert(schema.productionCompanies).values([
      { id: 1, logoPath: '/logo1.png', originCountry: 'LA' },
      { id: 2, logoPath: null, originCountry: 'US' },
    ]);
    
    await db.insert(schema.productionCompanyTranslations).values([
      { companyId: 1, language: 'en', name: 'Lao Art Media' },
      { companyId: 2, language: 'en', name: 'Test Studios' },
    ]);
  });

  describe('POST /api/movies/:movieId/production-companies', () => {
    it('should add a production company to a movie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/production-companies`,
        headers: editorAuth.headers,
        payload: {
          company_id: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.company.id).toBe(1);
      expect(body.company.name.en).toBe('Lao Art Media');
      expect(body.order).toBeDefined();

      // Verify in database
      const associations = await db.select()
        .from(schema.movieProductionCompanies)
        .where(eq(schema.movieProductionCompanies.movieId, movieId));
      expect(associations).toHaveLength(1);
      expect(associations[0].companyId).toBe(1);
    });

    it('should add production company with custom order', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/production-companies`,
        headers: editorAuth.headers,
        payload: {
          company_id: 1,
          order: 5,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.order).toBe(5);
    });

    it('should auto-calculate order if not provided', async () => {
      // Add first company
      await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/production-companies`,
        headers: editorAuth.headers,
        payload: { company_id: 1 },
      });

      // Add second company without order
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/production-companies`,
        headers: editorAuth.headers,
        payload: { company_id: 2 },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.order).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent movie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/movies/00000000-0000-0000-0000-000000000000/production-companies',
        headers: editorAuth.headers,
        payload: { company_id: 1 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent production company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/production-companies`,
        headers: editorAuth.headers,
        payload: { company_id: 999 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle duplicate associations gracefully', async () => {
      // Add company first time
      await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/production-companies`,
        headers: editorAuth.headers,
        payload: { company_id: 1 },
      });

      // Try to add same company again
      const response = await app.inject({
        method: 'POST',
        url: `/api/movies/${movieId}/production-companies`,
        headers: editorAuth.headers,
        payload: { company_id: 1 },
      });

      // Should succeed (onConflictDoNothing)
      expect(response.statusCode).toBe(201);
    });
  });

  describe('DELETE /api/movies/:movieId/production-companies/:companyId', () => {
    it('should remove a production company from a movie', async () => {
      // Add a production company to the movie first
      await db.insert(schema.movieProductionCompanies).values({
        movieId,
        companyId: 1,
        order: 0,
      });


      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${movieId}/production-companies/1`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify deletion
      const associations = await db.select()
        .from(schema.movieProductionCompanies)
        .where(eq(schema.movieProductionCompanies.movieId, movieId));
      expect(associations).toHaveLength(0);
    });

    it('should return 404 for non-associated company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/movies/${movieId}/production-companies/2`,
        headers: editorAuth.headers,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/movies/:movieId/production-companies/:companyId', () => {
    it('should update production company order', async () => {
      // Add a production company to the movie first
      await db.insert(schema.movieProductionCompanies).values({
        movieId,
        companyId: 1,
        order: 0,
      });


      const response = await app.inject({
        method: 'PATCH',
        url: `/api/movies/${movieId}/production-companies/1`,
        headers: editorAuth.headers,
        payload: { order: 5 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.order).toBe(5);

      // Verify in database
      const associations = await db.select()
        .from(schema.movieProductionCompanies)
        .where(eq(schema.movieProductionCompanies.movieId, movieId));
      expect(associations[0].order).toBe(5);
    });

    it('should return 404 for non-associated company', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/movies/${movieId}/production-companies/2`,
        headers: editorAuth.headers,
        payload: { order: 5 },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
