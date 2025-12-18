// Movie crew management routes: POST and DELETE crew members
// Split from movies.ts for better maintainability

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { insertJobTranslations } from '../lib/movie-helpers.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

// Helper to get person name for audit logging
async function getPersonName(personId: number): Promise<string> {
  const translations = await db.select()
    .from(schema.peopleTranslations)
    .where(eq(schema.peopleTranslations.personId, personId));
  const enName = translations.find(t => t.language === 'en')?.name;
  return enName || `Person #${personId}`;
}

export default async function movieCrewRoutes(fastify: FastifyInstance) {
  // Add crew member to movie
  fastify.post<{
    Params: { id: string };
    Body: {
      person_id: number;
      department: string;
      job: { en: string; lo?: string };
    };
  }>('/movies/:id/crew', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id: movieId } = request.params;
      const { person_id, department, job } = request.body;

      // Verify movie exists
      const [movie] = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, movieId))
        .limit(1);

      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }

      // Verify person exists
      const [person] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, person_id))
        .limit(1);

      if (!person) {
        return sendNotFound(reply, 'Person not found');
      }

      // Insert crew record
      await db.insert(schema.movieCrew).values({
        movieId,
        personId: person_id,
        department,
      });

      // Insert job translations
      await insertJobTranslations(db, schema, movieId, person_id, department, job);

      // Log audit event with details
      const personName = await getPersonName(person_id);
      await logAuditFromRequest(
        request, 
        'add_crew', 
        'movie', 
        movieId, 
        `Added ${personName} as ${job.en} (${department})`,
        {
          person_id: { before: null, after: person_id },
          person_name: { before: null, after: personName },
          department: { before: null, after: department },
          job_en: { before: null, after: job.en },
          job_lo: { before: null, after: job.lo || null },
        }
      );

      return { success: true, message: 'Crew member added successfully' };
    } catch (error) {
      fastify.log.error(error);
      sendInternalError(reply, 'Failed to add crew member');
    }
  });

  // Remove crew member from movie
  fastify.delete<{
    Params: { id: string; personId: string };
    Querystring: { department?: string };
  }>('/movies/:id/crew/:personId', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id: movieId, personId } = request.params;
      const { department } = request.query;
      const personIdNum = parseInt(personId);

      // Get existing data for audit log before deletion
      const existingTranslations = department
        ? await db.select()
            .from(schema.movieCrewTranslations)
            .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${personIdNum} AND ${schema.movieCrewTranslations.department} = ${department}`)
        : await db.select()
            .from(schema.movieCrewTranslations)
            .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${personIdNum}`);
      
      const jobEn = existingTranslations.find(t => t.language === 'en')?.job;
      const jobLo = existingTranslations.find(t => t.language === 'lo')?.job;
      const existingDept = existingTranslations[0]?.department;
      const personName = await getPersonName(personIdNum);

      if (department) {
        // Delete specific department entry
        await db.delete(schema.movieCrewTranslations)
          .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${personIdNum} AND ${schema.movieCrewTranslations.department} = ${department}`);
        await db.delete(schema.movieCrew)
          .where(sql`${schema.movieCrew.movieId} = ${movieId} AND ${schema.movieCrew.personId} = ${personIdNum} AND ${schema.movieCrew.department} = ${department}`);
      } else {
        // Delete all crew entries for this person
        await db.delete(schema.movieCrewTranslations)
          .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${personIdNum}`);
        await db.delete(schema.movieCrew)
          .where(sql`${schema.movieCrew.movieId} = ${movieId} AND ${schema.movieCrew.personId} = ${personIdNum}`);
      }

      // Log audit event with details
      await logAuditFromRequest(
        request, 
        'remove_crew', 
        'movie', 
        movieId, 
        `Removed ${personName}${department ? ` from ${department}` : ''}`,
        {
          person_id: { before: personIdNum, after: null },
          person_name: { before: personName, after: null },
          department: { before: existingDept || department || null, after: null },
          job_en: { before: jobEn || null, after: null },
          job_lo: { before: jobLo || null, after: null },
        }
      );

      return { success: true, message: 'Crew member removed successfully' };
    } catch (error) {
      fastify.log.error(error);
      sendInternalError(reply, 'Failed to remove crew member');
    }
  });
}
