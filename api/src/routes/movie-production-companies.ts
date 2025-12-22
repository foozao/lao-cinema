// Movie-Production Company routes: Add/remove production companies from movies

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

export default async function movieProductionCompaniesRoutes(fastify: FastifyInstance) {
  // Add production company to movie
  fastify.post<{
    Params: { movieId: string };
    Body: {
      company_id: number;
      order?: number;
    };
  }>('/movies/:movieId/production-companies', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { movieId } = request.params;
      const { company_id, order } = request.body;

      // Verify movie exists
      const [movie] = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, movieId))
        .limit(1);

      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }

      // Verify production company exists
      const [company] = await db.select()
        .from(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, company_id))
        .limit(1);

      if (!company) {
        return sendNotFound(reply, 'Production company not found');
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

      // Log audit event
      const companyName = name.en || name.lo || 'Unknown';
      await logAuditFromRequest(
        request,
        'add_production_company',
        'movie',
        movieId,
        `Added ${companyName}`,
        {
          company_id: { before: null, after: company_id },
          company_name: { before: null, after: companyName },
          order: { before: null, after: companyOrder },
        }
      );

      return sendCreated(reply, {
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
      sendInternalError(reply, 'Failed to add production company to movie');
    }
  });

  // Remove production company from movie
  fastify.delete<{
    Params: { movieId: string; companyId: string };
  }>('/movies/:movieId/production-companies/:companyId', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { movieId, companyId } = request.params;
      const companyIdNum = parseInt(companyId);

      // Get company name for audit log before deletion
      const translations = await db.select()
        .from(schema.productionCompanyTranslations)
        .where(eq(schema.productionCompanyTranslations.companyId, companyIdNum));
      const companyName = translations.find(t => t.language === 'en')?.name || 'Unknown';

      const deleted = await db.delete(schema.movieProductionCompanies)
        .where(sql`${schema.movieProductionCompanies.movieId} = ${movieId} AND ${schema.movieProductionCompanies.companyId} = ${companyIdNum}`)
        .returning();

      if (deleted.length === 0) {
        return sendNotFound(reply, 'Production company not associated with this movie');
      }

      // Log audit event
      await logAuditFromRequest(
        request,
        'remove_production_company',
        'movie',
        movieId,
        `Removed ${companyName}`,
        {
          company_id: { before: companyIdNum, after: null },
          company_name: { before: companyName, after: null },
        }
      );

      return { success: true, message: 'Production company removed from movie' };
    } catch (error) {
      fastify.log.error(error);
      sendInternalError(reply, 'Failed to remove production company from movie');
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
        return sendNotFound(reply, 'Production company not associated with this movie');
      }

      return { success: true, order };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update production company order');
    }
  });
}
