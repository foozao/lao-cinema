// Award Shows routes

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, sql, and, desc, asc } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { buildInClause } from '../lib/query-helpers.js';
import { logAuditFromRequest } from '../lib/audit-service.js';
import { buildLocalizedText } from '../lib/translation-helpers.js';

export default async function awardShowsRoutes(fastify: FastifyInstance) {
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
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'create',
        'settings',
        newShow.id,
        name.en,
        {
          show_id: { before: null, after: newShow.id },
          name_en: { before: null, after: name.en },
          name_lo: { before: null, after: name.lo || null },
          country: { before: null, after: country || null },
        }
      );
      
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
            const [existingTrans] = await db.select().from(schema.awardShowTranslations)
              .where(and(eq(schema.awardShowTranslations.showId, id), eq(schema.awardShowTranslations.language, lang)))
              .limit(1);
            
            if (existingTrans) {
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
      
      // Log audit event
      const translations = await db.select().from(schema.awardShowTranslations)
        .where(eq(schema.awardShowTranslations.showId, id));
      const showName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      await logAuditFromRequest(
        request,
        'update',
        'settings',
        id,
        showName
      );
      
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
      
      // Get show name for audit log before deletion
      const translations = await db.select().from(schema.awardShowTranslations)
        .where(eq(schema.awardShowTranslations.showId, id));
      const showName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      
      await db.delete(schema.awardShows).where(eq(schema.awardShows.id, id));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'settings',
        id,
        showName,
        {
          show_id: { before: id, after: null },
          name: { before: showName, after: null },
        }
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete award show');
    }
  });
}
