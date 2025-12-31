// Accolade Events routes

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, sql, and, desc, asc } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { buildInClause } from '../lib/query-helpers.js';
import { logAuditFromRequest } from '../lib/audit-service.js';
import { buildLocalizedText } from '../lib/translation-helpers.js';

export default async function accoladeEventsRoutes(fastify: FastifyInstance) {
  // Get all accolade events
  fastify.get('/accolades/events', async (request, reply) => {
    try {
      const shows = await db.select().from(schema.accoladeEvents).orderBy(asc(schema.accoladeEvents.createdAt));
      
      const eventIds = shows.map(s => s.id);
      const translations = eventIds.length > 0
        ? await db.select().from(schema.accoladeEventTranslations).where(buildInClause(schema.accoladeEventTranslations.eventId, eventIds))
        : [];
      
      // Get edition counts
      const editionCounts = eventIds.length > 0
        ? await db.select({
            eventId: schema.accoladeEditions.eventId,
            count: sql<number>`count(*)::int`
          })
          .from(schema.accoladeEditions)
          .where(buildInClause(schema.accoladeEditions.eventId, eventIds))
          .groupBy(schema.accoladeEditions.eventId)
        : [];
      
      const showsWithTranslations = shows.map(show => {
        const eventTrans = translations.filter(t => t.eventId === show.id);
        const editionCount = editionCounts.find(e => e.eventId === show.id)?.count || 0;
        
        return {
          id: show.id,
          slug: show.slug,
          name: buildLocalizedText(eventTrans, 'name'),
          description: buildLocalizedText(eventTrans, 'description'),
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
      return sendInternalError(reply, 'Failed to fetch accolade events');
    }
  });

  // Get single accolade event
  fastify.get<{ Params: { id: string } }>('/accolades/events/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [show] = await db.select().from(schema.accoladeEvents).where(eq(schema.accoladeEvents.id, id)).limit(1);
      if (!show) {
        return sendNotFound(reply, 'Accolade event not found');
      }
      
      const translations = await db.select().from(schema.accoladeEventTranslations).where(eq(schema.accoladeEventTranslations.eventId, id));
      const editions = await db.select().from(schema.accoladeEditions).where(eq(schema.accoladeEditions.eventId, id)).orderBy(desc(schema.accoladeEditions.year));
      const categories = await db.select().from(schema.accoladeCategories).where(eq(schema.accoladeCategories.eventId, id)).orderBy(asc(schema.accoladeCategories.sortOrder));
      const sections = await db.select().from(schema.accoladeSections).where(eq(schema.accoladeSections.eventId, id)).orderBy(asc(schema.accoladeSections.sortOrder));
      
      // Get translations for editions, categories, and sections
      const editionIds = editions.map(e => e.id);
      const categoryIds = categories.map(c => c.id);
      const sectionIds = sections.map(s => s.id);
      
      const editionTrans = editionIds.length > 0
        ? await db.select().from(schema.accoladeEditionTranslations).where(buildInClause(schema.accoladeEditionTranslations.editionId, editionIds))
        : [];
      
      const categoryTrans = categoryIds.length > 0
        ? await db.select().from(schema.accoladeCategoryTranslations).where(buildInClause(schema.accoladeCategoryTranslations.categoryId, categoryIds))
        : [];
      
      const sectionTrans = sectionIds.length > 0
        ? await db.select().from(schema.accoladeSectionTranslations).where(buildInClause(schema.accoladeSectionTranslations.sectionId, sectionIds))
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
          section_id: category.sectionId,
          name: buildLocalizedText(categoryTrans.filter(t => t.categoryId === category.id), 'name'),
          description: buildLocalizedText(categoryTrans.filter(t => t.categoryId === category.id), 'description'),
          nominee_type: category.nomineeType,
          sort_order: category.sortOrder,
        })),
        sections: sections.map(section => ({
          id: section.id,
          event_id: section.eventId,
          name: buildLocalizedText(sectionTrans.filter(t => t.sectionId === section.id), 'name'),
          description: buildLocalizedText(sectionTrans.filter(t => t.sectionId === section.id), 'description'),
          sort_order: section.sortOrder,
        })),
        created_at: show.createdAt,
        updated_at: show.updatedAt,
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch award show');
    }
  });

  // Create accolade event
  fastify.post<{
    Body: {
      slug?: string;
      name: { en: string; lo?: string };
      description?: { en?: string; lo?: string };
      country?: string;
      city?: string;
      website_url?: string;
    };
  }>('/accolades/events', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { slug, name, description, country, city, website_url } = request.body;
      
      if (!name?.en) {
        return sendBadRequest(reply, 'English name is required');
      }
      
      const [newEvent] = await db.insert(schema.accoladeEvents).values({
        slug: slug || null,
        country: country || null,
        city: city || null,
        websiteUrl: website_url || null,
      }).returning();
      
      // Insert translations
      await db.insert(schema.accoladeEventTranslations).values({
        eventId: newEvent.id,
        language: 'en',
        name: name.en,
        description: description?.en || null,
      });
      
      if (name.lo) {
        await db.insert(schema.accoladeEventTranslations).values({
          eventId: newEvent.id,
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
        newEvent.id,
        name.en,
        {
          event_id: { before: null, after: newEvent.id },
          name_en: { before: null, after: name.en },
          name_lo: { before: null, after: name.lo || null },
          country: { before: null, after: country || null },
        }
      );
      
      return sendCreated(reply, {
        id: newEvent.id,
        slug: newEvent.slug,
        name,
        description,
        country: newEvent.country,
        city: newEvent.city,
        website_url: newEvent.websiteUrl,
        logo_path: newEvent.logoPath,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create accolade event');
    }
  });

  // Update accolade event
  fastify.put<{
    Params: { id: string };
    Body: {
      slug?: string;
      name?: { en?: string; lo?: string };
      description?: { en?: string; lo?: string };
      country?: string;
      city?: string;
      website_url?: string;
    };
  }>('/accolades/events/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      const [existing] = await db.select().from(schema.accoladeEvents).where(eq(schema.accoladeEvents.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Accolade event not found');
      }
      
      // Update main record
      const eventUpdates: any = { updatedAt: new Date() };
      if (updates.slug !== undefined) eventUpdates.slug = updates.slug || null;
      if (updates.country !== undefined) eventUpdates.country = updates.country || null;
      if (updates.city !== undefined) eventUpdates.city = updates.city || null;
      if (updates.website_url !== undefined) eventUpdates.websiteUrl = updates.website_url || null;
      
      await db.update(schema.accoladeEvents).set(eventUpdates).where(eq(schema.accoladeEvents.id, id));
      
      // Update translations
      if (updates.name || updates.description) {
        for (const lang of ['en', 'lo'] as const) {
          const nameVal = updates.name?.[lang];
          const descVal = updates.description?.[lang];
          
          if (nameVal !== undefined || descVal !== undefined) {
            const [existingTrans] = await db.select().from(schema.accoladeEventTranslations)
              .where(and(eq(schema.accoladeEventTranslations.eventId, id), eq(schema.accoladeEventTranslations.language, lang)))
              .limit(1);
            
            if (existingTrans) {
              const transUpdates: any = { updatedAt: new Date() };
              if (nameVal !== undefined) transUpdates.name = nameVal;
              if (descVal !== undefined) transUpdates.description = descVal || null;
              await db.update(schema.accoladeEventTranslations).set(transUpdates)
                .where(and(eq(schema.accoladeEventTranslations.eventId, id), eq(schema.accoladeEventTranslations.language, lang)));
            } else if (nameVal) {
              await db.insert(schema.accoladeEventTranslations).values({
                eventId: id,
                language: lang,
                name: nameVal,
                description: descVal || null,
              });
            }
          }
        }
      }
      
      // Log audit event
      const translations = await db.select().from(schema.accoladeEventTranslations)
        .where(eq(schema.accoladeEventTranslations.eventId, id));
      const eventName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      await logAuditFromRequest(
        request,
        'update',
        'settings',
        id,
        eventName
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update accolade event');
    }
  });

  // Delete accolade event
  fastify.delete<{ Params: { id: string } }>('/accolades/events/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.accoladeEvents).where(eq(schema.accoladeEvents.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Accolade event not found');
      }
      
      // Get show name for audit log before deletion
      const translations = await db.select().from(schema.accoladeEventTranslations)
        .where(eq(schema.accoladeEventTranslations.eventId, id));
      const eventName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      
      await db.delete(schema.accoladeEvents).where(eq(schema.accoladeEvents.id, id));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'settings',
        id,
        eventName,
        {
          event_id: { before: id, after: null },
          name: { before: eventName, after: null },
        }
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete accolade event');
    }
  });
}
