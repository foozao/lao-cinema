// Image upload routes
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const VIDEO_SERVER_PUBLIC_DIR = process.env.VIDEO_SERVER_PUBLIC_DIR || '../video-server/public';
const VIDEO_SERVER_URL = process.env.VIDEO_SERVER_URL || 'http://localhost:3002';
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'lao-cinema-images';

type ImageType = 'poster' | 'backdrop' | 'logo' | 'profile';

const imageTypeSchema = z.enum(['poster', 'backdrop', 'logo', 'profile']);

export async function uploadRoutes(fastify: FastifyInstance) {
  // Register multipart support for this route
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
  });

  // Upload image endpoint (posters, backdrops, logos)
  fastify.post<{
    Querystring: { type?: string };
  }>('/upload/image', async (request, reply) => {
    try {
      // Validate image type from query parameter
      const typeParam = request.query.type || 'logo';
      const validationType = imageTypeSchema.safeParse(typeParam);
      
      if (!validationType.success) {
        return reply.status(400).send({ 
          error: 'Invalid image type. Allowed: poster, backdrop, logo, profile' 
        });
      }
      
      const imageType: ImageType = validationType.data;
      
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ 
          error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' 
        });
      }

      // Generate unique filename
      const ext = data.filename.split('.').pop() || 'jpg';
      const filename = `${randomUUID()}.${ext}`;
      const buffer = await data.toBuffer();

      let publicUrl: string;

      if (IS_PRODUCTION) {
        // Production: Upload to GCS
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage();
        const bucket = storage.bucket(GCS_BUCKET_NAME);
        const file = bucket.file(`${imageType}s/${filename}`);
        
        await file.save(buffer, {
          contentType: data.mimetype,
          metadata: {
            cacheControl: 'public, max-age=31536000',
          },
        });
        await file.makePublic();
        
        publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${imageType}s/${filename}`;
      } else {
        // Development: Save locally to video-server
        const uploadDir = join(process.cwd(), VIDEO_SERVER_PUBLIC_DIR, `${imageType}s`);
        await mkdir(uploadDir, { recursive: true });
        
        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);
        
        publicUrl = `${VIDEO_SERVER_URL}/${imageType}s/${filename}`;
      }
      
      return { url: publicUrl, type: imageType };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to upload image' });
    }
  });
}
