// Movie-Production Company routes: Add/remove production companies from movies

import { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

export default async function movieProductionCompaniesRoutes(fastify: FastifyInstance) {
  // Add production company to movie
  fastify.post<{
    Params: { movieId: string };
    Body: {
      company_id: number;
      order?: number;
    };
  }>('/movies/:movieId/production-companies', async (request, reply) => {
    try {
      const { movieId } = request.params;
      const { company_id, order } = request.body;

      // Verify movie exists
      const [movie] = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, movieId))
        .limit(1);

      if (!movie) {
        return reply.status(404).send({ error: 'Movie not found' });
      }

      // Verify production company exists
      const [company] = await db.select()
        .from(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, company_id))
        .limit(1);

      if (!company) {
        return reply.status(404).send({ error: 'Production company not found' });
      }

      // Calculate order if not provided
      let companyOrder = order;
      if (companyOrder === undefined) {
        const existing = await db.select({ order: schema.movieProductionCompanies.order })
          .from(schema.movieProductionCompanies)
          .where(eq(schema.movieProductionCompanies.movieId, movieId));
        companyOrder = existing.length > 0 ? Math.max(...existing.map(c => c.order || 0)) + 1 : 0;
      }

      // Insert movie-production company relationship
      await db.insert(schema.movieProductionCompanies).values({
        movieId,
        companyId: company_id,
        order: companyOrder,
      }).onConflictDoNothing();

      // Get company translations for response
      const translations = await db.select()
        .from(schema.productionCompanyTranslations)
        .where(eq(schema.productionCompanyTranslations.companyId, company_id));

      const name: Record<string, string> = {};
      for (const trans of translations) {
        name[trans.language] = trans.name;
      }

      return reply.status(201).send({
        company: {
          id: company.id,
          name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
          logo_path: company.logoPath,
          origin_country: company.originCountry,
        },
        order: companyOrder,
      });
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to add production company to movie' });
    }
  });

  // Remove production company from movie
  fastify.delete<{
    Params: { movieId: string; companyId: string };
  }>('/movies/:movieId/production-companies/:companyId', async (request, reply) => {
    try {
      const { movieId, companyId } = request.params;
      const companyIdNum = parseInt(companyId);

      const deleted = await db.delete(schema.movieProductionCompanies)
        .where(sql`${schema.movieProductionCompanies.movieId} = ${movieId} AND ${schema.movieProductionCompanies.companyId} = ${companyIdNum}`)
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({ error: 'Production company not associated with this movie' });
      }

      return { success: true, message: 'Production company removed from movie' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to remove production company from movie' });
    }
  });

  // Update production company order for a movie
  fastify.patch<{
    Params: { movieId: string; companyId: string };
    Body: { order: number };
  }>('/movies/:movieId/production-companies/:companyId', async (request, reply) => {
    try {
      const { movieId, companyId } = request.params;
      const { order } = request.body;
      const companyIdNum = parseInt(companyId);

      const [updated] = await db.update(schema.movieProductionCompanies)
        .set({ order })
        .where(sql`${schema.movieProductionCompanies.movieId} = ${movieId} AND ${schema.movieProductionCompanies.companyId} = ${companyIdNum}`)
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Production company not associated with this movie' });
      }

      return { success: true, order };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to update production company order' });
    }
  });
}
