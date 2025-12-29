// Award Editions routes

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, and, asc } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { buildInClause } from '../lib/query-helpers.js';
import { logAuditFromRequest } from '../lib/audit-service.js';
import { buildLocalizedText } from '../lib/translation-helpers.js';

export default async function awardEditionsRoutes(fastify: FastifyInstance) {
  // Get edition with full nominations
  fastify.get<{ Params: { id: string } }>('/awards/editions/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [edition] = await db.select().from(schema.awardEditions).where(eq(schema.awardEditions.id, id)).limit(1);
      if (!edition) {
        return sendNotFound(reply, 'Award edition not found');
      }
      
      // Get show info
      const [show] = await db.select().from(schema.awardShows).where(eq(schema.awardShows.id, edition.showId)).limit(1);
      const showTrans = await db.select().from(schema.awardShowTranslations).where(eq(schema.awardShowTranslations.showId, edition.showId));
      
      // Get edition translations
      const editionTrans = await db.select().from(schema.awardEditionTranslations).where(eq(schema.awardEditionTranslations.editionId, id));
      
      // Get categories for this show
      const categories = await db.select().from(schema.awardCategories)
        .where(eq(schema.awardCategories.showId, edition.showId))
        .orderBy(asc(schema.awardCategories.sortOrder));
      
      const categoryIds = categories.map(c => c.id);
      const categoryTrans = categoryIds.length > 0
        ? await db.select().from(schema.awardCategoryTranslations).where(buildInClause(schema.awardCategoryTranslations.categoryId, categoryIds))
        : [];
      
      // Get nominations for this edition
      const nominations = await db.select().from(schema.awardNominations)
        .where(eq(schema.awardNominations.editionId, id))
        .orderBy(asc(schema.awardNominations.sortOrder));
      
      const nominationIds = nominations.map(n => n.id);
      const nominationTrans = nominationIds.length > 0
        ? await db.select().from(schema.awardNominationTranslations).where(buildInClause(schema.awardNominationTranslations.nominationId, nominationIds))
        : [];
      
      // Get people and movies for nominations
      const personIds = [...new Set(nominations.filter(n => n.personId).map(n => n.personId!))];
      const movieIds = [...new Set([
        ...nominations.filter(n => n.movieId).map(n => n.movieId!),
        ...nominations.filter(n => n.forMovieId).map(n => n.forMovieId!)
      ])];
      
      const people = personIds.length > 0
        ? await db.select().from(schema.people).where(buildInClause(schema.people.id, personIds))
        : [];
      
      const peopleTrans = personIds.length > 0
        ? await db.select().from(schema.peopleTranslations).where(buildInClause(schema.peopleTranslations.personId, personIds))
        : [];
      
      const movies = movieIds.length > 0
        ? await db.select().from(schema.movies).where(buildInClause(schema.movies.id, movieIds))
        : [];
      
      const movieTrans = movieIds.length > 0
        ? await db.select().from(schema.movieTranslations).where(buildInClause(schema.movieTranslations.movieId, movieIds))
        : [];
      
      // Build response
      const categoriesWithNominations = categories.map(category => {
        const catTrans = categoryTrans.filter(t => t.categoryId === category.id);
        const catNominations = nominations.filter(n => n.categoryId === category.id);
        
        return {
          id: category.id,
          name: buildLocalizedText(catTrans, 'name'),
          description: buildLocalizedText(catTrans, 'description'),
          nominee_type: category.nomineeType,
          sort_order: category.sortOrder,
          nominations: catNominations.map(nom => {
            const nomTrans = nominationTrans.filter(t => t.nominationId === nom.id);
            
            let nominee = null;
            if (nom.personId) {
              const person = people.find(p => p.id === nom.personId);
              const pTrans = peopleTrans.filter(t => t.personId === nom.personId);
              nominee = person ? {
                type: 'person',
                id: person.id,
                name: buildLocalizedText(pTrans, 'name'),
                profile_path: person.profilePath,
              } : null;
            } else if (nom.movieId) {
              const movie = movies.find(m => m.id === nom.movieId);
              const mTrans = movieTrans.filter(t => t.movieId === nom.movieId);
              nominee = movie ? {
                type: 'movie',
                id: movie.id,
                title: buildLocalizedText(mTrans, 'title'),
                poster_path: movie.posterPath,
              } : null;
            }
            
            let forMovie = null;
            if (nom.forMovieId) {
              const movie = movies.find(m => m.id === nom.forMovieId);
              const mTrans = movieTrans.filter(t => t.movieId === nom.forMovieId);
              forMovie = movie ? {
                id: movie.id,
                title: buildLocalizedText(mTrans, 'title'),
                poster_path: movie.posterPath,
              } : null;
            }
            
            return {
              id: nom.id,
              nominee,
              for_movie: forMovie,
              work_title: buildLocalizedText(nomTrans, 'workTitle'),
              notes: buildLocalizedText(nomTrans, 'notes'),
              recognition_type: buildLocalizedText(nomTrans, 'recognitionType'),
              is_winner: nom.isWinner,
              sort_order: nom.sortOrder,
            };
          }),
        };
      });
      
      return {
        id: edition.id,
        show: {
          id: show.id,
          slug: show.slug,
          name: buildLocalizedText(showTrans, 'name'),
        },
        year: edition.year,
        edition_number: edition.editionNumber,
        name: buildLocalizedText(editionTrans, 'name'),
        theme: buildLocalizedText(editionTrans, 'theme'),
        start_date: edition.startDate,
        end_date: edition.endDate,
        categories: categoriesWithNominations,
        created_at: edition.createdAt,
        updated_at: edition.updatedAt,
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch award edition');
    }
  });

  // Create edition
  fastify.post<{
    Body: {
      show_id: string;
      year: number;
      edition_number?: number;
      name?: { en?: string; lo?: string };
      theme?: { en?: string; lo?: string };
      start_date?: string;
      end_date?: string;
    };
  }>('/awards/editions', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { show_id, year, edition_number, name, theme, start_date, end_date } = request.body;
      
      if (!show_id || !year) {
        return sendBadRequest(reply, 'show_id and year are required');
      }
      
      // Verify show exists
      const [show] = await db.select().from(schema.awardShows).where(eq(schema.awardShows.id, show_id)).limit(1);
      if (!show) {
        return sendNotFound(reply, 'Award show not found');
      }
      
      const [newEdition] = await db.insert(schema.awardEditions).values({
        showId: show_id,
        year,
        editionNumber: edition_number || null,
        startDate: start_date || null,
        endDate: end_date || null,
      }).returning();
      
      // Insert translations if provided
      if (name?.en || theme?.en) {
        await db.insert(schema.awardEditionTranslations).values({
          editionId: newEdition.id,
          language: 'en',
          name: name?.en || null,
          theme: theme?.en || null,
        });
      }
      
      if (name?.lo || theme?.lo) {
        await db.insert(schema.awardEditionTranslations).values({
          editionId: newEdition.id,
          language: 'lo',
          name: name?.lo || null,
          theme: theme?.lo || null,
        });
      }
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'create',
        'settings',
        newEdition.id,
        `${show.slug || 'Award'} ${year}`,
        {
          edition_id: { before: null, after: newEdition.id },
          show_id: { before: null, after: show_id },
          year: { before: null, after: year },
        }
      );
      
      return sendCreated(reply, {
        id: newEdition.id,
        show_id: newEdition.showId,
        year: newEdition.year,
        edition_number: newEdition.editionNumber,
        name,
        theme,
        start_date: newEdition.startDate,
        end_date: newEdition.endDate,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create award edition');
    }
  });

  // Update edition
  fastify.put<{
    Params: { id: string };
    Body: {
      year?: number;
      edition_number?: number;
      name?: { en?: string; lo?: string };
      theme?: { en?: string; lo?: string };
      start_date?: string;
      end_date?: string;
    };
  }>('/awards/editions/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      const [existing] = await db.select().from(schema.awardEditions).where(eq(schema.awardEditions.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Award edition not found');
      }
      
      const editionUpdates: any = { updatedAt: new Date() };
      if (updates.year !== undefined) editionUpdates.year = updates.year;
      if (updates.edition_number !== undefined) editionUpdates.editionNumber = updates.edition_number || null;
      if (updates.start_date !== undefined) editionUpdates.startDate = updates.start_date || null;
      if (updates.end_date !== undefined) editionUpdates.endDate = updates.end_date || null;
      
      await db.update(schema.awardEditions).set(editionUpdates).where(eq(schema.awardEditions.id, id));
      
      // Update translations
      if (updates.name || updates.theme) {
        for (const lang of ['en', 'lo'] as const) {
          const nameVal = updates.name?.[lang];
          const themeVal = updates.theme?.[lang];
          
          if (nameVal !== undefined || themeVal !== undefined) {
            const [existingTrans] = await db.select().from(schema.awardEditionTranslations)
              .where(and(eq(schema.awardEditionTranslations.editionId, id), eq(schema.awardEditionTranslations.language, lang)))
              .limit(1);
            
            if (existingTrans) {
              const transUpdates: any = { updatedAt: new Date() };
              if (nameVal !== undefined) transUpdates.name = nameVal || null;
              if (themeVal !== undefined) transUpdates.theme = themeVal || null;
              await db.update(schema.awardEditionTranslations).set(transUpdates)
                .where(and(eq(schema.awardEditionTranslations.editionId, id), eq(schema.awardEditionTranslations.language, lang)));
            } else if (nameVal || themeVal) {
              await db.insert(schema.awardEditionTranslations).values({
                editionId: id,
                language: lang,
                name: nameVal || null,
                theme: themeVal || null,
              });
            }
          }
        }
      }
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'update',
        'settings',
        id,
        `Edition ${existing.year}`
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update award edition');
    }
  });

  // Delete edition
  fastify.delete<{ Params: { id: string } }>('/awards/editions/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.awardEditions).where(eq(schema.awardEditions.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Award edition not found');
      }
      
      await db.delete(schema.awardEditions).where(eq(schema.awardEditions.id, id));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'settings',
        id,
        `Edition ${existing.year}`,
        {
          edition_id: { before: id, after: null },
          year: { before: existing.year, after: null },
        }
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete award edition');
    }
  });
}
