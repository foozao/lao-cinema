/**
 * People Merge Service Tests
 * 
 * Tests the complex logic of merging two person records including
 * translations, cast credits, crew credits, and alias creation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db, schema } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import { mergePeople, isMergeError } from './people-merge-service.js';
import { randomUUID } from 'crypto';

describe('People Merge Service', () => {
  // Test movie ID for credits - must be valid UUID
  let testMovieId: string;

  beforeEach(async () => {
    // Generate new UUID for each test
    testMovieId = randomUUID();
    
    // Clean up test data in correct order (respecting foreign keys)
    await db.delete(schema.personAliases);
    await db.delete(schema.movieCastTranslations);
    await db.delete(schema.movieCrewTranslations);
    await db.delete(schema.movieCast);
    await db.delete(schema.movieCrew);
    await db.delete(schema.peopleTranslations);
    await db.delete(schema.people);
    
    // Clean up movies
    await db.delete(schema.movieTranslations);
    await db.delete(schema.movies);
    
    // Create a test movie for credits
    await db.insert(schema.movies).values({
      id: testMovieId,
      tmdbId: 999999,
      originalTitle: 'Test Movie',
      originalLanguage: 'en',
      releaseDate: '2024-01-01',
      voteAverage: 7.5,
      voteCount: 100,
      popularity: 50,
      adult: false,
    });
  });

  // =============================================================================
  // VALIDATION TESTS
  // =============================================================================

  describe('Validation', () => {
    it('should return error when merging person with themselves', async () => {
      const [person] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();

      const result = await mergePeople(person.id, person.id);

      expect(isMergeError(result)).toBe(true);
      if (isMergeError(result)) {
        expect(result.code).toBe('SAME_PERSON');
        expect(result.message).toBe('Cannot merge a person with themselves');
      }
    });

    it('should return error when source person does not exist', async () => {
      const [target] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();

      const result = await mergePeople(999999, target.id);

      expect(isMergeError(result)).toBe(true);
      if (isMergeError(result)) {
        expect(result.code).toBe('SOURCE_NOT_FOUND');
      }
    });

    it('should return error when target person does not exist', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();

      const result = await mergePeople(source.id, 999999);

      expect(isMergeError(result)).toBe(true);
      if (isMergeError(result)) {
        expect(result.code).toBe('TARGET_NOT_FOUND');
      }
    });
  });

  // =============================================================================
  // TRANSLATION MERGE TESTS
  // =============================================================================

  describe('Translation Merging', () => {
    it('should merge translations from source to target', async () => {
      // Create source with Lao translation only
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: source.id,
        language: 'lo',
        name: 'ນັກສະແດງ',
        biography: 'ປະຫວັດ',
      });

      // Create target with English translation only
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Acting',
      }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: target.id,
        language: 'en',
        name: 'Actor Name',
        biography: 'Biography',
      });

      const result = await mergePeople(source.id, target.id);

      expect(isMergeError(result)).toBe(false);
      if (!isMergeError(result)) {
        expect(result.success).toBe(true);
        expect(result.targetId).toBe(target.id);
      }

      // Verify target now has both translations
      const targetTranslations = await db.select()
        .from(schema.peopleTranslations)
        .where(eq(schema.peopleTranslations.personId, target.id));

      expect(targetTranslations).toHaveLength(2);
      const languages = targetTranslations.map(t => t.language);
      expect(languages).toContain('en');
      expect(languages).toContain('lo');
    });

    it('should not overwrite existing target translations', async () => {
      // Create source with English translation
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: source.id,
        language: 'en',
        name: 'Source Name',
        biography: 'Source Bio',
      });

      // Create target with different English translation
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Acting',
      }).returning();
      await db.insert(schema.peopleTranslations).values({
        personId: target.id,
        language: 'en',
        name: 'Target Name',
        biography: 'Target Bio',
      });

      await mergePeople(source.id, target.id);

      // Verify target's original translation is preserved
      const [targetTrans] = await db.select()
        .from(schema.peopleTranslations)
        .where(sql`${schema.peopleTranslations.personId} = ${target.id} AND ${schema.peopleTranslations.language} = 'en'`);

      expect(targetTrans.name).toBe('Target Name');
      expect(targetTrans.biography).toBe('Target Bio');
    });
  });

  // =============================================================================
  // CAST CREDIT MIGRATION TESTS
  // =============================================================================

  describe('Cast Credit Migration', () => {
    it('should migrate cast credits from source to target', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Acting',
      }).returning();

      // Add cast credit to source
      await db.insert(schema.movieCast).values({
        movieId: testMovieId,
        personId: source.id,
        order: 1,
      });

      await mergePeople(source.id, target.id);

      // Verify credit now belongs to target
      const targetCredits = await db.select()
        .from(schema.movieCast)
        .where(eq(schema.movieCast.personId, target.id));

      expect(targetCredits).toHaveLength(1);
      expect(targetCredits[0].movieId).toBe(testMovieId);
    });

    it('should not duplicate cast credits if target already has the same credit', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Acting',
      }).returning();

      // Both have cast credit in same movie
      await db.insert(schema.movieCast).values({
        movieId: testMovieId,
        personId: source.id,
        order: 1,
      });
      await db.insert(schema.movieCast).values({
        movieId: testMovieId,
        personId: target.id,
        order: 2,
      });

      await mergePeople(source.id, target.id);

      // Verify target still has only one credit
      const targetCredits = await db.select()
        .from(schema.movieCast)
        .where(eq(schema.movieCast.personId, target.id));

      expect(targetCredits).toHaveLength(1);
    });

    it('should migrate cast character translations', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Acting',
      }).returning();

      // Add cast credit with translation
      await db.insert(schema.movieCast).values({
        movieId: testMovieId,
        personId: source.id,
        order: 1,
      });
      await db.insert(schema.movieCastTranslations).values({
        movieId: testMovieId,
        personId: source.id,
        language: 'en',
        character: 'Hero',
      });

      await mergePeople(source.id, target.id);

      // Verify translation was migrated
      const targetTranslations = await db.select()
        .from(schema.movieCastTranslations)
        .where(eq(schema.movieCastTranslations.personId, target.id));

      expect(targetTranslations).toHaveLength(1);
      expect(targetTranslations[0].character).toBe('Hero');
    });
  });

  // =============================================================================
  // CREW CREDIT MIGRATION TESTS
  // =============================================================================

  describe('Crew Credit Migration', () => {
    it('should migrate crew credits from source to target', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Directing',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Directing',
      }).returning();

      // Add crew credit to source
      await db.insert(schema.movieCrew).values({
        movieId: testMovieId,
        personId: source.id,
        department: 'Directing',
      });

      await mergePeople(source.id, target.id);

      // Verify credit now belongs to target
      const targetCredits = await db.select()
        .from(schema.movieCrew)
        .where(eq(schema.movieCrew.personId, target.id));

      expect(targetCredits).toHaveLength(1);
      expect(targetCredits[0].department).toBe('Directing');
    });

    it('should not duplicate crew credits if target already has same credit in same department', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Directing',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Directing',
      }).returning();

      // Both have crew credit in same movie/department
      await db.insert(schema.movieCrew).values({
        movieId: testMovieId,
        personId: source.id,
        department: 'Directing',
      });
      await db.insert(schema.movieCrew).values({
        movieId: testMovieId,
        personId: target.id,
        department: 'Directing',
      });

      await mergePeople(source.id, target.id);

      // Verify target still has only one credit
      const targetCredits = await db.select()
        .from(schema.movieCrew)
        .where(eq(schema.movieCrew.personId, target.id));

      expect(targetCredits).toHaveLength(1);
    });

    it('should migrate crew job translations', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Directing',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Directing',
      }).returning();

      // Add crew credit with translation
      await db.insert(schema.movieCrew).values({
        movieId: testMovieId,
        personId: source.id,
        department: 'Directing',
      });
      await db.insert(schema.movieCrewTranslations).values({
        movieId: testMovieId,
        personId: source.id,
        department: 'Directing',
        language: 'en',
        job: 'Director',
      });

      await mergePeople(source.id, target.id);

      // Verify translation was migrated
      const targetTranslations = await db.select()
        .from(schema.movieCrewTranslations)
        .where(eq(schema.movieCrewTranslations.personId, target.id));

      expect(targetTranslations).toHaveLength(1);
      expect(targetTranslations[0].job).toBe('Director');
    });
  });

  // =============================================================================
  // ALIAS CREATION TESTS
  // =============================================================================

  describe('Alias Creation', () => {
    it('should create alias to track the merge', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Acting',
      }).returning();

      await mergePeople(source.id, target.id);

      // Verify alias was created
      const aliases = await db.select()
        .from(schema.personAliases)
        .where(eq(schema.personAliases.tmdbId, source.id));

      expect(aliases).toHaveLength(1);
      expect(aliases[0].canonicalPersonId).toBe(target.id);
    });
  });

  // =============================================================================
  // SOURCE DELETION TESTS
  // =============================================================================

  describe('Source Deletion', () => {
    it('should delete source person after merge', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Acting',
      }).returning();

      await mergePeople(source.id, target.id);

      // Verify source was deleted
      const sourcePeople = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, source.id));

      expect(sourcePeople).toHaveLength(0);
    });

    it('should preserve target person after merge', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Acting',
        profilePath: '/profile.jpg',
      }).returning();

      await mergePeople(source.id, target.id);

      // Verify target still exists with original data
      const [targetPerson] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, target.id));

      expect(targetPerson).toBeDefined();
      expect(targetPerson.profilePath).toBe('/profile.jpg');
    });
  });

  // =============================================================================
  // TYPE GUARD TESTS
  // =============================================================================

  describe('isMergeError type guard', () => {
    it('should return true for error results', async () => {
      const result = await mergePeople(999999, 888888);
      expect(isMergeError(result)).toBe(true);
    });

    it('should return false for success results', async () => {
      const [source] = await db.insert(schema.people).values({
        id: -1,
        knownForDepartment: 'Acting',
      }).returning();
      const [target] = await db.insert(schema.people).values({
        id: -2,
        knownForDepartment: 'Acting',
      }).returning();

      const result = await mergePeople(source.id, target.id);
      expect(isMergeError(result)).toBe(false);
    });
  });
});
