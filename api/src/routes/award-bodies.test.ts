/**
 * Award Bodies Routes Tests
 * 
 * Tests CRUD operations for award bodies (independent juries like FIPRESCI, Fedeora, etc.)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { build, createTestEditor } from '../test/app.js';
import { db, schema } from '../db/index.js';

describe('Award Bodies Routes', () => {
  let editorAuth: { headers: { authorization: string }, userId: string };

  beforeEach(async () => {
    // Clean up test data
    await db.delete(schema.awardBodyTranslations);
    await db.delete(schema.awardBodies);
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
    
    // Create editor user for protected routes
    editorAuth = await createTestEditor();
  });

  describe('GET /api/accolades/award-bodies', () => {
    it('should return empty array when no award bodies exist', async () => {
      const app = await build({ includeAccolades: true });
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/accolades/award-bodies',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.award_bodies).toEqual([]);
    });

    it('should return all award bodies with translations', async () => {
      const app = await build({ includeAccolades: true });
      
      const [body1] = await db.insert(schema.awardBodies).values({
        abbreviation: 'FIPRESCI',
        type: 'critics',
      }).returning();

      await db.insert(schema.awardBodyTranslations).values({
        awardBodyId: body1.id,
        language: 'en',
        name: 'International Federation of Film Critics',
      });

      const [body2] = await db.insert(schema.awardBodies).values({
        type: 'jury',
      }).returning();

      await db.insert(schema.awardBodyTranslations).values({
        awardBodyId: body2.id,
        language: 'en',
        name: 'Fedeora',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/accolades/award-bodies',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.award_bodies).toHaveLength(2);
      expect(body.award_bodies[0].name.en).toBe('International Federation of Film Critics');
      expect(body.award_bodies[0].abbreviation).toBe('FIPRESCI');
      expect(body.award_bodies[1].name.en).toBe('Fedeora');
    });
  });

  describe('GET /api/accolades/award-bodies/:id', () => {
    it('should return 404 for non-existent award body', async () => {
      const app = await build({ includeAccolades: true });
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/accolades/award-bodies/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return award body with translations', async () => {
      const app = await build({ includeAccolades: true });
      
      const [awardBody] = await db.insert(schema.awardBodies).values({
        abbreviation: 'FIPRESCI',
        type: 'critics',
        websiteUrl: 'https://fipresci.org',
      }).returning();

      await db.insert(schema.awardBodyTranslations).values([
        {
          awardBodyId: awardBody.id,
          language: 'en',
          name: 'FIPRESCI',
          description: 'International Federation of Film Critics',
        },
        {
          awardBodyId: awardBody.id,
          language: 'lo',
          name: 'ຟິເປຣສຊີ',
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/accolades/award-bodies/${awardBody.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(awardBody.id);
      expect(body.name.en).toBe('FIPRESCI');
      expect(body.name.lo).toBe('ຟິເປຣສຊີ');
      expect(body.abbreviation).toBe('FIPRESCI');
      expect(body.type).toBe('critics');
      expect(body.website_url).toBe('https://fipresci.org');
    });
  });

  describe('POST /api/accolades/award-bodies', () => {
    it('should require authentication', async () => {
      const app = await build({ includeAccolades: true });
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/accolades/award-bodies',
        payload: { name: { en: 'New Award Body' } },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should require English name', async () => {
      const app = await build({ includeAccolades: true, includeAuth: true });
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/accolades/award-bodies',
        ...editorAuth,
        payload: { name: { lo: 'ຊື່' } },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should create award body with minimal data', async () => {
      const app = await build({ includeAccolades: true, includeAuth: true });
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/accolades/award-bodies',
        ...editorAuth,
        payload: {
          name: { en: 'Fedeora' },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name.en).toBe('Fedeora');
      expect(body.id).toBeDefined();
    });

    it('should create award body with full data', async () => {
      const app = await build({ includeAccolades: true, includeAuth: true });
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/accolades/award-bodies',
        ...editorAuth,
        payload: {
          abbreviation: 'FIPRESCI',
          name: { en: 'International Federation of Film Critics', lo: 'ຟິເປຣສຊີ' },
          description: { en: 'Critics organization', lo: 'ອົງການນັກວິຈານ' },
          type: 'critics',
          website_url: 'https://fipresci.org',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.abbreviation).toBe('FIPRESCI');
      expect(body.name.en).toBe('International Federation of Film Critics');
      expect(body.name.lo).toBe('ຟິເປຣສຊີ');
      expect(body.type).toBe('critics');
      expect(body.website_url).toBe('https://fipresci.org');
    });
  });

  describe('PUT /api/accolades/award-bodies/:id', () => {
    it('should require authentication', async () => {
      const app = await build({ includeAccolades: true });
      
      const response = await app.inject({
        method: 'PUT',
        url: '/api/accolades/award-bodies/some-id',
        payload: { name: { en: 'Updated' } },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent award body', async () => {
      const app = await build({ includeAccolades: true, includeAuth: true });
      
      const response = await app.inject({
        method: 'PUT',
        url: '/api/accolades/award-bodies/00000000-0000-0000-0000-000000000000',
        ...editorAuth,
        payload: { name: { en: 'Updated' } },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should update award body', async () => {
      const app = await build({ includeAccolades: true, includeAuth: true });
      
      const [awardBody] = await db.insert(schema.awardBodies).values({
        type: 'jury',
      }).returning();

      await db.insert(schema.awardBodyTranslations).values({
        awardBodyId: awardBody.id,
        language: 'en',
        name: 'Original Name',
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/accolades/award-bodies/${awardBody.id}`,
        ...editorAuth,
        payload: {
          abbreviation: 'FED',
          name: { en: 'Updated Name' },
          type: 'critics',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.abbreviation).toBe('FED');
      expect(body.name.en).toBe('Updated Name');
      expect(body.type).toBe('critics');
    });

    it('should clear type when set to null', async () => {
      const app = await build({ includeAccolades: true, includeAuth: true });
      
      const [awardBody] = await db.insert(schema.awardBodies).values({
        type: 'jury',
      }).returning();

      await db.insert(schema.awardBodyTranslations).values({
        awardBodyId: awardBody.id,
        language: 'en',
        name: 'Test Body',
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/accolades/award-bodies/${awardBody.id}`,
        ...editorAuth,
        payload: { type: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.type).toBeNull();
    });
  });

  describe('DELETE /api/accolades/award-bodies/:id', () => {
    it('should require authentication', async () => {
      const app = await build({ includeAccolades: true });
      
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/accolades/award-bodies/some-id',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent award body', async () => {
      const app = await build({ includeAccolades: true, includeAuth: true });
      
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/accolades/award-bodies/00000000-0000-0000-0000-000000000000',
        ...editorAuth,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should delete award body and translations', async () => {
      const app = await build({ includeAccolades: true, includeAuth: true });
      
      const [awardBody] = await db.insert(schema.awardBodies).values({}).returning();
      await db.insert(schema.awardBodyTranslations).values({
        awardBodyId: awardBody.id,
        language: 'en',
        name: 'To Delete',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/accolades/award-bodies/${awardBody.id}`,
        ...editorAuth,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify deletion
      const bodies = await db.select().from(schema.awardBodies);
      const translations = await db.select().from(schema.awardBodyTranslations);
      expect(bodies).toHaveLength(0);
      expect(translations).toHaveLength(0);
    });
  });
});
