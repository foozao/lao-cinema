// Movie cast management routes: POST and DELETE cast members
// Split from movies.ts for better maintainability

import { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { insertCharacterTranslations } from '../lib/movie-helpers.js';

export default async function movieCastRoutes(fastify: FastifyInstance) {
  // Add cast member to movie
  fastify.post<{
    Params: { id: string };
    Body: {
      person_id: number;
      character: { en: string; lo?: string };
      order?: number;
    };
  }>('/movies/:id/cast', async (request, reply) => {
    try {
      const { id: movieId } = request.params;
      const { person_id, character, order } = request.body;

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

      // Get the next order number if not provided
      let castOrder = order;
      if (castOrder === undefined) {
        const existingCast = await db.select({ order: schema.movieCast.order })
          .from(schema.movieCast)
          .where(eq(schema.movieCast.movieId, movieId));
        castOrder = existingCast.length > 0 ? Math.max(...existingCast.map(c => c.order)) + 1 : 0;
      }

      // Insert cast record
      await db.insert(schema.movieCast).values({
        movieId,
        personId: person_id,
        order: castOrder,
      });

      // Insert character translations
      await insertCharacterTranslations(db, schema, movieId, person_id, character);

      return { success: true, message: 'Cast member added successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to add cast member' });
    }
  });

  // Remove cast member from movie
  fastify.delete<{
    Params: { id: string; personId: string };
  }>('/movies/:id/cast/:personId', async (request, reply) => {
    try {
      const { id: movieId, personId } = request.params;
      const personIdNum = parseInt(personId);

      // Delete cast translations first
      await db.delete(schema.movieCastTranslations)
        .where(sql`${schema.movieCastTranslations.movieId} = ${movieId} AND ${schema.movieCastTranslations.personId} = ${personIdNum}`);

      // Delete cast record
      await db.delete(schema.movieCast)
        .where(sql`${schema.movieCast.movieId} = ${movieId} AND ${schema.movieCast.personId} = ${personIdNum}`);

      return { success: true, message: 'Cast member removed successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to remove cast member' });
    }
  });
}
