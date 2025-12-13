#!/usr/bin/env tsx
/**
 * Add a video source to the database for a movie
 * 
 * The database stores just the folder path (e.g., "chanthaly").
 * The API constructs the full URL using the VIDEO_BASE_URL env var.
 * 
 * Usage:
 *   npx tsx scripts/add-video-source.ts --movie <id-or-title> --path <hls-folder> [options]
 * 
 * Examples:
 *   npx tsx scripts/add-video-source.ts --movie "Chanthaly" --path chanthaly
 *   npx tsx scripts/add-video-source.ts --movie "The Signal" --path the-signal --quality 1080p
 *   npx tsx scripts/add-video-source.ts --movie "The Signal" --list
 *   npx tsx scripts/add-video-source.ts --delete <video-source-id>
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { movies, movieTranslations, videoSources } from '../db/src/schema';
import { eq, or, sql, ilike } from 'drizzle-orm';

// Note: The database stores just the folder path (e.g., "chanthaly")
// The API constructs the full URL using VIDEO_BASE_URL env var

// Valid qualities and formats
type VideoQuality = 'original' | '1080p' | '720p' | '480p' | '360p';
type VideoFormat = 'mp4' | 'hls' | 'dash';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string | boolean> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        parsed[key] = nextArg;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  
  return parsed;
}

function showUsage() {
  console.log(`
📼 Add Video Source to Database

Usage (run from db/ folder):
  cd db && npx tsx ../scripts/add-video-source.ts --movie <id-or-title> --path <hls-folder> [options]

Required:
  --movie <id-or-title>   Movie UUID or title to search for
  --path <hls-folder>     HLS folder name (e.g., "the-signal")

Options:
  --quality <quality>     Video quality: original, 1080p, 720p, 480p, 360p (default: original)
  --format <format>       Video format: hls, mp4, dash (default: hls)
  --width <pixels>        Video width in pixels
  --height <pixels>       Video height in pixels
  --aspect-ratio <ratio>  Aspect ratio (e.g., "16:9", "2.35:1")
  --list                  List existing video sources for the movie
  --delete <id>           Delete a video source by ID
  --help                  Show this help message

Examples:
  # Add video source (path is the HLS folder name)
  cd db && npx tsx ../scripts/add-video-source.ts --movie "The Signal" --path the-signal

  # With full metadata
  cd db && npx tsx ../scripts/add-video-source.ts --movie "Last Dance" --path last-dance \\
    --quality 1080p --width 1920 --height 1080 --aspect-ratio "16:9"

  # List sources for a movie
  cd db && npx tsx ../scripts/add-video-source.ts --movie "The Signal" --list

  # Delete a source
  cd db && npx tsx ../scripts/add-video-source.ts --delete abc123-uuid
`);
}

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgres://laocinema:laocinema_dev@localhost:5432/lao_cinema';
const client = postgres(connectionString);
const db = drizzle(client);

async function findMovie(movieIdOrTitle: string) {
  // Check if it's a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(movieIdOrTitle)) {
    const result = await db
      .select({
        id: movies.id,
        originalTitle: movies.originalTitle,
      })
      .from(movies)
      .where(eq(movies.id, movieIdOrTitle))
      .limit(1);
    
    if (result.length > 0) {
      // Get translations for display
      const translations = await db
        .select({ language: movieTranslations.language, title: movieTranslations.title })
        .from(movieTranslations)
        .where(eq(movieTranslations.movieId, result[0].id));
      
      return { ...result[0], translations };
    }
    return null;
  }
  
  // Search by title in translations
  const results = await db
    .select({
      id: movies.id,
      originalTitle: movies.originalTitle,
    })
    .from(movies)
    .innerJoin(movieTranslations, eq(movies.id, movieTranslations.movieId))
    .where(ilike(movieTranslations.title, `%${movieIdOrTitle}%`))
    .limit(10);
  
  // Deduplicate by movie ID
  const uniqueMovies = [...new Map(results.map(m => [m.id, m])).values()];
  
  if (uniqueMovies.length === 0) {
    return null;
  }
  
  if (uniqueMovies.length > 1) {
    console.log('\n⚠️  Multiple movies found:');
    for (const movie of uniqueMovies) {
      const translations = await db
        .select({ language: movieTranslations.language, title: movieTranslations.title })
        .from(movieTranslations)
        .where(eq(movieTranslations.movieId, movie.id));
      
      const titles = translations.map(t => `${t.language}: "${t.title}"`).join(', ');
      console.log(`   ${movie.id} - ${titles}`);
    }
    console.log('\nPlease use the exact UUID to specify which movie.');
    return null;
  }
  
  // Get translations for the single result
  const translations = await db
    .select({ language: movieTranslations.language, title: movieTranslations.title })
    .from(movieTranslations)
    .where(eq(movieTranslations.movieId, uniqueMovies[0].id));
  
  return { ...uniqueMovies[0], translations };
}

async function listVideoSources(movieId: string) {
  const sources = await db
    .select()
    .from(videoSources)
    .where(eq(videoSources.movieId, movieId));
  
  if (sources.length === 0) {
    console.log('   (no video sources)');
    return;
  }
  
  for (const source of sources) {
    console.log(`   📹 ${source.id}`);
    console.log(`      Format: ${source.format} | Quality: ${source.quality}`);
    console.log(`      URL: ${source.url}`);
    if (source.width && source.height) {
      console.log(`      Dimensions: ${source.width}x${source.height}`);
    }
    if (source.aspectRatio) {
      console.log(`      Aspect Ratio: ${source.aspectRatio}`);
    }
    console.log('');
  }
}

async function deleteVideoSource(sourceId: string) {
  const result = await db
    .delete(videoSources)
    .where(eq(videoSources.id, sourceId))
    .returning({ id: videoSources.id });
  
  if (result.length === 0) {
    console.log(`❌ Video source not found: ${sourceId}`);
    return false;
  }
  
  console.log(`✅ Deleted video source: ${sourceId}`);
  return true;
}

async function addVideoSource(
  movieId: string,
  hlsPath: string,
  quality: VideoQuality,
  format: VideoFormat,
  width?: number,
  height?: number,
  aspectRatio?: string
) {
  // Store just the folder path - the API constructs full URL using VIDEO_BASE_URL
  const url = hlsPath;
  
  // Check for existing source with same path
  const existing = await db
    .select()
    .from(videoSources)
    .where(eq(videoSources.url, url))
    .limit(1);
  
  if (existing.length > 0) {
    console.log(`\n⚠️  A video source with this path already exists:`);
    console.log(`   ID: ${existing[0].id}`);
    console.log(`   Path: ${existing[0].url}`);
    console.log(`\nUse --delete ${existing[0].id} to remove it first, or use a different path.`);
    return null;
  }
  
  const result = await db
    .insert(videoSources)
    .values({
      movieId,
      quality,
      format,
      url,
      width: width || null,
      height: height || null,
      aspectRatio: aspectRatio || null,
    })
    .returning();
  
  return result[0];
}

async function main() {
  const args = parseArgs();
  
  if (args.help || Object.keys(args).length === 0) {
    showUsage();
    await client.end();
    process.exit(0);
  }
  
  // Handle delete
  if (args.delete && typeof args.delete === 'string') {
    await deleteVideoSource(args.delete);
    await client.end();
    process.exit(0);
  }
  
  // Require movie for other operations
  if (!args.movie) {
    console.error('❌ --movie is required');
    showUsage();
    await client.end();
    process.exit(1);
  }
  
  const movieIdOrTitle = args.movie as string;
  console.log(`\n🔍 Searching for movie: "${movieIdOrTitle}"...`);
  
  const movie = await findMovie(movieIdOrTitle);
  
  if (!movie) {
    console.error(`❌ Movie not found: "${movieIdOrTitle}"`);
    await client.end();
    process.exit(1);
  }
  
  const movieTitles = movie.translations?.map(t => `${t.language}: "${t.title}"`).join(', ') || movie.originalTitle;
  console.log(`✅ Found: ${movieTitles}`);
  console.log(`   ID: ${movie.id}`);
  
  // Handle list
  if (args.list) {
    console.log('\n📋 Video sources:');
    await listVideoSources(movie.id);
    await client.end();
    process.exit(0);
  }
  
  // Add new source
  if (!args.path) {
    console.error('❌ --path is required to add a video source');
    showUsage();
    await client.end();
    process.exit(1);
  }
  
  const hlsPath = args.path as string;
  const quality = (args.quality as VideoQuality) || 'original';
  const format = (args.format as VideoFormat) || 'hls';
  const width = args.width ? parseInt(args.width as string, 10) : undefined;
  const height = args.height ? parseInt(args.height as string, 10) : undefined;
  const aspectRatio = args['aspect-ratio'] as string | undefined;
  
  // Validate quality
  const validQualities: VideoQuality[] = ['original', '1080p', '720p', '480p', '360p'];
  if (!validQualities.includes(quality)) {
    console.error(`❌ Invalid quality: "${quality}". Must be one of: ${validQualities.join(', ')}`);
    await client.end();
    process.exit(1);
  }
  
  // Validate format
  const validFormats: VideoFormat[] = ['hls', 'mp4', 'dash'];
  if (!validFormats.includes(format)) {
    console.error(`❌ Invalid format: "${format}". Must be one of: ${validFormats.join(', ')}`);
    await client.end();
    process.exit(1);
  }
  
  console.log(`\n📼 Adding video source:`);
  console.log(`   Path: ${hlsPath}`);
  console.log(`   Format: ${format}`);
  console.log(`   Quality: ${quality}`);
  if (width && height) console.log(`   Dimensions: ${width}x${height}`);
  if (aspectRatio) console.log(`   Aspect Ratio: ${aspectRatio}`);
  
  const result = await addVideoSource(movie.id, hlsPath, quality, format, width, height, aspectRatio);
  
  if (result) {
    console.log(`\n✅ Video source added!`);
    console.log(`   ID: ${result.id}`);
    console.log(`   URL: ${result.url}`);
  }
  
  await client.end();
}

main().catch(async (error) => {
  console.error('❌ Error:', error.message);
  await client.end();
  process.exit(1);
});
