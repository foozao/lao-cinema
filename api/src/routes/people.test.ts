/**
 * People Routes Tests
 * 
 * Tests people (cast/crew) CRUD operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

describe('People Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build({ includePeople: true });
    
    // Clean up test data
    await db.delete(schema.movieCastTranslations);
    await db.delete(schema.movieCrewTranslations);
    await db.delete(schema.movieCast);
    await db.delete(schema.movieCrew);
    await db.delete(schema.peopleTranslations);
    await db.delete(schema.people);
  });

  // =============================================================================
  // GET ALL PEOPLE
  // =============================================================================

  describe('GET /api/people', () => {
    it('should return empty array when no people exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/people',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.people).toEqual([]);
    });

    it('should return all people with translations', async () => {
      // Create a person
      const [person] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();

      // Add translations
      await db.insert(schema.peopleTranslations).values([
        { personId: person.id, language: 'en', name: 'John Doe', biography: 'An actor' },
        { personId: person.id, language: 'lo', name: 'ຈອນ ໂດ', biography: 'ນັກສະແດງ' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/people',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.people).toHaveLength(1);
      expect(body.people[0].name.en).toBe('John Doe');
      expect(body.people[0].name.lo).toBe('ຈອນ ໂດ');
      expect(body.people[0].biography.en).toBe('An actor');
    });

    it('should search people by name', async () => {
      // Create people
      const [person1] = await db.insert(schema.people).values({ id: -1 }).returning();
      const [person2] = await db.insert(schema.people).values({ id: -2 }).returning();

      await db.insert(schema.peopleTranslations).values([
        { personId: person1.id, language: 'en', name: 'John Smith' },
        { personId: person2.id, language: 'en', name: 'Jane Doe' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/people?search=John',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.people).toHaveLength(1);
      expect(body.people[0].name.en).toBe('John Smith');
    });

    it('should search by Lao name', async () => {
      const [person] = await db.insert(schema.people).values({ id: -1 }).returning();
      await db.insert(schema.peopleTranslations).values([
        { personId: person.id, language: 'en', name: 'Actor Name' },
        { personId: person.id, language: 'lo', name: 'ນັກສະແດງ' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/people?search=ນັກສະແດງ',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.people).toHaveLength(1);
    });

    it('should return empty array for non-matching search', async () => {
      const [person] = await db.insert(schema.people).values({ id: -1 }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: person.id, language: 'en', name: 'John Smith',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/people?search=NonexistentName',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.people).toEqual([]);
    });
  });

  // =============================================================================
  // CREATE PERSON
  // =============================================================================

  describe('POST /api/people', () => {
    it('should create a person with minimal data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/people',
        payload: {
          name: { en: 'New Actor' },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.id).toBeLessThan(0); // Manually created IDs are negative
      expect(body.name.en).toBe('New Actor');
    });

    it('should create a person with full data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/people',
        payload: {
          name: { en: 'Jane Director', lo: 'ເຈນ ຜູ້ກຳກັບ' },
          biography: { en: 'A talented director', lo: 'ຜູ້ກຳກັບທີ່ມີພອນສະຫວັນ' },
          known_for_department: 'Directing',
          birthday: '1985-03-15',
          place_of_birth: 'Vientiane, Laos',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name.en).toBe('Jane Director');
      expect(body.name.lo).toBe('ເຈນ ຜູ້ກຳກັບ');
      expect(body.biography.en).toBe('A talented director');
      expect(body.known_for_department).toBe('Directing');
      expect(body.birthday).toBe('1985-03-15');
    });

    it('should reject creation without English name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/people',
        payload: {
          name: { lo: 'ຊື່ລາວເທົ່ານັ້ນ' },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('English name is required');
    });

    it('should reject creation without name object', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/people',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should generate unique negative IDs', async () => {
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/people',
        payload: { name: { en: 'Person 1' } },
      });
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/people',
        payload: { name: { en: 'Person 2' } },
      });

      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);

      expect(body1.id).toBeLessThan(0);
      expect(body2.id).toBeLessThan(0);
      expect(body1.id).not.toBe(body2.id);
    });
  });

  // =============================================================================
  // GET PERSON BY ID
  // =============================================================================

  describe('GET /api/people/:id', () => {
    it('should return person by ID', async () => {
      const [person] = await db.insert(schema.people).values({
        id: -100,
        knownForDepartment: 'Acting',
        birthday: '1990-01-15',
      }).returning();

      await db.insert(schema.peopleTranslations).values({
        personId: person.id,
        language: 'en',
        name: 'Test Actor',
        biography: 'A biography',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/people/${person.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(person.id);
      expect(body.name.en).toBe('Test Actor');
      expect(body.biography.en).toBe('A biography');
      expect(body.known_for_department).toBe('Acting');
    });

    it('should return 404 for non-existent person', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/people/-99999',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Person not found');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/people/invalid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid person ID');
    });

    it('should include cast and crew credits', async () => {
      // Create person
      const [person] = await db.insert(schema.people).values({ id: -200 }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: person.id, language: 'en', name: 'Multi-talented',
      });

      // Create movie
      const [movie] = await db.insert(schema.movies).values({
        originalTitle: 'Test Movie',
        releaseDate: '2024-01-01',
      }).returning();

      await db.insert(schema.movieTranslations).values({
        movieId: movie.id, language: 'en', title: 'Test Movie', overview: 'A test movie',
      });

      // Add cast credit
      await db.insert(schema.movieCast).values({
        movieId: movie.id,
        personId: person.id,
        order: 0,
      });
      await db.insert(schema.movieCastTranslations).values({
        movieId: movie.id,
        personId: person.id,
        language: 'en',
        character: 'Main Character',
      });

      // Add crew credit
      await db.insert(schema.movieCrew).values({
        movieId: movie.id,
        personId: person.id,
        department: 'Directing',
      });
      await db.insert(schema.movieCrewTranslations).values({
        movieId: movie.id,
        personId: person.id,
        department: 'Directing',
        language: 'en',
        job: 'Director',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/people/${person.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.cast).toHaveLength(1);
      expect(body.cast[0].movie.id).toBe(movie.id);
      expect(body.cast[0].character.en).toBe('Main Character');
      
      expect(body.crew).toHaveLength(1);
      expect(body.crew[0].department).toBe('Directing');
      expect(body.crew[0].job.en).toBe('Director');

      // Clean up movie
      await db.delete(schema.movieCastTranslations);
      await db.delete(schema.movieCrewTranslations);
      await db.delete(schema.movieCast);
      await db.delete(schema.movieCrew);
      await db.delete(schema.movieTranslations);
      await db.delete(schema.movies).where(eq(schema.movies.id, movie.id));
    });
  });

  // =============================================================================
  // UPDATE PERSON
  // =============================================================================

  describe('PUT /api/people/:id', () => {
    it('should update person name', async () => {
      const [person] = await db.insert(schema.people).values({ id: -300 }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: person.id, language: 'en', name: 'Original Name',
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/people/${person.id}`,
        payload: {
          name: { en: 'Updated Name' },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name.en).toBe('Updated Name');
    });

    it('should update biography', async () => {
      const [person] = await db.insert(schema.people).values({ id: -301 }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: person.id, language: 'en', name: 'Test Person',
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/people/${person.id}`,
        payload: {
          biography: { en: 'New biography text' },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.biography.en).toBe('New biography text');
    });

    it('should add Lao translation', async () => {
      const [person] = await db.insert(schema.people).values({ id: -302 }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: person.id, language: 'en', name: 'English Name',
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/people/${person.id}`,
        payload: {
          name: { lo: 'ຊື່ລາວ' },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name.en).toBe('English Name'); // Unchanged
      expect(body.name.lo).toBe('ຊື່ລາວ'); // Added
    });

    it('should update basic person info', async () => {
      const [person] = await db.insert(schema.people).values({ id: -303 }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: person.id, language: 'en', name: 'Test',
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/people/${person.id}`,
        payload: {
          birthday: '1980-05-20',
          place_of_birth: 'New York, USA',
          known_for_department: 'Writing',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.birthday).toBe('1980-05-20');
      expect(body.place_of_birth).toBe('New York, USA');
      expect(body.known_for_department).toBe('Writing');
    });

    it('should return 404 for non-existent person', async () => {
      // Use only basic fields (not name/biography) to avoid FK constraint errors
      const response = await app.inject({
        method: 'PUT',
        url: '/api/people/-99999',
        payload: {
          birthday: '1990-01-01',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid ID', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/people/invalid',
        payload: {
          name: { en: 'Test' },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
