// Image upload routes
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || '../video-server/public/logos';
const LOCAL_UPLOAD_URL = process.env.LOCAL_UPLOAD_URL || 'http://localhost:3002/logos';
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'lao-cinema-images';

export async function uploadRoutes(fastify: FastifyInstance) {
  // Register multipart support for this route
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
  });

  // Upload image endpoint
  fastify.post('/upload/image', async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' });
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
        const file = bucket.file(`logos/${filename}`);
        
        await file.save(buffer, {
          contentType: data.mimetype,
          metadata: {
            cacheControl: 'public, max-age=31536000',
          },
        });
        await file.makePublic();
        
        publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/logos/${filename}`;
      } else {
        // Development: Save locally to video-server
        const uploadDir = join(process.cwd(), LOCAL_UPLOAD_DIR);
        await mkdir(uploadDir, { recursive: true });
        
        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);
        
        publicUrl = `${LOCAL_UPLOAD_URL}/${filename}`;
      }
      
      return { url: publicUrl };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to upload image' });
    }
  });
}
