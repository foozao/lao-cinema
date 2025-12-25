/**
 * People Merge Service
 * 
 * Handles the complex logic of merging two person records.
 * This includes migrating translations, cast credits, crew credits,
 * and creating an alias to prevent TMDB from recreating the duplicate.
 */

import { db, schema } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';

export interface MergeResult {
  success: boolean;
  message: string;
  targetId: number;
}

export interface MergeError {
  code: 'SOURCE_NOT_FOUND' | 'TARGET_NOT_FOUND' | 'SAME_PERSON' | 'MERGE_FAILED';
  message: string;
}

/**
 * Merge two person records into one.
 * 
 * This function:
 * 1. Merges translations (adds missing translations from source to target)
 * 2. Migrates cast credits from source to target
 * 3. Migrates crew credits from source to target
 * 4. Creates an alias to track the merge (prevents TMDB from recreating duplicates)
 * 5. Deletes the source person
 * 
 * @param sourceId - Person ID to merge from (will be deleted)
 * @param targetId - Person ID to merge into (will be kept)
 * @returns MergeResult on success, MergeError on failure
 */
export async function mergePeople(
  sourceId: number,
  targetId: number
): Promise<MergeResult | MergeError> {
  
  if (sourceId === targetId) {
    return {
      code: 'SAME_PERSON',
      message: 'Cannot merge a person with themselves',
    };
  }

  // Verify both people exist
  const [sourcePerson] = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, sourceId))
    .limit(1);

  const [targetPerson] = await db.select()
    .from(schema.people)
    .where(eq(schema.people.id, targetId))
    .limit(1);

  if (!sourcePerson) {
    return {
      code: 'SOURCE_NOT_FOUND',
      message: 'Source person not found',
    };
  }

  if (!targetPerson) {
    return {
      code: 'TARGET_NOT_FOUND',
      message: 'Target person not found',
    };
  }

  try {
    // 1. Merge translations (add missing translations from source to target)
    await mergeTranslations(sourceId, targetId);

    // 2. Migrate cast credits from source to target
    await migrateCastCredits(sourceId, targetId);

    // 3. Migrate crew credits from source to target
    await migrateCrewCredits(sourceId, targetId);

    // 4. Create alias to track the merge (prevents TMDB from recreating the duplicate)
    await db.insert(schema.personAliases).values({
      tmdbId: sourceId,
      canonicalPersonId: targetId,
    });

    // 5. Delete source person (CASCADE will handle remaining translations and credits)
    await db.delete(schema.people)
      .where(eq(schema.people.id, sourceId));

    return {
      success: true,
      message: `Successfully merged person ${sourceId} into ${targetId}`,
      targetId,
    };
  } catch (error) {
    console.error('Merge failed:', error);
    return {
      code: 'MERGE_FAILED',
      message: 'Failed to merge people',
    };
  }
}

/**
 * Merge translations from source to target person.
 * Only adds translations that don't already exist on the target.
 */
async function mergeTranslations(sourceId: number, targetId: number): Promise<void> {
  const sourceTranslations = await db.select()
    .from(schema.peopleTranslations)
    .where(eq(schema.peopleTranslations.personId, sourceId));

  const targetTranslations = await db.select()
    .from(schema.peopleTranslations)
    .where(eq(schema.peopleTranslations.personId, targetId));

  const targetLanguages = new Set(targetTranslations.map(t => t.language));

  for (const sourceTrans of sourceTranslations) {
    if (!targetLanguages.has(sourceTrans.language)) {
      await db.insert(schema.peopleTranslations).values({
        personId: targetId,
        language: sourceTrans.language,
        name: sourceTrans.name,
        biography: sourceTrans.biography,
      });
    }
  }
}

/**
 * Migrate cast credits from source to target person.
 * If target already has the credit, just delete source's translations.
 */
async function migrateCastCredits(sourceId: number, targetId: number): Promise<void> {
  const sourceCastCredits = await db.select()
    .from(schema.movieCast)
    .where(eq(schema.movieCast.personId, sourceId));

  for (const credit of sourceCastCredits) {
    // Check if target already has this cast credit
    const [existingCredit] = await db.select()
      .from(schema.movieCast)
      .where(sql`${schema.movieCast.movieId} = ${credit.movieId} AND ${schema.movieCast.personId} = ${targetId}`)
      .limit(1);

    if (!existingCredit) {
      // Update cast credit to point to target person
      await db.update(schema.movieCast)
        .set({ personId: targetId })
        .where(sql`${schema.movieCast.movieId} = ${credit.movieId} AND ${schema.movieCast.personId} = ${sourceId}`);

      // Migrate cast character translations
      await migrateCastTranslations(credit.movieId, sourceId, targetId);
    } else {
      // Target already has this credit, just delete source's translations
      await db.delete(schema.movieCastTranslations)
        .where(sql`${schema.movieCastTranslations.movieId} = ${credit.movieId} AND ${schema.movieCastTranslations.personId} = ${sourceId}`);
    }
  }
}

