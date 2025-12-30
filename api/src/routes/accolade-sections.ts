// Accolade Sections routes - Festival program tracks (non-competitive)

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

export default async function accoladeSectionsRoutes(fastify: FastifyInstance) {
  // Create section
  fastify.post<{
    Body: {
      event_id: string;
      name: { en: string; lo?: string };
      description?: { en?: string; lo?: string };
      sort_order?: number;
    };
  }>('/accolades/sections', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { event_id, name, description, sort_order } = request.body;
      
      if (!event_id || !name?.en) {
        return sendBadRequest(reply, 'event_id and English name are required');
      }
      
      // Verify event exists
      const [event] = await db.select().from(schema.accoladeEvents).where(eq(schema.accoladeEvents.id, event_id)).limit(1);
      if (!event) {
        return sendNotFound(reply, 'Accolade event not found');
      }
      
      const [newSection] = await db.insert(schema.accoladeSections).values({
        eventId: event_id,
        sortOrder: sort_order || 0,
      }).returning();
      
      // Insert English translation
      await db.insert(schema.accoladeSectionTranslations).values({
        sectionId: newSection.id,
        language: 'en',
        name: name.en,
        description: description?.en || null,
      });
      
      // Insert Lao translation if provided
      if (name.lo) {
        await db.insert(schema.accoladeSectionTranslations).values({
          sectionId: newSection.id,
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
        newSection.id,
        name.en,
        {
          section_id: { before: null, after: newSection.id },
          name_en: { before: null, after: name.en },
        }
      );
      
      return sendCreated(reply, {
        id: newSection.id,
        event_id: newSection.eventId,
        name,
        description,
        sort_order: newSection.sortOrder,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create section');
    }
  });

  // Update section
  fastify.put<{
    Params: { id: string };
    Body: {
      name?: { en?: string; lo?: string };
      description?: { en?: string; lo?: string };
      sort_order?: number;
    };
  }>('/accolades/sections/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      const [existing] = await db.select().from(schema.accoladeSections).where(eq(schema.accoladeSections.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Section not found');
      }
      
      // Update section
      const sectionUpdates: any = { updatedAt: new Date() };
      if (updates.sort_order !== undefined) sectionUpdates.sortOrder = updates.sort_order;
      
      await db.update(schema.accoladeSections).set(sectionUpdates).where(eq(schema.accoladeSections.id, id));
      
      // Update translations
      if (updates.name || updates.description) {
        for (const lang of ['en', 'lo'] as const) {
          const nameVal = updates.name?.[lang];
          const descVal = updates.description?.[lang];
          
          if (nameVal !== undefined || descVal !== undefined) {
            const [existingTrans] = await db.select().from(schema.accoladeSectionTranslations)
              .where(and(eq(schema.accoladeSectionTranslations.sectionId, id), eq(schema.accoladeSectionTranslations.language, lang)))
              .limit(1);
            
            if (existingTrans) {
              const transUpdates: any = { updatedAt: new Date() };
              if (nameVal !== undefined) transUpdates.name = nameVal;
              if (descVal !== undefined) transUpdates.description = descVal || null;
              await db.update(schema.accoladeSectionTranslations).set(transUpdates)
                .where(and(eq(schema.accoladeSectionTranslations.sectionId, id), eq(schema.accoladeSectionTranslations.language, lang)));
            } else if (nameVal) {
              await db.insert(schema.accoladeSectionTranslations).values({
                sectionId: id,
                language: lang,
                name: nameVal,
                description: descVal || null,
              });
            }
          }
        }
      }
      
      // Log audit event
      const translations = await db.select().from(schema.accoladeSectionTranslations)
        .where(eq(schema.accoladeSectionTranslations.sectionId, id));
      const sectionName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      await logAuditFromRequest(
        request,
        'update',
        'settings',
        id,
        sectionName
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update section');
    }
  });

  // Delete section
  fastify.delete<{ Params: { id: string } }>('/accolades/sections/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.accoladeSections).where(eq(schema.accoladeSections.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Section not found');
      }
      
      // Get section name for audit log before deletion
      const translations = await db.select().from(schema.accoladeSectionTranslations)
        .where(eq(schema.accoladeSectionTranslations.sectionId, id));
      const sectionName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      
      await db.delete(schema.accoladeSections).where(eq(schema.accoladeSections.id, id));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'settings',
        id,
        sectionName,
        {
          section_id: { before: id, after: null },
          name: { before: sectionName, after: null },
        }
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete section');
    }
  });

  // ==========================================================================
  // SECTION SELECTIONS - Adding movies to sections for specific editions
  // ==========================================================================

  // Add movie to section (create selection)
  fastify.post<{
    Body: {
      section_id: string;
      edition_id: string;
      movie_id: string;
      notes?: { en?: string; lo?: string };
      sort_order?: number;
    };
  }>('/accolades/sections/selections', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { section_id, edition_id, movie_id, notes, sort_order } = request.body;
      
      if (!section_id || !edition_id || !movie_id) {
        return sendBadRequest(reply, 'section_id, edition_id, and movie_id are required');
      }
      
      // Verify section exists
      const [section] = await db.select().from(schema.accoladeSections).where(eq(schema.accoladeSections.id, section_id)).limit(1);
      if (!section) {
        return sendNotFound(reply, 'Section not found');
      }
      
      // Verify edition exists
      const [edition] = await db.select().from(schema.accoladeEditions).where(eq(schema.accoladeEditions.id, edition_id)).limit(1);
      if (!edition) {
        return sendNotFound(reply, 'Edition not found');
      }
      
      // Verify movie exists
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, movie_id)).limit(1);
      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }
      
      // Create selection
      const [newSelection] = await db.insert(schema.accoladeSectionSelections).values({
        sectionId: section_id,
        editionId: edition_id,
        movieId: movie_id,
        sortOrder: sort_order || 0,
      }).returning();
      
      // Insert translations if notes provided
      if (notes?.en) {
        await db.insert(schema.accoladeSectionSelectionTranslations).values({
          selectionId: newSelection.id,
          language: 'en',
          notes: notes.en,
        });
      }
      if (notes?.lo) {
        await db.insert(schema.accoladeSectionSelectionTranslations).values({
          selectionId: newSelection.id,
          language: 'lo',
          notes: notes.lo,
        });
      }
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'create',
        'settings',
        newSelection.id,
        `Selection: Movie ${movie_id} in section`,
        {
          selection_id: { before: null, after: newSelection.id },
          movie_id: { before: null, after: movie_id },
          section_id: { before: null, after: section_id },
          edition_id: { before: null, after: edition_id },
        }
      );
      
      return sendCreated(reply, {
        id: newSelection.id,
        section_id: newSelection.sectionId,
        edition_id: newSelection.editionId,
        movie_id: newSelection.movieId,
        sort_order: newSelection.sortOrder,
        notes,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to add movie to section');
    }
  });

  // Remove movie from section (delete selection)
  fastify.delete<{ Params: { id: string } }>('/accolades/sections/selections/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.accoladeSectionSelections).where(eq(schema.accoladeSectionSelections.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Selection not found');
      }
      
      await db.delete(schema.accoladeSectionSelections).where(eq(schema.accoladeSectionSelections.id, id));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'settings',
        id,
        `Selection removed`,
        {
          selection_id: { before: id, after: null },
          movie_id: { before: existing.movieId, after: null },
        }
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to remove movie from section');
    }
  });
}
