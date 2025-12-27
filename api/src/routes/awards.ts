// Awards routes - Award shows, editions, categories, and nominations

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, sql, and, desc, asc } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { buildInClause } from '../lib/query-helpers.js';

// Helper to build localized text from translations
function buildLocalizedText(translations: Array<{ language: string; [key: string]: any }>, field: string): { en?: string; lo?: string } {
  const result: { en?: string; lo?: string } = {};
  for (const trans of translations) {
    if (trans[field]) {
      result[trans.language as 'en' | 'lo'] = trans[field];
    }
  }
  return result;
}

export default async function awardsRoutes(fastify: FastifyInstance) {
  // ==========================================================================
  // AWARD SHOWS
  // ==========================================================================

  // Get all award shows
  fastify.get('/awards/shows', async (request, reply) => {
    try {
      const shows = await db.select().from(schema.awardShows).orderBy(asc(schema.awardShows.createdAt));
      
      const showIds = shows.map(s => s.id);
      const translations = showIds.length > 0
        ? await db.select().from(schema.awardShowTranslations).where(buildInClause(schema.awardShowTranslations.showId, showIds))
        : [];
      
      // Get edition counts
      const editionCounts = showIds.length > 0
        ? await db.select({
            showId: schema.awardEditions.showId,
            count: sql<number>`count(*)::int`
          })
          .from(schema.awardEditions)
          .where(buildInClause(schema.awardEditions.showId, showIds))
          .groupBy(schema.awardEditions.showId)
        : [];
      
      const showsWithTranslations = shows.map(show => {
        const showTrans = translations.filter(t => t.showId === show.id);
        const editionCount = editionCounts.find(e => e.showId === show.id)?.count || 0;
        
        return {
          id: show.id,
          slug: show.slug,
          name: buildLocalizedText(showTrans, 'name'),
          description: buildLocalizedText(showTrans, 'description'),
          country: show.country,
          city: show.city,
          website_url: show.websiteUrl,
          logo_path: show.logoPath,
          edition_count: editionCount,
          created_at: show.createdAt,
          updated_at: show.updatedAt,
        };
      });
      
      return { shows: showsWithTranslations };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch award shows');
    }
  });

  // Get single award show
  fastify.get<{ Params: { id: string } }>('/awards/shows/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [show] = await db.select().from(schema.awardShows).where(eq(schema.awardShows.id, id)).limit(1);
      if (!show) {
        return sendNotFound(reply, 'Award show not found');
      }
      
      const translations = await db.select().from(schema.awardShowTranslations).where(eq(schema.awardShowTranslations.showId, id));
      const editions = await db.select().from(schema.awardEditions).where(eq(schema.awardEditions.showId, id)).orderBy(desc(schema.awardEditions.year));
      const categories = await db.select().from(schema.awardCategories).where(eq(schema.awardCategories.showId, id)).orderBy(asc(schema.awardCategories.sortOrder));
      
      // Get translations for editions and categories
      const editionIds = editions.map(e => e.id);
      const categoryIds = categories.map(c => c.id);
      
      const editionTrans = editionIds.length > 0
        ? await db.select().from(schema.awardEditionTranslations).where(buildInClause(schema.awardEditionTranslations.editionId, editionIds))
        : [];
      
      const categoryTrans = categoryIds.length > 0
        ? await db.select().from(schema.awardCategoryTranslations).where(buildInClause(schema.awardCategoryTranslations.categoryId, categoryIds))
        : [];
      
      return {
        id: show.id,
        slug: show.slug,
        name: buildLocalizedText(translations, 'name'),
        description: buildLocalizedText(translations, 'description'),
        country: show.country,
        city: show.city,
        website_url: show.websiteUrl,
        logo_path: show.logoPath,
        editions: editions.map(edition => ({
          id: edition.id,
          year: edition.year,
          edition_number: edition.editionNumber,
          name: buildLocalizedText(editionTrans.filter(t => t.editionId === edition.id), 'name'),
          theme: buildLocalizedText(editionTrans.filter(t => t.editionId === edition.id), 'theme'),
          start_date: edition.startDate,
          end_date: edition.endDate,
        })),
        categories: categories.map(category => ({
          id: category.id,
          name: buildLocalizedText(categoryTrans.filter(t => t.categoryId === category.id), 'name'),
          description: buildLocalizedText(categoryTrans.filter(t => t.categoryId === category.id), 'description'),
          nominee_type: category.nomineeType,
          sort_order: category.sortOrder,
        })),
        created_at: show.createdAt,
        updated_at: show.updatedAt,
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch award show');
    }
  });

  // Create award show
  fastify.post<{
    Body: {
      slug?: string;
      name: { en: string; lo?: string };
      description?: { en?: string; lo?: string };
      country?: string;
      city?: string;
      website_url?: string;
      logo_path?: string;
    };
  }>('/awards/shows', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { slug, name, description, country, city, website_url, logo_path } = request.body;
      
      if (!name?.en) {
        return sendBadRequest(reply, 'English name is required');
      }
      
      const [newShow] = await db.insert(schema.awardShows).values({
        slug: slug || null,
        country: country || null,
        city: city || null,
        websiteUrl: website_url || null,
        logoPath: logo_path || null,
      }).returning();
      
      // Insert translations
      await db.insert(schema.awardShowTranslations).values({
        showId: newShow.id,
        language: 'en',
        name: name.en,
        description: description?.en || null,
      });
      
      if (name.lo) {
        await db.insert(schema.awardShowTranslations).values({
          showId: newShow.id,
          language: 'lo',
          name: name.lo,
          description: description?.lo || null,
        });
      }
      
      return sendCreated(reply, {
        id: newShow.id,
        slug: newShow.slug,
        name,
        description,
        country: newShow.country,
        city: newShow.city,
        website_url: newShow.websiteUrl,
        logo_path: newShow.logoPath,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create award show');
    }
  });

  // Update award show
  fastify.put<{
    Params: { id: string };
    Body: {
      slug?: string;
      name?: { en?: string; lo?: string };
      description?: { en?: string; lo?: string };
      country?: string;
      city?: string;
      website_url?: string;
      logo_path?: string;
    };
  }>('/awards/shows/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      const [existing] = await db.select().from(schema.awardShows).where(eq(schema.awardShows.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Award show not found');
      }
      
      // Update main record
      const showUpdates: any = { updatedAt: new Date() };
      if (updates.slug !== undefined) showUpdates.slug = updates.slug || null;
      if (updates.country !== undefined) showUpdates.country = updates.country || null;
      if (updates.city !== undefined) showUpdates.city = updates.city || null;
      if (updates.website_url !== undefined) showUpdates.websiteUrl = updates.website_url || null;
      if (updates.logo_path !== undefined) showUpdates.logoPath = updates.logo_path || null;
      
      await db.update(schema.awardShows).set(showUpdates).where(eq(schema.awardShows.id, id));
      
      // Update translations
      if (updates.name || updates.description) {
        for (const lang of ['en', 'lo'] as const) {
          const nameVal = updates.name?.[lang];
          const descVal = updates.description?.[lang];
          
          if (nameVal !== undefined || descVal !== undefined) {
            const [existing] = await db.select().from(schema.awardShowTranslations)
              .where(and(eq(schema.awardShowTranslations.showId, id), eq(schema.awardShowTranslations.language, lang)))
              .limit(1);
            
            if (existing) {
              const transUpdates: any = { updatedAt: new Date() };
              if (nameVal !== undefined) transUpdates.name = nameVal;
              if (descVal !== undefined) transUpdates.description = descVal || null;
              await db.update(schema.awardShowTranslations).set(transUpdates)
                .where(and(eq(schema.awardShowTranslations.showId, id), eq(schema.awardShowTranslations.language, lang)));
            } else if (nameVal) {
              await db.insert(schema.awardShowTranslations).values({
                showId: id,
                language: lang,
                name: nameVal,
                description: descVal || null,
              });
            }
          }
        }
      }
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update award show');
    }
  });

  // Delete award show
  fastify.delete<{ Params: { id: string } }>('/awards/shows/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.awardShows).where(eq(schema.awardShows.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Award show not found');
      }
      
      await db.delete(schema.awardShows).where(eq(schema.awardShows.id, id));
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete award show');
    }
  });

  // ==========================================================================
  // AWARD EDITIONS
  // ==========================================================================

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
            const [existing] = await db.select().from(schema.awardEditionTranslations)
              .where(and(eq(schema.awardEditionTranslations.editionId, id), eq(schema.awardEditionTranslations.language, lang)))
              .limit(1);
            
            if (existing) {
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
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete award edition');
    }
  });

  // ==========================================================================
  // AWARD CATEGORIES
  // ==========================================================================

  // Create category
  fastify.post<{
    Body: {
      show_id: string;
      name: { en: string; lo?: string };
      description?: { en?: string; lo?: string };
      nominee_type: 'person' | 'movie';
      sort_order?: number;
    };
  }>('/awards/categories', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { show_id, name, description, nominee_type, sort_order } = request.body;
      
      if (!show_id || !name?.en || !nominee_type) {
        return sendBadRequest(reply, 'show_id, English name, and nominee_type are required');
      }
      
      const [show] = await db.select().from(schema.awardShows).where(eq(schema.awardShows.id, show_id)).limit(1);
      if (!show) {
        return sendNotFound(reply, 'Award show not found');
      }
      
      const [newCategory] = await db.insert(schema.awardCategories).values({
        showId: show_id,
        nomineeType: nominee_type,
        sortOrder: sort_order || 0,
      }).returning();
      
      await db.insert(schema.awardCategoryTranslations).values({
        categoryId: newCategory.id,
        language: 'en',
        name: name.en,
        description: description?.en || null,
      });
      
      if (name.lo) {
        await db.insert(schema.awardCategoryTranslations).values({
          categoryId: newCategory.id,
          language: 'lo',
          name: name.lo,
          description: description?.lo || null,
        });
      }
      
      return sendCreated(reply, {
        id: newCategory.id,
        show_id: newCategory.showId,
        name,
        description,
        nominee_type: newCategory.nomineeType,
        sort_order: newCategory.sortOrder,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create award category');
    }
  });

  // Update category
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: { en?: string; lo?: string };
      description?: { en?: string; lo?: string };
      nominee_type?: 'person' | 'movie';
      sort_order?: number;
    };
  }>('/awards/categories/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      const [existing] = await db.select().from(schema.awardCategories).where(eq(schema.awardCategories.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Award category not found');
      }
      
      const categoryUpdates: any = { updatedAt: new Date() };
      if (updates.nominee_type !== undefined) categoryUpdates.nomineeType = updates.nominee_type;
      if (updates.sort_order !== undefined) categoryUpdates.sortOrder = updates.sort_order;
      
      await db.update(schema.awardCategories).set(categoryUpdates).where(eq(schema.awardCategories.id, id));
      
      // Update translations
      if (updates.name || updates.description) {
        for (const lang of ['en', 'lo'] as const) {
          const nameVal = updates.name?.[lang];
          const descVal = updates.description?.[lang];
          
          if (nameVal !== undefined || descVal !== undefined) {
            const [existing] = await db.select().from(schema.awardCategoryTranslations)
              .where(and(eq(schema.awardCategoryTranslations.categoryId, id), eq(schema.awardCategoryTranslations.language, lang)))
              .limit(1);
            
            if (existing) {
              const transUpdates: any = { updatedAt: new Date() };
              if (nameVal !== undefined) transUpdates.name = nameVal;
              if (descVal !== undefined) transUpdates.description = descVal || null;
              await db.update(schema.awardCategoryTranslations).set(transUpdates)
                .where(and(eq(schema.awardCategoryTranslations.categoryId, id), eq(schema.awardCategoryTranslations.language, lang)));
            } else if (nameVal) {
              await db.insert(schema.awardCategoryTranslations).values({
                categoryId: id,
                language: lang,
                name: nameVal,
                description: descVal || null,
              });
            }
          }
        }
      }
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update award category');
    }
  });

  // Delete category
  fastify.delete<{ Params: { id: string } }>('/awards/categories/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.awardCategories).where(eq(schema.awardCategories.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Award category not found');
      }
      
      await db.delete(schema.awardCategories).where(eq(schema.awardCategories.id, id));
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete award category');
    }
  });

  // ==========================================================================
  // AWARD NOMINATIONS
  // ==========================================================================

  // Create nomination
  fastify.post<{
    Body: {
      edition_id: string;
      category_id: string;
      person_id?: number;
      movie_id?: string;
      for_movie_id?: string;
      work_title?: { en?: string; lo?: string };
      notes?: { en?: string; lo?: string };
      recognition_type?: { en?: string; lo?: string };
      is_winner?: boolean;
      sort_order?: number;
    };
  }>('/awards/nominations', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { edition_id, category_id, person_id, movie_id, for_movie_id, work_title, notes, recognition_type, is_winner, sort_order } = request.body;
      
      if (!edition_id || !category_id) {
        return sendBadRequest(reply, 'edition_id and category_id are required');
      }
      
      if (!person_id && !movie_id) {
        return sendBadRequest(reply, 'Either person_id or movie_id is required');
      }
      
      // Verify edition and category exist
      const [edition] = await db.select().from(schema.awardEditions).where(eq(schema.awardEditions.id, edition_id)).limit(1);
      if (!edition) {
        return sendNotFound(reply, 'Award edition not found');
      }
      
      const [category] = await db.select().from(schema.awardCategories).where(eq(schema.awardCategories.id, category_id)).limit(1);
      if (!category) {
        return sendNotFound(reply, 'Award category not found');
      }
      
      const [newNomination] = await db.insert(schema.awardNominations).values({
        editionId: edition_id,
        categoryId: category_id,
        personId: person_id || null,
        movieId: movie_id || null,
        forMovieId: for_movie_id || null,
        isWinner: is_winner || false,
        sortOrder: sort_order || 0,
      }).returning();
      
      // Insert translations if provided
      if (work_title?.en || notes?.en || recognition_type?.en) {
        await db.insert(schema.awardNominationTranslations).values({
          nominationId: newNomination.id,
          language: 'en',
          workTitle: work_title?.en || null,
          notes: notes?.en || null,
          recognitionType: recognition_type?.en || null,
        });
      }
      
      if (work_title?.lo || notes?.lo || recognition_type?.lo) {
        await db.insert(schema.awardNominationTranslations).values({
          nominationId: newNomination.id,
          language: 'lo',
          workTitle: work_title?.lo || null,
          notes: notes?.lo || null,
          recognitionType: recognition_type?.lo || null,
        });
      }
      
      return sendCreated(reply, {
        id: newNomination.id,
        edition_id: newNomination.editionId,
        category_id: newNomination.categoryId,
        person_id: newNomination.personId,
        movie_id: newNomination.movieId,
        for_movie_id: newNomination.forMovieId,
        work_title,
        notes,
        is_winner: newNomination.isWinner,
        sort_order: newNomination.sortOrder,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create nomination');
    }
  });

  // Update nomination
  fastify.put<{
    Params: { id: string };
    Body: {
      person_id?: number;
      movie_id?: string;
      for_movie_id?: string;
      work_title?: { en?: string; lo?: string };
      notes?: { en?: string; lo?: string };
      recognition_type?: { en?: string; lo?: string };
      is_winner?: boolean;
      sort_order?: number;
    };
  }>('/awards/nominations/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      const [existing] = await db.select().from(schema.awardNominations).where(eq(schema.awardNominations.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Nomination not found');
      }
      
      const nominationUpdates: any = { updatedAt: new Date() };
      if (updates.person_id !== undefined) nominationUpdates.personId = updates.person_id || null;
      if (updates.movie_id !== undefined) nominationUpdates.movieId = updates.movie_id || null;
      if (updates.for_movie_id !== undefined) nominationUpdates.forMovieId = updates.for_movie_id || null;
      if (updates.is_winner !== undefined) nominationUpdates.isWinner = updates.is_winner;
      if (updates.sort_order !== undefined) nominationUpdates.sortOrder = updates.sort_order;
      
      await db.update(schema.awardNominations).set(nominationUpdates).where(eq(schema.awardNominations.id, id));
      
      // Update translations
      if (updates.work_title || updates.notes || updates.recognition_type) {
        for (const lang of ['en', 'lo'] as const) {
          const workTitleVal = updates.work_title?.[lang];
          const notesVal = updates.notes?.[lang];
          const recognitionTypeVal = updates.recognition_type?.[lang];
          
          if (workTitleVal !== undefined || notesVal !== undefined || recognitionTypeVal !== undefined) {
            const [existing] = await db.select().from(schema.awardNominationTranslations)
              .where(and(eq(schema.awardNominationTranslations.nominationId, id), eq(schema.awardNominationTranslations.language, lang)))
              .limit(1);
            
            if (existing) {
              const transUpdates: any = { updatedAt: new Date() };
              if (workTitleVal !== undefined) transUpdates.workTitle = workTitleVal || null;
              if (notesVal !== undefined) transUpdates.notes = notesVal || null;
              if (recognitionTypeVal !== undefined) transUpdates.recognitionType = recognitionTypeVal || null;
              await db.update(schema.awardNominationTranslations).set(transUpdates)
                .where(and(eq(schema.awardNominationTranslations.nominationId, id), eq(schema.awardNominationTranslations.language, lang)));
            } else if (workTitleVal || notesVal || recognitionTypeVal) {
              await db.insert(schema.awardNominationTranslations).values({
                nominationId: id,
                language: lang,
                workTitle: workTitleVal || null,
                notes: notesVal || null,
                recognitionType: recognitionTypeVal || null,
              });
            }
          }
        }
      }
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update nomination');
    }
  });

  // Delete nomination
  fastify.delete<{ Params: { id: string } }>('/awards/nominations/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.awardNominations).where(eq(schema.awardNominations.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Nomination not found');
      }
      
      await db.delete(schema.awardNominations).where(eq(schema.awardNominations.id, id));
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete nomination');
    }
  });

  // Get all winners and nominees across all awards (for showcase)
  fastify.get('/awards/winners', async (request, reply) => {
    try {
      // Get all nominations (winners and nominees) with related data
      const winners = await db.select()
        .from(schema.awardNominations)
        .orderBy(desc(schema.awardNominations.createdAt))
        .limit(100);
      
      if (winners.length === 0) {
        return { winners: [] };
      }
      
      // Get all related data
      const editionIds = [...new Set(winners.map(w => w.editionId))];
      const categoryIds = [...new Set(winners.map(w => w.categoryId))];
      const personIds = [...new Set(winners.filter(w => w.personId).map(w => w.personId!))];
      const movieIds = [...new Set(winners.map(w => w.movieId).filter(Boolean).concat(winners.map(w => w.forMovieId).filter(Boolean)))] as string[];
      
      const editions = await db.select().from(schema.awardEditions).where(buildInClause(schema.awardEditions.id, editionIds));
      const categories = await db.select().from(schema.awardCategories).where(buildInClause(schema.awardCategories.id, categoryIds));
      const categoryTrans = await db.select().from(schema.awardCategoryTranslations).where(buildInClause(schema.awardCategoryTranslations.categoryId, categoryIds));
      const nominationTrans = await db.select().from(schema.awardNominationTranslations).where(buildInClause(schema.awardNominationTranslations.nominationId, winners.map(w => w.id)));
      
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
      
      // Get show data
      const showIds = [...new Set(editions.map(e => e.showId))];
      const shows = await db.select().from(schema.awardShows).where(buildInClause(schema.awardShows.id, showIds));
      const showTrans = await db.select().from(schema.awardShowTranslations).where(buildInClause(schema.awardShowTranslations.showId, showIds));
      
      // Format response
      const formattedWinners = winners.map(winner => {
        const edition = editions.find(e => e.id === winner.editionId);
        const show = edition ? shows.find(s => s.id === edition.showId) : null;
        const category = categories.find(c => c.id === winner.categoryId);
        const catTrans = categoryTrans.filter(t => t.categoryId === winner.categoryId);
        const nomTrans = nominationTrans.filter(t => t.nominationId === winner.id);
        
        let nominee = null;
        if (winner.personId) {
          const person = people.find(p => p.id === winner.personId);
          const pTrans = peopleTrans.filter(t => t.personId === winner.personId);
          nominee = person ? {
            type: 'person',
            id: person.id,
            name: buildLocalizedText(pTrans, 'name'),
            profile_path: person.profilePath,
          } : null;
        } else if (winner.movieId) {
          const movie = movies.find(m => m.id === winner.movieId);
          const mTrans = movieTrans.filter(t => t.movieId === winner.movieId);
          nominee = movie ? {
            type: 'movie',
            id: movie.id,
            title: buildLocalizedText(mTrans, 'title'),
            poster_path: movie.posterPath,
          } : null;
        }
        
        let forMovie = null;
        if (winner.forMovieId) {
          const movie = movies.find(m => m.id === winner.forMovieId);
          const mTrans = movieTrans.filter(t => t.movieId === winner.forMovieId);
          forMovie = movie ? {
            id: movie.id,
            title: buildLocalizedText(mTrans, 'title'),
            poster_path: movie.posterPath,
          } : null;
        }
        
        return {
          id: winner.id,
          nominee,
          for_movie: forMovie,
          is_winner: winner.isWinner,
          recognition_type: buildLocalizedText(nomTrans, 'recognitionType'),
          show: show ? {
            id: show.id,
            name: buildLocalizedText(showTrans.filter(t => t.showId === show.id), 'name'),
            country: show.country,
          } : null,
          edition: edition ? {
            id: edition.id,
            year: edition.year,
            edition_number: edition.editionNumber,
          } : null,
          category: category ? {
            id: category.id,
            name: buildLocalizedText(catTrans, 'name'),
            nominee_type: category.nomineeType,
          } : null,
        };
      });
      
      return { winners: formattedWinners };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch winners');
    }
  });

  // Set winner for a category in an edition
  fastify.post<{
    Body: {
      nomination_id: string;
    };
  }>('/awards/nominations/set-winner', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { nomination_id } = request.body;
      
      if (!nomination_id) {
        return sendBadRequest(reply, 'nomination_id is required');
      }
      
      const [nomination] = await db.select().from(schema.awardNominations).where(eq(schema.awardNominations.id, nomination_id)).limit(1);
      if (!nomination) {
        return sendNotFound(reply, 'Nomination not found');
      }
      
      // Clear any existing winners in this category for this edition
      await db.update(schema.awardNominations)
        .set({ isWinner: false, updatedAt: new Date() })
        .where(and(
          eq(schema.awardNominations.editionId, nomination.editionId),
          eq(schema.awardNominations.categoryId, nomination.categoryId)
        ));
      
      // Set the new winner
      await db.update(schema.awardNominations)
        .set({ isWinner: true, updatedAt: new Date() })
        .where(eq(schema.awardNominations.id, nomination_id));
      
      return { success: true, nomination_id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to set winner');
    }
  });
}
