/**
 * Awards Routes Tests
 * 
 * Tests awards system CRUD operations including shows, editions, categories, and nominations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';

describe('Awards Routes', () => {
  let editorAuth: { headers: { authorization: string }, userId: string };

  beforeEach(async () => {
    // Clean up test data in correct order (respecting foreign keys)
    await db.delete(schema.awardNominationTranslations);
    await db.delete(schema.awardNominations);
    await db.delete(schema.awardCategoryTranslations);
    await db.delete(schema.awardCategories);
    await db.delete(schema.awardEditionTranslations);
    await db.delete(schema.awardEditions);
    await db.delete(schema.awardShowTranslations);
    await db.delete(schema.awardShows);
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    
    // Create editor user for protected routes
    editorAuth = await createTestEditor();
  });

  describe('GET /api/awards/shows', () => {
    it('should return empty array when no shows exist', async () => {
      const app = await build({ includeAwards: true });
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/awards/shows',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.shows).toEqual([]);
    });

    it('should return all award shows with translations', async () => {
      const app = await build({ includeAwards: true });
      
      const [show] = await db.insert(schema.awardShows).values({
        slug: 'lpff',
        country: 'LA',
      }).returning();

      await db.insert(schema.awardShowTranslations).values({
        showId: show.id, 
        language: 'en', 
        name: 'Luang Prabang Film Festival',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/awards/shows',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.shows).toHaveLength(1);
      expect(body.shows[0].name.en).toBe('Luang Prabang Film Festival');
    });
  });

  describe('POST /api/awards/shows', () => {
    it('should require authentication', async () => {
      const app = await build({ includeAwards: true });
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/awards/shows',
        payload: { name: { en: 'New Awards' } },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create award show', async () => {
      const app = await build({ includeAwards: true, includeAuth: true });
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/awards/shows',
        ...editorAuth,
        payload: {
          slug: 'new-awards',
          name: { en: 'New Awards' },
          country: 'LA',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name.en).toBe('New Awards');
    });
  });

  describe('POST /api/awards/nominations/set-winner', () => {
    it('should set winner and unset others', async () => {
      const app = await build({ includeAwards: true, includeAuth: true });
      
      const [show] = await db.insert(schema.awardShows).values({}).returning();
      const [edition] = await db.insert(schema.awardEditions).values({
        showId: show.id,
        year: 2024,
      }).returning();
      const [category] = await db.insert(schema.awardCategories).values({
        showId: show.id,
        nomineeType: 'person',
        sortOrder: 1,
      }).returning();

      const [nom1] = await db.insert(schema.awardNominations).values({
        editionId: edition.id,
        categoryId: category.id,
        isWinner: true,
        sortOrder: 1,
      }).returning();

      const [nom2] = await db.insert(schema.awardNominations).values({
        editionId: edition.id,
        categoryId: category.id,
        isWinner: false,
        sortOrder: 2,
      }).returning();

      const response = await app.inject({
        method: 'POST',
        url: '/api/awards/nominations/set-winner',
        ...editorAuth,
        payload: { nomination_id: nom2.id },
      });

      expect(response.statusCode).toBe(200);

      const nominations = await db.select().from(schema.awardNominations);
      const updatedNom1 = nominations.find(n => n.id === nom1.id);
      const updatedNom2 = nominations.find(n => n.id === nom2.id);
      
      expect(updatedNom1?.isWinner).toBe(false);
      expect(updatedNom2?.isWinner).toBe(true);
    });
  });
});
