// Award Categories routes

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

export default async function awardCategoriesRoutes(fastify: FastifyInstance) {
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
            const [existingTrans] = await db.select().from(schema.awardCategoryTranslations)
              .where(and(eq(schema.awardCategoryTranslations.categoryId, id), eq(schema.awardCategoryTranslations.language, lang)))
              .limit(1);
            
            if (existingTrans) {
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
      
      // Log audit event
      const translations = await db.select().from(schema.awardCategoryTranslations)
        .where(eq(schema.awardCategoryTranslations.categoryId, id));
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
      
      // Get category name for audit log before deletion
      const translations = await db.select().from(schema.awardCategoryTranslations)
        .where(eq(schema.awardCategoryTranslations.categoryId, id));
      const categoryName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      
      await db.delete(schema.awardCategories).where(eq(schema.awardCategories.id, id));
      
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
      return sendInternalError(reply, 'Failed to delete award category');
    }
  });
}
