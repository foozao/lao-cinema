/**
 * Person Accolades Routes Tests
 * 
 * Tests person accolades endpoint with award bodies and section grouping
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { db, schema } from '../db/index.js';
import { createTestMovie, createTestPerson } from '../test/fixtures.js';

describe('Person Accolades Routes', () => {
  beforeEach(async () => {
    // Clean up test data in correct order
    await db.delete(schema.accoladeNominationTranslations);
    await db.delete(schema.accoladeNominations);
    await db.delete(schema.accoladeSectionSelections);
    await db.delete(schema.accoladeSectionTranslations);
    await db.delete(schema.accoladeSections);
    await db.delete(schema.accoladeCategoryTranslations);
    await db.delete(schema.accoladeCategories);
    await db.delete(schema.accoladeEditionTranslations);
    await db.delete(schema.accoladeEditions);
    await db.delete(schema.accoladeEventTranslations);
    await db.delete(schema.accoladeEvents);
    await db.delete(schema.awardBodyTranslations);
    await db.delete(schema.awardBodies);
    await db.delete(schema.movieCast);
    await db.delete(schema.movieTranslations);
    await db.delete(schema.movies);
    await db.delete(schema.peopleTranslations);
    await db.delete(schema.people);
  });

  describe('GET /api/people/:id/accolades', () => {
    it('should return 404 for non-existent person', async () => {
      const app = await build({ includeAccolades: true, includePeople: true });
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/people/999999/accolades',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return empty accolades for person with no nominations', async () => {
      const app = await build({ includeAccolades: true, includePeople: true });
      
      const person = await createTestPerson({ name: { en: 'Test Person' } });

      const response = await app.inject({
        method: 'GET',
        url: `/api/people/${person.id}/accolades`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.personal_awards).toEqual([]);
      expect(body.film_accolades).toEqual([]);
    });

    it('should return nominations for person', async () => {
      const app = await build({ includeAccolades: true, includePeople: true });
      
      const person = await createTestPerson({ name: { en: 'John Doe' } });
      const movie = await createTestMovie({ originalTitle: 'Test Film' });

      const [event] = await db.insert(schema.accoladeEvents).values({}).returning();
      await db.insert(schema.accoladeEventTranslations).values({
        eventId: event.id,
        language: 'en',
        name: 'Test Awards',
      });

      const [edition] = await db.insert(schema.accoladeEditions).values({
        eventId: event.id,
        year: 2024,
        editionNumber: 1,
      }).returning();

      const [category] = await db.insert(schema.accoladeCategories).values({
        eventId: event.id,
        nomineeType: 'person',
        sortOrder: 1,
      }).returning();

      await db.insert(schema.accoladeCategoryTranslations).values({
        categoryId: category.id,
        language: 'en',
        name: 'Best Actor',
      });

      // Link person to movie as cast member
      await db.insert(schema.movieCast).values({
        movieId: movie.id,
        personId: person.id,
        order: 0,
      });

      const [nomination] = await db.insert(schema.accoladeNominations).values({
        editionId: edition.id,
        categoryId: category.id,
        movieId: movie.id,
        isWinner: false,
        sortOrder: 1,
      }).returning();

      const response = await app.inject({
        method: 'GET',
        url: `/api/people/${person.id}/accolades`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.film_accolades).toHaveLength(1);
      expect(body.film_accolades[0].id).toBe(nomination.id);
      expect(body.film_accolades[0].type).toBe('nomination');
      expect(body.film_accolades[0].is_winner).toBe(false);
      expect(body.film_accolades[0].category.name.en).toBe('Best Actor');
      expect(body.film_accolades[0].show.name.en).toBe('Test Awards');
      expect(body.film_accolades[0].edition.year).toBe(2024);
    });

    it('should include award body information in nominations', async () => {
      const app = await build({ includeAccolades: true, includePeople: true });
      
      const person = await createTestPerson({ name: { en: 'Jane Smith' } });
      const movie = await createTestMovie({ originalTitle: 'Award Film' });

      // Create award body
      const [awardBody] = await db.insert(schema.awardBodies).values({
        abbreviation: 'FIPRESCI',
        type: 'critics',
      }).returning();

      await db.insert(schema.awardBodyTranslations).values({
        awardBodyId: awardBody.id,
        language: 'en',
        name: 'FIPRESCI',
      });

      // Create event/edition/category
      const [event] = await db.insert(schema.accoladeEvents).values({}).returning();
      await db.insert(schema.accoladeEventTranslations).values({
        eventId: event.id,
        language: 'en',
        name: 'Film Festival',
      });

      const [edition] = await db.insert(schema.accoladeEditions).values({
        eventId: event.id,
        year: 2024,
      }).returning();

      const [category] = await db.insert(schema.accoladeCategories).values({
        eventId: event.id,
        nomineeType: 'person',
        sortOrder: 1,
      }).returning();

      await db.insert(schema.accoladeCategoryTranslations).values({
        categoryId: category.id,
        language: 'en',
        name: 'Best Director',
      });

      // Link person to movie as cast member
      await db.insert(schema.movieCast).values({
        movieId: movie.id,
        personId: person.id,
        order: 0,
      });

      // Create nomination with award body
      await db.insert(schema.accoladeNominations).values({
        editionId: edition.id,
        categoryId: category.id,
        movieId: movie.id,
        awardBodyId: awardBody.id,
        isWinner: false,
        sortOrder: 1,
      }).returning();

      const response = await app.inject({
        method: 'GET',
        url: `/api/people/${person.id}/accolades`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.film_accolades).toHaveLength(1);
      expect(body.film_accolades[0].award_body).toBeDefined();
      expect(body.film_accolades[0].award_body.id).toBe(awardBody.id);
      expect(body.film_accolades[0].award_body.name.en).toBe('FIPRESCI');
      expect(body.film_accolades[0].award_body.abbreviation).toBe('FIPRESCI');
    });

    it('should include section information in category', async () => {
      const app = await build({ includeAccolades: true, includePeople: true });
      
      const person = await createTestPerson({ name: { en: 'Director' } });
      const movie = await createTestMovie({ originalTitle: 'Festival Film' });

      // Create event
      const [event] = await db.insert(schema.accoladeEvents).values({}).returning();
      await db.insert(schema.accoladeEventTranslations).values({
        eventId: event.id,
        language: 'en',
        name: 'Venice Film Festival',
      });

      const [edition] = await db.insert(schema.accoladeEditions).values({
        eventId: event.id,
        year: 2024,
      }).returning();

      // Create section
      const [section] = await db.insert(schema.accoladeSections).values({
        eventId: event.id,
        sortOrder: 1,
      }).returning();

      await db.insert(schema.accoladeSectionTranslations).values({
        sectionId: section.id,
        language: 'en',
        name: 'Giornate degli Autori',
      });

      // Create section-scoped category
      const [category] = await db.insert(schema.accoladeCategories).values({
        eventId: event.id,
        sectionId: section.id,
        nomineeType: 'person',
        sortOrder: 1,
      }).returning();

      await db.insert(schema.accoladeCategoryTranslations).values({
        categoryId: category.id,
        language: 'en',
        name: 'Best Director',
      });

      // Link person to movie as crew member
      await db.insert(schema.movieCrew).values({
        movieId: movie.id,
        personId: person.id,
        department: 'Directing',
      });

      // Create nomination
      await db.insert(schema.accoladeNominations).values({
        editionId: edition.id,
        categoryId: category.id,
        movieId: movie.id,
        isWinner: false,
        sortOrder: 1,
      }).returning();

      const response = await app.inject({
        method: 'GET',
        url: `/api/people/${person.id}/accolades`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.film_accolades).toHaveLength(1);
      expect(body.film_accolades[0].category.section).toBeDefined();
      expect(body.film_accolades[0].category.section.id).toBe(section.id);
      expect(body.film_accolades[0].category.section.name.en).toBe('Giornate degli Autori');
    });

    it('should return both winners and nominees', async () => {
      const app = await build({ includeAccolades: true, includePeople: true });
      
      const person = await createTestPerson({ name: { en: 'Multi Award Person' } });
      const movie = await createTestMovie({ originalTitle: 'Film' });

      const [event] = await db.insert(schema.accoladeEvents).values({}).returning();
      await db.insert(schema.accoladeEventTranslations).values({
        eventId: event.id,
        language: 'en',
        name: 'Awards',
      });

      const [edition] = await db.insert(schema.accoladeEditions).values({
        eventId: event.id,
        year: 2024,
      }).returning();

      const [category] = await db.insert(schema.accoladeCategories).values({
        eventId: event.id,
        nomineeType: 'person',
        sortOrder: 1,
      }).returning();

      await db.insert(schema.accoladeCategoryTranslations).values({
        categoryId: category.id,
        language: 'en',
        name: 'Best Actor',
      });

      // Link person to movie as cast member
      await db.insert(schema.movieCast).values({
        movieId: movie.id,
        personId: person.id,
        order: 0,
      });

      // Create winner
      await db.insert(schema.accoladeNominations).values({
        editionId: edition.id,
        categoryId: category.id,
        movieId: movie.id,
        isWinner: true,
        sortOrder: 1,
      });

      // Create another category
      const [category2] = await db.insert(schema.accoladeCategories).values({
        eventId: event.id,
        nomineeType: 'person',
        sortOrder: 2,
      }).returning();

      await db.insert(schema.accoladeCategoryTranslations).values({
        categoryId: category2.id,
        language: 'en',
        name: 'Best Director',
      });

      // Create nominee (not winner)
      await db.insert(schema.accoladeNominations).values({
        editionId: edition.id,
        categoryId: category2.id,
        movieId: movie.id,
        isWinner: false,
        sortOrder: 1,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/people/${person.id}/accolades`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.film_accolades).toHaveLength(2);
      
      const winner = body.film_accolades.find((a: any) => a.is_winner);
      const nominee = body.film_accolades.find((a: any) => !a.is_winner);
      
      expect(winner).toBeDefined();
      expect(nominee).toBeDefined();
    });

    it('should include recognition type when present', async () => {
      const app = await build({ includeAccolades: true, includePeople: true });
      
      const person = await createTestPerson({ name: { en: 'Person' } });
      const movie = await createTestMovie({ originalTitle: 'Film' });

      const [event] = await db.insert(schema.accoladeEvents).values({}).returning();
      await db.insert(schema.accoladeEventTranslations).values({
        eventId: event.id,
        language: 'en',
        name: 'Awards',
      });

      const [edition] = await db.insert(schema.accoladeEditions).values({
        eventId: event.id,
        year: 2024,
      }).returning();

      const [category] = await db.insert(schema.accoladeCategories).values({
        eventId: event.id,
        nomineeType: 'person',
        sortOrder: 1,
      }).returning();

      await db.insert(schema.accoladeCategoryTranslations).values({
        categoryId: category.id,
        language: 'en',
        name: 'Special Award',
      });

      // Link person to movie as cast member
      await db.insert(schema.movieCast).values({
        movieId: movie.id,
        personId: person.id,
        order: 0,
      });

      const [nomination] = await db.insert(schema.accoladeNominations).values({
        editionId: edition.id,
        categoryId: category.id,
        movieId: movie.id,
        isWinner: false,
        sortOrder: 1,
      }).returning();

      // Add recognition type
      await db.insert(schema.accoladeNominationTranslations).values({
        nominationId: nomination.id,
        language: 'en',
        recognitionType: 'Special Mention',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/people/${person.id}/accolades`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.film_accolades).toHaveLength(1);
      expect(body.film_accolades[0].recognition_type.en).toBe('Special Mention');
    });
  });
});
