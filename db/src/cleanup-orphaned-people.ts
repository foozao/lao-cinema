// Clean up orphaned people (people not associated with any movies)
// This removes test data that may have leaked into production

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema';

async function cleanupOrphanedPeople() {
  console.log('🧹 Cleaning up orphaned people...');
  
  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });
  
  try {
    // Find people who have no cast or crew credits
    const result = await db.execute(sql`
      DELETE FROM people
      WHERE id NOT IN (
        SELECT DISTINCT person_id FROM movie_cast
        UNION
        SELECT DISTINCT person_id FROM movie_crew
      )
      RETURNING id
    `);
    
    const deletedCount = (result as any).length || 0;
    console.log(`✅ Deleted ${deletedCount} orphaned people`);
    
    if (deletedCount > 0) {
      console.log('   These were people not associated with any movies (likely test data)');
    }
  } catch (error) {
    console.error('❌ Failed to clean up orphaned people:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
  
  process.exit(0);
}

cleanupOrphanedPeople();
