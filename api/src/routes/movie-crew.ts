// Movie crew management routes: POST and DELETE crew members
// Split from movies.ts for better maintainability

import { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { insertJobTranslations } from '../lib/movie-helpers.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

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
        return reply.status(404).send({ error: 'Movie not found' });
      }

      // Verify person exists
      const [person] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, person_id))
        .limit(1);

      if (!person) {
        return reply.status(404).send({ error: 'Person not found' });
      }

      // Insert crew record
      await db.insert(schema.movieCrew).values({
        movieId,
        personId: person_id,
        department,
      });

      // Insert job translations
      await insertJobTranslations(db, schema, movieId, person_id, department, job);

      // Log audit event
      await logAuditFromRequest(request, 'add_crew', 'movie', movieId, `Added person ${person_id} as ${job.en} (${department})`);

      return { success: true, message: 'Crew member added successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to add crew member' });
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

      // Log audit event
      await logAuditFromRequest(request, 'remove_crew', 'movie', movieId, `Removed person ${personIdNum}${department ? ` from ${department}` : ''}`);

      return { success: true, message: 'Crew member removed successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to remove crew member' });
    }
  });
}
