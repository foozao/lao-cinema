// Image upload routes
import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
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

const GCS_VIDEO_BUCKET_NAME = process.env.GCS_VIDEO_BUCKET_NAME || 'lao-cinema-videos';

/**
 * Parse a timestamp string (HH:MM:SS,mmm or HH:MM:SS.mmm) to milliseconds
 */
function parseTimestamp(timestamp: string): number {
  const cleaned = timestamp.replace(',', '.').trim();
  const match = cleaned.match(/(\d{1,2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (!match) return 0;
  
  const [, hours, minutes, seconds, milliseconds] = match;
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(milliseconds)
  );
}

/**
 * Format milliseconds back to VTT timestamp format (HH:MM:SS.mmm)
 */
function formatTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Convert SRT subtitle format to WebVTT format
 * - SRT uses comma for milliseconds, VTT uses period
 * - VTT requires a WEBVTT header
 * - Automatically detects and removes timestamp offsets (e.g., if subtitles start at 01:00:00, shifts to 00:00:00)
 */
function convertSrtToVtt(srtContent: string): { vtt: string; offsetCorrected: boolean; offsetAmount: string | null } {
  // Normalize line endings
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into subtitle blocks (separated by blank lines)
  const blocks = normalized.split(/\n\n+/).filter(b => b.trim());
  
  // First pass: collect all timestamps to find the minimum offset
  let minStartTime = Infinity;
  const parsedBlocks: Array<{ start: number; end: number; text: string }> = [];
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    
    // Find the timestamp line (contains -->)
    let timestampLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampLineIndex = i;
        break;
      }
    }
    
    if (timestampLineIndex === -1) continue;
    
    // Parse timestamps
    const timestampLine = lines[timestampLineIndex];
    const [startStr, endStr] = timestampLine.split('-->').map(s => s.trim());
    const startTime = parseTimestamp(startStr);
    const endTime = parseTimestamp(endStr);
    
    // Get the subtitle text (everything after the timestamp line)
    const text = lines.slice(timestampLineIndex + 1).join('\n').trim();
    
    if (text && startTime >= 0 && endTime > startTime) {
      minStartTime = Math.min(minStartTime, startTime);
      parsedBlocks.push({ start: startTime, end: endTime, text });
    }
  }
  
  // If no valid subtitles found, return empty VTT
  if (parsedBlocks.length === 0) {
    return { vtt: 'WEBVTT\n\n', offsetCorrected: false, offsetAmount: null };
  }
  
  // Calculate offset to normalize to 00:00:00 start
  // Only apply offset if first subtitle starts after 10 seconds (likely an intentional offset)
  const offset = minStartTime > 10000 ? minStartTime : 0;
  const offsetCorrected = offset > 0;
  const offsetAmount = offsetCorrected ? formatTimestamp(offset) : null;
  
  // Build VTT content
  let vtt = 'WEBVTT\n\n';
  
  for (const block of parsedBlocks) {
    const adjustedStart = block.start - offset;
    const adjustedEnd = block.end - offset;
    
    vtt += `${formatTimestamp(adjustedStart)} --> ${formatTimestamp(adjustedEnd)}\n`;
    vtt += `${block.text}\n\n`;
  }
  
  return { vtt, offsetCorrected, offsetAmount };
}

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
        return sendBadRequest(reply, 'Invalid image type. Allowed: poster, backdrop, logo, profile');
      }
      
      const imageType: ImageType = validationType.data;
      
      const data = await request.file();
      
      if (!data) {
        return sendBadRequest(reply, 'No file uploaded');
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(data.mimetype)) {
        return sendBadRequest(reply, 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
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
      return sendInternalError(reply, 'Failed to upload image');
    }
  });

  // Upload subtitle file endpoint (VTT or SRT)
  // SRT files are automatically converted to VTT
  fastify.post<{
    Querystring: { movieId?: string };
  }>('/upload/subtitle', async (request, reply) => {
    try {
      const movieId = request.query.movieId;
      
      if (!movieId) {
        return sendBadRequest(reply, 'movieId query parameter is required');
      }
      
      const data = await request.file();
      
      if (!data) {
        return sendBadRequest(reply, 'No file uploaded');
      }

      // Validate file type
      const filename = data.filename.toLowerCase();
      const isSrt = filename.endsWith('.srt');
      const isVtt = filename.endsWith('.vtt');
      
      if (!isSrt && !isVtt) {
        return sendBadRequest(reply, 'Invalid file type. Allowed: .vtt, .srt');
      }

      // Read file content
      let buffer = await data.toBuffer();
      let content = buffer.toString('utf-8');
      let offsetCorrected = false;
      let offsetAmount: string | null = null;
      
      // Convert SRT to VTT if needed
      if (isSrt) {
        const result = convertSrtToVtt(content);
        content = result.vtt;
        offsetCorrected = result.offsetCorrected;
        offsetAmount = result.offsetAmount;
        buffer = Buffer.from(content, 'utf-8');
      }

      // Generate unique filename (always .vtt since we convert)
      const baseFilename = data.filename.replace(/\.(srt|vtt)$/i, '');
      const uniqueFilename = `${movieId}/${baseFilename}-${randomUUID().slice(0, 8)}.vtt`;

      let publicUrl: string;

      if (IS_PRODUCTION) {
        // Production: Upload to GCS (same bucket as videos)
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage();
        const bucket = storage.bucket(GCS_VIDEO_BUCKET_NAME);
        const file = bucket.file(`subtitles/${uniqueFilename}`);
        
        await file.save(buffer, {
          contentType: 'text/vtt',
          metadata: {
            cacheControl: 'public, max-age=31536000',
          },
        });
        await file.makePublic();
        
        publicUrl = `https://storage.googleapis.com/${GCS_VIDEO_BUCKET_NAME}/subtitles/${uniqueFilename}`;
      } else {
        // Development: Save locally to video-server
        const uploadDir = join(process.cwd(), VIDEO_SERVER_PUBLIC_DIR, 'subtitles', movieId);
        await mkdir(uploadDir, { recursive: true });
        
        const filePath = join(uploadDir, `${baseFilename}-${randomUUID().slice(0, 8)}.vtt`);
        await writeFile(filePath, buffer);
        
        // Extract just the filename for the URL
        const savedFilename = filePath.split('/').pop();
        publicUrl = `${VIDEO_SERVER_URL}/subtitles/${movieId}/${savedFilename}`;
      }
      
      return { 
        url: publicUrl, 
        convertedFromSrt: isSrt,
        offsetCorrected,
        offsetAmount,
        originalFilename: data.filename,
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to upload subtitle');
    }
  });
}
