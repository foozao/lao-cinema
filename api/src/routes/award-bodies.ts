// Award Bodies routes - Independent juries/organizations that give awards

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, asc, and } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { buildInClause } from '../lib/query-helpers.js';
import { logAuditFromRequest } from '../lib/audit-service.js';
import { buildLocalizedText } from '../lib/translation-helpers.js';

export default async function awardBodiesRoutes(fastify: FastifyInstance) {
  // Get all award bodies
  fastify.get('/accolades/award-bodies', async (request, reply) => {
    try {
      const bodies = await db.select().from(schema.awardBodies).orderBy(asc(schema.awardBodies.createdAt));
      
      const bodyIds = bodies.map(b => b.id);
      const translations = bodyIds.length > 0
        ? await db.select().from(schema.awardBodyTranslations).where(buildInClause(schema.awardBodyTranslations.awardBodyId, bodyIds))
        : [];
      
      const bodiesWithTranslations = bodies.map(body => {
        const bodyTrans = translations.filter(t => t.awardBodyId === body.id);
        
        return {
          id: body.id,
          abbreviation: body.abbreviation,
          name: buildLocalizedText(bodyTrans, 'name'),
          description: buildLocalizedText(bodyTrans, 'description'),
          type: body.type,
          website_url: body.websiteUrl,
          logo_path: body.logoPath,
          created_at: body.createdAt,
          updated_at: body.updatedAt,
        };
      });
      
      return { award_bodies: bodiesWithTranslations };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch award bodies');
    }
  });

  // Get single award body
  fastify.get<{ Params: { id: string } }>('/accolades/award-bodies/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [body] = await db.select().from(schema.awardBodies).where(eq(schema.awardBodies.id, id)).limit(1);
      if (!body) {
        return sendNotFound(reply, 'Award body not found');
      }
      
      const translations = await db.select().from(schema.awardBodyTranslations).where(eq(schema.awardBodyTranslations.awardBodyId, id));
      
      return {
        id: body.id,
        abbreviation: body.abbreviation,
        name: buildLocalizedText(translations, 'name'),
        description: buildLocalizedText(translations, 'description'),
        type: body.type,
        website_url: body.websiteUrl,
        logo_path: body.logoPath,
        created_at: body.createdAt,
        updated_at: body.updatedAt,
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch award body');
    }
  });

  // Create award body
  fastify.post<{
    Body: {
      abbreviation?: string;
      name: { en: string; lo?: string };
      description?: { en?: string; lo?: string };
      type?: 'jury' | 'critics' | 'foundation' | 'audience' | 'sponsor';
      website_url?: string;
    };
  }>('/accolades/award-bodies', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { abbreviation, name, description, type, website_url } = request.body;
      
      if (!name?.en) {
        return sendBadRequest(reply, 'English name is required');
      }
      
      const [newBody] = await db.insert(schema.awardBodies).values({
        abbreviation: abbreviation || null,
        type: type || null,
        websiteUrl: website_url || null,
      }).returning();
      
      // Insert translations
      await db.insert(schema.awardBodyTranslations).values({
        awardBodyId: newBody.id,
        language: 'en',
        name: name.en,
        description: description?.en || null,
      });
      
      if (name.lo) {
        await db.insert(schema.awardBodyTranslations).values({
          awardBodyId: newBody.id,
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
        newBody.id,
        name.en,
        {
          award_body_id: { before: null, after: newBody.id },
          name_en: { before: null, after: name.en },
          name_lo: { before: null, after: name.lo || null },
          abbreviation: { before: null, after: abbreviation || null },
          type: { before: null, after: type || null },
        }
      );
      
      return sendCreated(reply, {
        id: newBody.id,
        abbreviation: newBody.abbreviation,
        name,
        description,
        type: newBody.type,
        website_url: newBody.websiteUrl,
        logo_path: newBody.logoPath,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create award body');
    }
  });

  // Update award body
  fastify.put<{
    Params: { id: string };
    Body: {
      abbreviation?: string;
      name?: { en?: string; lo?: string };
      description?: { en?: string; lo?: string };
      type?: 'jury' | 'critics' | 'foundation' | 'audience' | 'sponsor' | null;
      website_url?: string;
    };
  }>('/accolades/award-bodies/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      const [existing] = await db.select().from(schema.awardBodies).where(eq(schema.awardBodies.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Award body not found');
      }
      
      // Update main record
      const bodyUpdates: any = { updatedAt: new Date() };
      if (updates.abbreviation !== undefined) bodyUpdates.abbreviation = updates.abbreviation || null;
      if (updates.type !== undefined) bodyUpdates.type = updates.type || null;
      if (updates.website_url !== undefined) bodyUpdates.websiteUrl = updates.website_url || null;
      
      await db.update(schema.awardBodies).set(bodyUpdates).where(eq(schema.awardBodies.id, id));
      
      // Update translations
      if (updates.name || updates.description) {
        for (const lang of ['en', 'lo'] as const) {
          const nameVal = updates.name?.[lang];
          const descVal = updates.description?.[lang];
          
          if (nameVal !== undefined || descVal !== undefined) {
            const matchingTrans = await db.select().from(schema.awardBodyTranslations)
              .where(eq(schema.awardBodyTranslations.awardBodyId, id));
            const langTrans = matchingTrans.find(t => t.language === lang);
            
            if (langTrans) {
              const transUpdates: any = { updatedAt: new Date() };
              if (nameVal !== undefined) transUpdates.name = nameVal;
              if (descVal !== undefined) transUpdates.description = descVal || null;
              await db.update(schema.awardBodyTranslations).set(transUpdates)
                .where(and(
                  eq(schema.awardBodyTranslations.awardBodyId, id),
                  eq(schema.awardBodyTranslations.language, lang)
                ));
            } else if (nameVal) {
              await db.insert(schema.awardBodyTranslations).values({
                awardBodyId: id,
                language: lang,
                name: nameVal,
                description: descVal || null,
              });
            }
          }
        }
      }
      
      // Log audit event
      const translations = await db.select().from(schema.awardBodyTranslations)
        .where(eq(schema.awardBodyTranslations.awardBodyId, id));
      const bodyName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      await logAuditFromRequest(
        request,
        'update',
        'settings',
        id,
        bodyName
      );
      
      // Return updated entity
      const [updated] = await db.select().from(schema.awardBodies).where(eq(schema.awardBodies.id, id)).limit(1);
      const updatedTrans = await db.select().from(schema.awardBodyTranslations).where(eq(schema.awardBodyTranslations.awardBodyId, id));
      
      return {
        id: updated.id,
        abbreviation: updated.abbreviation,
        name: buildLocalizedText(updatedTrans, 'name'),
        description: buildLocalizedText(updatedTrans, 'description'),
        type: updated.type,
        website_url: updated.websiteUrl,
        logo_path: updated.logoPath,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update award body');
    }
  });

  // Delete award body
  fastify.delete<{ Params: { id: string } }>('/accolades/award-bodies/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.awardBodies).where(eq(schema.awardBodies.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Award body not found');
      }
      
      // Get name for audit log before deletion
      const translations = await db.select().from(schema.awardBodyTranslations)
        .where(eq(schema.awardBodyTranslations.awardBodyId, id));
      const bodyName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      
      await db.delete(schema.awardBodies).where(eq(schema.awardBodies.id, id));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'settings',
        id,
        bodyName,
        {
          award_body_id: { before: id, after: null },
          name: { before: bodyName, after: null },
        }
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete award body');
    }
  });
}
