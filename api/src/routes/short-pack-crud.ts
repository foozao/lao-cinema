// Short Pack CRUD routes: Create, Read, Update, Delete operations for short packs

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { buildPackSummary, buildPackDetail } from '../lib/short-pack-helpers.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

// Zod schemas for validation
const LocalizedTextSchema = z.object({
  en: z.string(),
  lo: z.string().optional(),
});

export const CreateShortPackSchema = z.object({
  slug: z.string().optional(),
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  tagline: LocalizedTextSchema.optional(),
  poster_path: z.string().optional(),
  backdrop_path: z.string().optional(),
  is_published: z.boolean().default(false),
});

export const UpdateShortPackSchema = CreateShortPackSchema.partial();

export default async function shortPackCrudRoutes(fastify: FastifyInstance) {
  // Get all short packs (with optional filter for published only)
  fastify.get<{ Querystring: { published?: string } }>('/short-packs', async (request, reply) => {
    try {
      const { published } = request.query;
      const showPublishedOnly = published === 'true';

      // Get all packs
      let query = db.select().from(schema.shortPacks);
      
      const packs = showPublishedOnly
        ? await query.where(eq(schema.shortPacks.isPublished, true))
        : await query;

      // Build response with translations and short counts
      const packsWithData = await Promise.all(
        packs.map(pack => buildPackSummary(pack))
      );

      return { short_packs: packsWithData };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch short packs');
    }
  });

  // Get single short pack by ID or slug (with full shorts data)
  fastify.get<{ Params: { id: string } }>('/short-packs/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Check if id is a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      const [pack] = await db.select()
        .from(schema.shortPacks)
        .where(isUUID ? eq(schema.shortPacks.id, id) : eq(schema.shortPacks.slug, id))
        .limit(1);

      if (!pack) {
        return sendNotFound(reply, 'Short pack not found');
      }

      // Build full pack detail with movie data
      const packData = await buildPackDetail(pack);
      return packData;
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch short pack');
    }
  });

  // Create short pack
  fastify.post<{ Body: z.infer<typeof CreateShortPackSchema> }>(
    '/short-packs',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const data = CreateShortPackSchema.parse(request.body);

        // Insert pack
        const [newPack] = await db.insert(schema.shortPacks).values({
          slug: data.slug || null,
          posterPath: data.poster_path || null,
          backdropPath: data.backdrop_path || null,
          isPublished: data.is_published,
        }).returning();

        // Insert English translation (required)
        await db.insert(schema.shortPackTranslations).values({
          packId: newPack.id,
          language: 'en',
          title: data.title.en,
          description: data.description?.en || null,
          tagline: data.tagline?.en || null,
        });

        // Insert Lao translation if provided
        if (data.title.lo) {
          await db.insert(schema.shortPackTranslations).values({
            packId: newPack.id,
            language: 'lo',
            title: data.title.lo,
            description: data.description?.lo || null,
            tagline: data.tagline?.lo || null,
          });
        }

        // Return the created pack
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/short-packs/${newPack.id}`,
        });

        // Log audit event
        await logAuditFromRequest(
          request,
          'create',
          'settings',
          newPack.id,
          data.title.en,
          {
            pack_id: { before: null, after: newPack.id },
            title_en: { before: null, after: data.title.en },
            is_published: { before: null, after: data.is_published },
          }
        );

        return sendCreated(reply, JSON.parse(response.body));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return sendBadRequest(reply, 'Validation error', error.errors);
        }
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to create short pack');
      }
    }
  );

  // Update short pack
  fastify.put<{ Params: { id: string }; Body: z.infer<typeof UpdateShortPackSchema> }>(
    '/short-packs/:id',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const data = UpdateShortPackSchema.parse(request.body);

        // Check pack exists
        const [existingPack] = await db.select()
          .from(schema.shortPacks)
          .where(eq(schema.shortPacks.id, id))
          .limit(1);

        if (!existingPack) {
          return sendNotFound(reply, 'Short pack not found');
        }

        // Update pack
        const updateData: any = { updatedAt: new Date() };
        if (data.slug !== undefined) updateData.slug = data.slug;
        if (data.poster_path !== undefined) updateData.posterPath = data.poster_path;
        if (data.backdrop_path !== undefined) updateData.backdropPath = data.backdrop_path;
        if (data.is_published !== undefined) updateData.isPublished = data.is_published;

        await db.update(schema.shortPacks)
          .set(updateData)
          .where(eq(schema.shortPacks.id, id));

        // Update translations if provided
        if (data.title || data.description || data.tagline) {
          // Update English translation
          const enUpdate: any = { updatedAt: new Date() };
          if (data.title?.en) enUpdate.title = data.title.en;
          if (data.description?.en !== undefined) enUpdate.description = data.description.en;
          if (data.tagline?.en !== undefined) enUpdate.tagline = data.tagline.en;

          await db.insert(schema.shortPackTranslations)
            .values({
              packId: id,
              language: 'en',
              title: data.title?.en || '',
              description: data.description?.en || null,
              tagline: data.tagline?.en || null,
            })
            .onConflictDoUpdate({
              target: [schema.shortPackTranslations.packId, schema.shortPackTranslations.language],
              set: enUpdate,
            });

          // Update Lao translation if provided
          if (data.title?.lo || data.description?.lo || data.tagline?.lo) {
            const loUpdate: any = { updatedAt: new Date() };
            if (data.title?.lo) loUpdate.title = data.title.lo;
            if (data.description?.lo !== undefined) loUpdate.description = data.description.lo;
            if (data.tagline?.lo !== undefined) loUpdate.tagline = data.tagline.lo;

            await db.insert(schema.shortPackTranslations)
              .values({
                packId: id,
                language: 'lo',
                title: data.title?.lo || '',
                description: data.description?.lo || null,
                tagline: data.tagline?.lo || null,
              })
              .onConflictDoUpdate({
                target: [schema.shortPackTranslations.packId, schema.shortPackTranslations.language],
                set: loUpdate,
              });
          }
        }

        // Return updated pack
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/short-packs/${id}`,
        });

        // Log audit event
        const translations = await db.select().from(schema.shortPackTranslations)
          .where(eq(schema.shortPackTranslations.packId, id));
        const packTitle = translations.find(t => t.language === 'en')?.title || 'Unknown';
        await logAuditFromRequest(
          request,
          'update',
          'settings',
          id,
          packTitle
        );

        return JSON.parse(response.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return sendBadRequest(reply, 'Validation error', error.errors);
        }
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to update short pack');
      }
    }
  );

  // Delete short pack
  fastify.delete<{ Params: { id: string } }>(
    '/short-packs/:id',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Get pack title for audit log before deletion
        const translations = await db.select().from(schema.shortPackTranslations)
          .where(eq(schema.shortPackTranslations.packId, id));
        const packTitle = translations.find(t => t.language === 'en')?.title || 'Unknown';

        const [deletedPack] = await db.delete(schema.shortPacks)
          .where(eq(schema.shortPacks.id, id))
          .returning();

        if (!deletedPack) {
          return sendNotFound(reply, 'Short pack not found');
        }

        // Log audit event
        await logAuditFromRequest(
          request,
          'delete',
          'settings',
          id,
          packTitle,
          {
            pack_id: { before: id, after: null },
            title: { before: packTitle, after: null },
          }
        );

        return { success: true, message: 'Short pack deleted successfully' };
      } catch (error) {
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to delete short pack');
      }
    }
  );
}
