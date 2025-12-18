// Person images routes
import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';
import { z } from 'zod';
import { unlink } from 'fs/promises';
import { join } from 'path';

const addPersonImageSchema = z.object({
  filePath: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  aspectRatio: z.number().optional(),
  isPrimary: z.boolean().optional(),
});

export default async function personImageRoutes(fastify: FastifyInstance) {
  // Add image to person
  fastify.post<{
    Params: { id: string };
    Body: z.infer<typeof addPersonImageSchema>;
  }>(
    '/people/:id/images',
    { preHandler: requireEditorOrAdmin },
    async (request, reply) => {
      try {
        const personId = parseInt(request.params.id);
        const validation = addPersonImageSchema.safeParse(request.body);
        
        if (!validation.success) {
          return sendBadRequest(reply, 'Invalid image data', validation.error.errors);
        }
        
        const { filePath, width, height, aspectRatio, isPrimary } = validation.data;
        
        // If this image is marked as primary, unset other primary images
        if (isPrimary) {
          await db.update(schema.personImages)
            .set({ isPrimary: false })
            .where(eq(schema.personImages.personId, personId));
        }
        
        // Insert the new image
        const [newImage] = await db.insert(schema.personImages).values({
          personId,
          filePath,
          width: width || null,
          height: height || null,
          aspectRatio: aspectRatio || null,
          isPrimary: isPrimary || false,
        }).returning();
        
        // Log audit
        await logAuditFromRequest(
          request,
          'add_image',
          'person',
          personId.toString(),
          undefined,
          {
            imageId: { before: null, after: newImage.id },
            filePath: { before: null, after: filePath },
            isPrimary: { before: null, after: isPrimary || false },
          }
        );
        
        return newImage;
      } catch (error) {
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to add image');
      }
    }
  );
  
  // Delete person image
  fastify.delete<{
    Params: { id: string; imageId: string };
  }>(
    '/people/:id/images/:imageId',
    { preHandler: requireEditorOrAdmin },
    async (request, reply) => {
      try {
        const personId = parseInt(request.params.id);
        const { imageId } = request.params;
        
        // Get the image before deleting
        const [image] = await db.select()
          .from(schema.personImages)
          .where(
            and(
              eq(schema.personImages.id, imageId),
              eq(schema.personImages.personId, personId)
            )
          );
        
        if (!image) {
          return sendNotFound(reply, 'Image not found');
        }
        
        // Delete the database record
        await db.delete(schema.personImages)
          .where(eq(schema.personImages.id, imageId));
        
        // Delete the physical file if it's a local upload (not TMDB)
        if (image.filePath.startsWith('http://') || image.filePath.startsWith('https://')) {
          try {
            // Extract filename from URL (e.g., http://localhost:3002/profiles/abc.png -> abc.png)
            const filename = image.filePath.split('/').pop();
            if (filename) {
              const VIDEO_SERVER_PUBLIC_DIR = process.env.VIDEO_SERVER_PUBLIC_DIR || '../video-server/public';
              const filePath = join(VIDEO_SERVER_PUBLIC_DIR, 'profiles', filename);
              await unlink(filePath);
              fastify.log.info(`Deleted file: ${filePath}`);
            }
          } catch (error) {
            // Log error but don't fail the request if file doesn't exist
            fastify.log.warn(`Failed to delete file for image ${imageId}: ${error}`);
          }
        }
        
        // If this was the primary image, set another image as primary
        if (image.isPrimary) {
          const [nextImage] = await db.select()
            .from(schema.personImages)
            .where(eq(schema.personImages.personId, personId))
            .limit(1);
          
          if (nextImage) {
            await db.update(schema.personImages)
              .set({ isPrimary: true })
              .where(eq(schema.personImages.id, nextImage.id));
          }
        }
        
        // Log audit
        await logAuditFromRequest(
          request,
          'remove_image',
          'person',
          personId.toString(),
          undefined,
          {
            imageId: { before: imageId, after: null },
            filePath: { before: image.filePath, after: null },
          }
        );
        
        return { success: true };
      } catch (error) {
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to delete image');
      }
    }
  );

  // Set primary person image
  fastify.put<{ Params: { id: string; imageId: string } }>(
    '/people/:id/images/:imageId/primary',
    { preHandler: requireEditorOrAdmin },
    async (request, reply) => {
      try {
        const personId = parseInt(request.params.id);
        const { imageId } = request.params;

        // Verify person exists
        const [person] = await db.select()
          .from(schema.people)
          .where(eq(schema.people.id, personId))
          .limit(1);

        if (!person) {
          return sendNotFound(reply, 'Person not found');
        }

        // Verify image exists and belongs to this person
        const [image] = await db.select()
          .from(schema.personImages)
          .where(
            and(
              eq(schema.personImages.id, imageId),
              eq(schema.personImages.personId, personId)
            )
          )
          .limit(1);

        if (!image) {
          return sendNotFound(reply, 'Image not found');
        }

        // Unset all primary flags for this person
        await db.update(schema.personImages)
          .set({ isPrimary: false })
          .where(eq(schema.personImages.personId, personId));

        // Set the selected image as primary
        await db.update(schema.personImages)
          .set({ isPrimary: true })
          .where(eq(schema.personImages.id, imageId));

        // Update the person's profile_path to use this image
        await db.update(schema.people)
          .set({ profilePath: image.filePath })
          .where(eq(schema.people.id, personId));

        // Log audit event
        await logAuditFromRequest(
          request,
          'set_primary_image',
          'person',
          personId.toString(),
          undefined,
          {
            imageId: { before: null, after: imageId },
            filePath: { before: null, after: image.filePath },
          }
        );

        return { 
          success: true,
          message: 'Primary profile photo updated successfully',
        };
      } catch (error) {
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to update primary profile photo');
      }
    }
  );
}