/**
 * Migrate cast character translations for a specific movie credit.
 */
async function migrateCastTranslations(
  movieId: string,
  sourceId: number,
  targetId: number
): Promise<void> {
  const castTranslations = await db.select()
    .from(schema.movieCastTranslations)
    .where(sql`${schema.movieCastTranslations.movieId} = ${movieId} AND ${schema.movieCastTranslations.personId} = ${sourceId}`);

  for (const trans of castTranslations) {
    // Check if translation already exists for target
    const [existingTrans] = await db.select()
      .from(schema.movieCastTranslations)
      .where(sql`${schema.movieCastTranslations.movieId} = ${movieId} AND ${schema.movieCastTranslations.personId} = ${targetId} AND ${schema.movieCastTranslations.language} = ${trans.language}`)
      .limit(1);

    if (!existingTrans) {
      await db.update(schema.movieCastTranslations)
        .set({ personId: targetId })
        .where(sql`${schema.movieCastTranslations.movieId} = ${movieId} AND ${schema.movieCastTranslations.personId} = ${sourceId} AND ${schema.movieCastTranslations.language} = ${trans.language}`);
    }
  }
}

/**
 * Migrate crew credits from source to target person.
 * If target already has the credit, just delete source's translations.
 */
async function migrateCrewCredits(sourceId: number, targetId: number): Promise<void> {
  const sourceCrewCredits = await db.select()
    .from(schema.movieCrew)
    .where(eq(schema.movieCrew.personId, sourceId));

  for (const credit of sourceCrewCredits) {
    // Check if target already has this crew credit
    const [existingCredit] = await db.select()
      .from(schema.movieCrew)
      .where(sql`${schema.movieCrew.movieId} = ${credit.movieId} AND ${schema.movieCrew.personId} = ${targetId} AND ${schema.movieCrew.department} = ${credit.department}`)
      .limit(1);

    if (!existingCredit) {
      // Update crew credit to point to target person
      await db.update(schema.movieCrew)
        .set({ personId: targetId })
        .where(sql`${schema.movieCrew.movieId} = ${credit.movieId} AND ${schema.movieCrew.personId} = ${sourceId} AND ${schema.movieCrew.department} = ${credit.department}`);

      // Migrate crew job translations
      await migrateCrewTranslations(credit.movieId, credit.department, sourceId, targetId);
    } else {
      // Target already has this credit, just delete source's translations
      await db.delete(schema.movieCrewTranslations)
        .where(sql`${schema.movieCrewTranslations.movieId} = ${credit.movieId} AND ${schema.movieCrewTranslations.personId} = ${sourceId} AND ${schema.movieCrewTranslations.department} = ${credit.department}`);
    }
  }
}

/**
 * Migrate crew job translations for a specific movie credit.
 */
async function migrateCrewTranslations(
  movieId: string,
  department: string,
  sourceId: number,
  targetId: number
): Promise<void> {
  const crewTranslations = await db.select()
    .from(schema.movieCrewTranslations)
    .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${sourceId} AND ${schema.movieCrewTranslations.department} = ${department}`);

  for (const trans of crewTranslations) {
    // Check if translation already exists for target
    const [existingTrans] = await db.select()
      .from(schema.movieCrewTranslations)
      .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${targetId} AND ${schema.movieCrewTranslations.department} = ${department} AND ${schema.movieCrewTranslations.language} = ${trans.language}`)
      .limit(1);

    if (!existingTrans) {
      await db.update(schema.movieCrewTranslations)
        .set({ personId: targetId })
        .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${sourceId} AND ${schema.movieCrewTranslations.department} = ${department} AND ${schema.movieCrewTranslations.language} = ${trans.language}`);
    }
  }
}

/**
 * Type guard to check if result is an error.
 */
export function isMergeError(result: MergeResult | MergeError): result is MergeError {
  return 'code' in result;
}
