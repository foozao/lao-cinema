import { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
const { subtitleTracks } = schema;
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Subtitle serving endpoint with dynamic line positioning
 * Reads VTT file from disk and injects line position on-the-fly
 */
export default async function subtitlesRoutes(fastify: FastifyInstance) {
  // Serve subtitle with dynamic line positioning
  fastify.get('/subtitles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      // Fetch subtitle track metadata
      const [track] = await db.select()
        .from(subtitleTracks)
        .where(eq(subtitleTracks.id, id))
        .limit(1);
      
      if (!track) {
        return reply.code(404).send({ error: 'Subtitle not found' });
      }
      
      // Read VTT file from disk
      // URL stored in DB is like: http://localhost:3002/subtitles/{movieId}/{filename}.vtt
      // or https://storage.googleapis.com/bucket/subtitles/{filename}.vtt
      const videoServerPath = process.env.VIDEO_SERVER_PATH || join(__dirname, '../../../video-server/public');
      
      // Extract the path part from the full URL
      let subtitlePath = track.url;
      try {
        const urlObj = new URL(track.url);
        subtitlePath = decodeURIComponent(urlObj.pathname); // Decode %20 -> space, etc.
      } catch {
        // If not a valid URL, assume it's already a path
        subtitlePath = decodeURIComponent(subtitlePath);
      }
      
      const vttPath = join(videoServerPath, subtitlePath.replace(/^\//, ''));
      
      let vttContent: string;
      try {
        vttContent = await readFile(vttPath, 'utf-8');
      } catch (err) {
        fastify.log.error({ err, path: vttPath }, 'Failed to read VTT file');
        return reply.code(404).send({ error: 'Subtitle file not found' });
      }
      
      // Inject line positioning into all cue timestamps
      const modifiedVtt = injectLinePosition(vttContent, track.linePosition);
      
      // Send with proper headers
      reply.header('Content-Type', 'text/vtt; charset=utf-8');
      reply.header('Access-Control-Allow-Origin', '*');
      return modifiedVtt;
    } catch (err) {
      fastify.log.error({ err }, 'Error serving subtitle');
      return reply.code(500).send({ error: 'Failed to serve subtitle' });
    }
  });
}

/**
 * Inject line:N% positioning into VTT cue timestamps
 * Example: 00:00:01.000 --> 00:00:04.000 becomes 00:00:01.000 --> 00:00:04.000 line:10%
 */
function injectLinePosition(vttContent: string, linePosition: number): string {
  const lines = vttContent.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect timestamp line (contains -->)
    if (line.includes('-->')) {
      // Check if it already has positioning settings
      const hasSettings = line.includes('line:') || line.includes('position:') || line.includes('align:');
      
      if (!hasSettings) {
        // Add line positioning
        result.push(`${line} line:${linePosition}%`);
      } else {
        // Already has settings, don't modify
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}
