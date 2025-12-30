// Accolade Categories routes

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

export default async function accoladeCategoriesRoutes(fastify: FastifyInstance) {
  // Create category
  fastify.post<{
    Body: {
      event_id: string;
      section_id?: string; // Optional - if provided, category is scoped to this section
      name: { en: string; lo?: string };
      description?: { en?: string; lo?: string };
      nominee_type: 'person' | 'movie';
      sort_order?: number;
    };
  }>('/accolades/categories', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { event_id, section_id, name, description, nominee_type, sort_order } = request.body;
      
      if (!event_id || !name?.en || !nominee_type) {
        return sendBadRequest(reply, 'event_id, English name, and nominee_type are required');
      }
      
      const [show] = await db.select().from(schema.accoladeEvents).where(eq(schema.accoladeEvents.id, event_id)).limit(1);
      if (!show) {
        return sendNotFound(reply, 'Accolade event not found');
      }
      
      // If section_id provided, verify it exists and belongs to this event
      if (section_id) {
        const [section] = await db.select().from(schema.accoladeSections)
          .where(and(
            eq(schema.accoladeSections.id, section_id),
            eq(schema.accoladeSections.eventId, event_id)
          ))
          .limit(1);
        if (!section) {
          return sendNotFound(reply, 'Section not found or does not belong to this event');
        }
      }
      
      const [newCategory] = await db.insert(schema.accoladeCategories).values({
        eventId: event_id,
        sectionId: section_id || null,
        nomineeType: nominee_type,
        sortOrder: sort_order || 0,
      }).returning();
      
      await db.insert(schema.accoladeCategoryTranslations).values({
        categoryId: newCategory.id,
        language: 'en',
        name: name.en,
        description: description?.en || null,
      });
      
      if (name.lo) {
        await db.insert(schema.accoladeCategoryTranslations).values({
          categoryId: newCategory.id,
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
        newCategory.id,
        name.en,
        {
          category_id: { before: null, after: newCategory.id },
          name_en: { before: null, after: name.en },
          nominee_type: { before: null, after: nominee_type },
        }
      );
      
      return sendCreated(reply, {
        id: newCategory.id,
        event_id: newCategory.eventId,
        section_id: newCategory.sectionId,
        name,
        description,
        nominee_type: newCategory.nomineeType,
        sort_order: newCategory.sortOrder,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create accolade category');
    }
  });

  // Update category
  fastify.put<{
    Params: { id: string };
    Body: {
      section_id?: string | null; // Can set to null to make it event-wide
      name?: { en?: string; lo?: string };
      description?: { en?: string; lo?: string };
      nominee_type?: 'person' | 'movie';
      sort_order?: number;
    };
  }>('/accolades/categories/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      const [existing] = await db.select().from(schema.accoladeCategories).where(eq(schema.accoladeCategories.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Accolade category not found');
      }
      
      // If section_id provided, verify it exists and belongs to this event
      if (updates.section_id) {
        const [section] = await db.select().from(schema.accoladeSections)
          .where(and(
            eq(schema.accoladeSections.id, updates.section_id),
            eq(schema.accoladeSections.eventId, existing.eventId)
          ))
          .limit(1);
        if (!section) {
          return sendNotFound(reply, 'Section not found or does not belong to this event');
        }
      }
      
      const categoryUpdates: any = { updatedAt: new Date() };
      if (updates.section_id !== undefined) categoryUpdates.sectionId = updates.section_id;
      if (updates.nominee_type !== undefined) categoryUpdates.nomineeType = updates.nominee_type;
      if (updates.sort_order !== undefined) categoryUpdates.sortOrder = updates.sort_order;
      
      await db.update(schema.accoladeCategories).set(categoryUpdates).where(eq(schema.accoladeCategories.id, id));
      
      // Update translations
      if (updates.name || updates.description) {
        for (const lang of ['en', 'lo'] as const) {
          const nameVal = updates.name?.[lang];
          const descVal = updates.description?.[lang];
          
          if (nameVal !== undefined || descVal !== undefined) {
            const [existingTrans] = await db.select().from(schema.accoladeCategoryTranslations)
              .where(and(eq(schema.accoladeCategoryTranslations.categoryId, id), eq(schema.accoladeCategoryTranslations.language, lang)))
              .limit(1);
            
            if (existingTrans) {
              const transUpdates: any = { updatedAt: new Date() };
              if (nameVal !== undefined) transUpdates.name = nameVal;
              if (descVal !== undefined) transUpdates.description = descVal || null;
              await db.update(schema.accoladeCategoryTranslations).set(transUpdates)
                .where(and(eq(schema.accoladeCategoryTranslations.categoryId, id), eq(schema.accoladeCategoryTranslations.language, lang)));
            } else if (nameVal) {
              await db.insert(schema.accoladeCategoryTranslations).values({
                categoryId: id,
                language: lang,
                name: nameVal,
                description: descVal || null,
              });
            }
          }
        }
      }
      
      // Log audit event
      const translations = await db.select().from(schema.accoladeCategoryTranslations)
        .where(eq(schema.accoladeCategoryTranslations.categoryId, id));
      const categoryName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      await logAuditFromRequest(
        request,
        'update',
        'settings',
        id,
        categoryName
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update accolade category');
    }
  });

  // Delete category
  fastify.delete<{ Params: { id: string } }>('/accolades/categories/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.accoladeCategories).where(eq(schema.accoladeCategories.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Accolade category not found');
      }
      
      // Get category name for audit log before deletion
      const translations = await db.select().from(schema.accoladeCategoryTranslations)
        .where(eq(schema.accoladeCategoryTranslations.categoryId, id));
      const categoryName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      
      await db.delete(schema.accoladeCategories).where(eq(schema.accoladeCategories.id, id));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'settings',
        id,
        categoryName,
        {
          category_id: { before: id, after: null },
          name: { before: categoryName, after: null },
        }
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete accolade category');
    }
  });
}
