#!/usr/bin/env tsx
/**
 * Update video URLs in database to point to Google Cloud Storage
 * Usage: npx tsx scripts/update-video-urls.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { movies } from '../db/src/schema';
import { eq, or, like, sql } from 'drizzle-orm';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgres://laocinema:laocinema_dev@localhost:5432/lao_cinema';
const client = postgres(connectionString);
const db = drizzle(client);

const GCS_BASE_URL = 'https://storage.googleapis.com/lao-cinema-videos/hls';

async function updateVideoUrls() {
  console.log('🔄 Updating video URLs to Google Cloud Storage...\n');

  try {
    // Update last-dance
    console.log('Updating "Last Dance"...');
    const lastDanceResult = await db
      .update(movies)
      .set({ 
        videoUrl: `${GCS_BASE_URL}/last-dance/master.m3u8`,
        updatedAt: new Date()
      })
      .where(
        or(
          sql`${movies.title}->>'en' ILIKE '%last dance%'`,
          sql`${movies.title}->>'lo' ILIKE '%last dance%'`,
          eq(movies.id, '3e5f236f-1a1b-40d4-aba8-729a8033d3bb')
        )
      )
      .returning({ id: movies.id, title: movies.title });

    if (lastDanceResult.length > 0) {
      console.log(`✅ Updated ${lastDanceResult.length} movie(s):`);
      lastDanceResult.forEach(m => {
        console.log(`   - ${m.title.en || m.title.lo} (${m.id})`);
      });
    } else {
      console.log('⚠️  No movies found matching "Last Dance"');
    }

    // Update the-signal (when uploaded)
    console.log('\nUpdating "The Signal"...');
    const signalResult = await db
      .update(movies)
      .set({ 
        videoUrl: `${GCS_BASE_URL}/the-signal/master.m3u8`,
        updatedAt: new Date()
      })
      .where(
        or(
          sql`${movies.title}->>'en' ILIKE '%signal%'`,
          sql`${movies.title}->>'lo' ILIKE '%signal%'`
        )
      )
      .returning({ id: movies.id, title: movies.title });

    if (signalResult.length > 0) {
      console.log(`✅ Updated ${signalResult.length} movie(s):`);
      signalResult.forEach(m => {
        console.log(`   - ${m.title.en || m.title.lo} (${m.id})`);
      });
    } else {
      console.log('⚠️  No movies found matching "The Signal"');
    }

    // Verify all GCS URLs
    console.log('\n📋 All movies with GCS video URLs:');
    const gcsMovies = await db
      .select({
        id: movies.id,
        title: movies.title,
        videoUrl: movies.videoUrl
      })
      .from(movies)
      .where(sql`${movies.videoUrl} LIKE '%storage.googleapis.com%'`);

    if (gcsMovies.length > 0) {
      gcsMovies.forEach(m => {
        console.log(`   - ${m.title.en || m.title.lo}`);
        console.log(`     ${m.videoUrl}`);
      });
    } else {
      console.log('   (none)');
    }

    console.log('\n✅ Update complete!');
  } catch (error) {
    console.error('❌ Error updating video URLs:', error);
    throw error;
  } finally {
    await client.end();
  }
}

updateVideoUrls();
