/**
 * Development utility to link local HLS videos to movies
 * Usage: npm run link-video <movie-id> <video-slug>
 * Example: npm run link-video abc-123-uuid the-signal
 */

import 'dotenv/config';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const { videoSources, movies } = schema;

const movieId = process.argv[2];
const videoSlug = process.argv[3];

if (!movieId || !videoSlug) {
  console.error('Usage: npm run link-video <movie-id> <video-slug>');
  console.error('Example: npm run link-video abc-123-uuid the-signal');
  process.exit(1);
}

async function linkVideo() {
  console.log(`Linking video "${videoSlug}" to movie ${movieId}...`);

  // Verify movie exists
  const movie = await db.select().from(movies).where(eq(movies.id, movieId)).limit(1);
  
  if (!movie.length) {
    console.error(`❌ Error: Movie with ID "${movieId}" not found in database`);
    console.error('Tip: Run "npm run db:studio" to browse movies or query:');
    console.error('     psql -d lao_cinema -c "SELECT id, original_title FROM movies LIMIT 5;"');
    process.exit(1);
  }
  
  console.log(`Found movie: "${movie[0].originalTitle}"`);

  // Create video source entries for all quality levels
  const qualities: Array<'1080p' | '720p' | '480p' | '360p'> = ['1080p', '720p', '480p', '360p'];
  
  const videoEntries = qualities.map((quality) => ({
    movieId,
    quality,
    format: 'hls' as const,
    url: `/videos/hls/${videoSlug}/master.m3u8`, // Master playlist handles all qualities
  }));

  // Insert video sources
  await db.insert(videoSources).values(videoEntries);

  console.log('✅ Video linked successfully!');
  console.log(`Video URL: /videos/hls/${videoSlug}/master.m3u8`);
  console.log(`Qualities: ${qualities.join(', ')}`);
  
  process.exit(0);
}

linkVideo().catch((error) => {
  console.error('Error linking video:', error);
  process.exit(1);
});
