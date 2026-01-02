/**
 * Database helpers for e2e tests
 * 
 * Provides utilities to seed test data and clean up the test database.
 * Always uses TEST_DATABASE_URL to ensure we never touch production/dev data.
 * 
 * Uses a connection factory pattern with retry logic to handle transient
 * CONNECTION_ENDED errors that can occur during parallel test execution.
 */

import postgres, { Sql } from 'postgres';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema_test';

if (!TEST_DATABASE_URL.includes('_test')) {
  throw new Error('TEST_DATABASE_URL must contain "_test" to prevent accidental production database usage');
}

// Create a fresh connection for each operation to avoid CONNECTION_ENDED errors
function createConnection(): Sql {
  return postgres(TEST_DATABASE_URL, {
    max: 1,                    // Single connection per operation
    idle_timeout: 5,           // Close idle connections quickly
    connect_timeout: 10,       // Connection timeout
  });
}

// Retry wrapper for database operations
async function withRetry<T>(
  operation: (sql: Sql) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const sql = createConnection();
    try {
      const result = await operation(sql);
      await sql.end();
      return result;
    } catch (error) {
      lastError = error as Error;
      try { await sql.end(); } catch {}
      
      // Only retry on connection errors
      if (lastError.message?.includes('CONNECTION_ENDED') && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }
      throw lastError;
    }
  }
  
  throw lastError;
}

// Legacy export for backward compatibility (creates fresh connection)
export const sql = createConnection();

export async function cleanDatabase() {
  await withRetry(async (sql) => {
    await sql`
      TRUNCATE TABLE 
        video_sources,
        movie_images,
        movie_genres,
        movie_crew_translations,
        movie_crew,
        movie_cast_translations,
        movie_cast,
        movie_translations,
        movie_external_platforms,
        movie_notifications,
        people_translations,
        people,
        homepage_featured,
        movies,
        genre_translations,
        genres,
        rentals,
        watch_progress,
        video_analytics_events,
        user_sessions,
        oauth_accounts,
        users,
        trailers,
        movie_production_companies,
        production_company_translations,
        production_companies,
        person_aliases,
        audit_logs,
        short_pack_items,
        short_pack_translations,
        short_packs,
        email_verification_tokens,
        password_reset_tokens,
        user_watchlist
      CASCADE
    `;
  });
}

export async function seedTestMovie(data: {
  id?: string;
  titleEn?: string;
  titleLo?: string;
  overviewEn?: string;
  overviewLo?: string;
  releaseDate?: string;
  runtime?: number;
  voteAverage?: number;
  posterPath?: string;
  backdropPath?: string;
} = {}) {
  return withRetry(async (sql) => {
    // Set defaults
    const titleEn = data.titleEn || 'Test Movie';
    const titleLo = data.titleLo || 'ຮູບເງົາທົດສອບ';
    const overviewEn = data.overviewEn || 'Test movie overview';
    const overviewLo = data.overviewLo || 'ຄໍາອະທິບາຍຮູບເງົາທົດສອບ';
    const releaseDate = data.releaseDate || '2024-01-01';
    const runtime = data.runtime || 120;
    const voteAverage = data.voteAverage || 7.5;
    const posterPath = data.posterPath || '/test-poster.jpg';
    const backdropPath = data.backdropPath || '/test-backdrop.jpg';
    
    // Insert movie first (schema uses separate translations table now)
    const [movie] = await sql`
      INSERT INTO movies (
        original_title,
        release_date,
        runtime,
        vote_average,
        poster_path,
        backdrop_path
      ) VALUES (
        ${titleEn},
        ${releaseDate},
        ${runtime},
        ${voteAverage},
        ${posterPath},
        ${backdropPath}
      )
      RETURNING *
    `;
    
    // Insert English translation
    await sql`
      INSERT INTO movie_translations (movie_id, language, title, overview)
      VALUES (
        ${movie.id},
        'en'::language,
        ${titleEn},
        ${overviewEn}
      )
    `;
    
    // Insert Lao translation
    await sql`
      INSERT INTO movie_translations (movie_id, language, title, overview)
      VALUES (
        ${movie.id},
        'lo'::language,
        ${titleLo},
        ${overviewLo}
      )
    `;
    
    return movie;
  });
}

export async function seedTestUser(data: {
  email?: string;
  password?: string;
  displayName?: string;
  role?: 'user' | 'admin';
} = {}) {
  const { hashPassword } = await import('../../../api/src/lib/auth-utils.js');
  const passwordHash = await hashPassword(data.password || 'password123');
  
  return withRetry(async (sql) => {
    const [user] = await sql`
      INSERT INTO users (
        email,
        password_hash,
        display_name,
        role
      ) VALUES (
        ${data.email || 'test@example.com'},
        ${passwordHash},
        ${data.displayName || 'Test User'},
        ${data.role || 'user'}
      )
      RETURNING id, email, display_name, role, created_at, updated_at
    `;
    
    return user;
  });
}

export async function seedTestGenre(data: {
  id?: number;
  nameEn?: string;
  nameLo?: string;
} = {}) {
  const genreId = data.id || Math.floor(Math.random() * 1000);
  
  return withRetry(async (sql) => {
    const [genre] = await sql`
      INSERT INTO genres (id)
      VALUES (${genreId})
      RETURNING *
    `;
    
    // Insert English translation
    await sql`
      INSERT INTO genre_translations (genre_id, language, name)
      VALUES (${genreId}, 'en', ${data.nameEn || 'Drama'})
    `;
    
    // Insert Lao translation
    await sql`
      INSERT INTO genre_translations (genre_id, language, name)
      VALUES (${genreId}, 'lo', ${data.nameLo || 'ລະຄອນ'})
    `;
    
    return genre;
  });
}

export async function featureMovie(movieId: string, order: number = 0) {
  await withRetry(async (sql) => {
    await sql`
      INSERT INTO homepage_featured (movie_id, "order")
      VALUES (${movieId}, ${order})
      ON CONFLICT (movie_id) DO UPDATE SET "order" = ${order}
    `;
  });
}

export async function addVideoSource(movieId: string, data: {
  quality?: string;
  url?: string;
  format?: string;
} = {}) {
  return withRetry(async (sql) => {
    const [source] = await sql`
      INSERT INTO video_sources (
        movie_id,
        quality,
        url,
        format,
        size_bytes
      ) VALUES (
        ${movieId},
        ${data.quality || '1080p'},
        ${data.url || 'http://localhost:3002/videos/test-video/master.m3u8'},
        ${data.format || 'hls'},
        1000000
      )
      RETURNING *
    `;
    
    return source;
  });
}

export async function seedTestPerson(data: {
  id?: number;
  nameEn?: string;
  nameLo?: string;
  profilePath?: string;
} = {}) {
  return withRetry(async (sql) => {
    const personId = data.id || Math.floor(Math.random() * -1000000); // Negative for custom people
    
    const [person] = await sql`
      INSERT INTO people (id, profile_path)
      VALUES (${personId}, ${data.profilePath || null})
      RETURNING *
    `;
    
    // Insert English translation
    await sql`
      INSERT INTO people_translations (person_id, language, name)
      VALUES (${personId}, 'en', ${data.nameEn || 'Test Actor'})
    `;
    
    // Insert Lao translation
    await sql`
      INSERT INTO people_translations (person_id, language, name)
      VALUES (${personId}, 'lo', ${data.nameLo || 'ນັກສະແດງທົດສອບ'})
    `;
    
    return person;
  });
}

export async function addCastMember(movieId: string, personId: number, data: {
  characterEn?: string;
  characterLo?: string;
  order?: number;
} = {}) {
  return withRetry(async (sql) => {
    const [cast] = await sql`
      INSERT INTO movie_cast (movie_id, person_id, "order")
      VALUES (${movieId}, ${personId}, ${data.order || 0})
      RETURNING *
    `;
    
    // Insert English translation
    await sql`
      INSERT INTO movie_cast_translations (movie_id, person_id, language, character)
      VALUES (${movieId}, ${personId}, 'en', ${data.characterEn || 'Test Character'})
    `;
    
    // Insert Lao translation
    await sql`
      INSERT INTO movie_cast_translations (movie_id, person_id, language, character)
      VALUES (${movieId}, ${personId}, 'lo', ${data.characterLo || 'ຕົວລະຄອນທົດສອບ'})
    `;
    
    return cast;
  });
}

export async function addCrewMember(movieId: string, personId: number, data: {
  jobEn?: string;
  jobLo?: string;
  department?: string;
} = {}) {
  return withRetry(async (sql) => {
    const [crew] = await sql`
      INSERT INTO movie_crew (movie_id, person_id, department)
      VALUES (${movieId}, ${personId}, ${data.department || 'Directing'})
      RETURNING *
    `;
    
    // Insert English translation
    await sql`
      INSERT INTO movie_crew_translations (movie_id, person_id, language, job)
      VALUES (${movieId}, ${personId}, 'en', ${data.jobEn || 'Director'})
    `;
    
    // Insert Lao translation
    await sql`
      INSERT INTO movie_crew_translations (movie_id, person_id, language, job)
      VALUES (${movieId}, ${personId}, 'lo', ${data.jobLo || 'ຜູ້ກຳກັບ'})
    `;
    
    return crew;
  });
}

export async function addMovieGenre(movieId: string, genreId: number) {
  return withRetry(async (sql) => {
    await sql`
      INSERT INTO movie_genres (movie_id, genre_id)
      VALUES (${movieId}, ${genreId})
      ON CONFLICT DO NOTHING
    `;
  });
}

export async function seedPreviewPromoCode() {
  return withRetry(async (sql) => {
    // Insert PREVIEWCOUPON promo code for e2e tests (type: free, no restrictions)
    await sql`
      INSERT INTO promo_codes (
        code,
        discount_type,
        discount_value,
        is_active,
        uses_count
      ) VALUES (
        'PREVIEWCOUPON',
        'free',
        NULL,
        true,
        0
      )
      ON CONFLICT (code) DO NOTHING
    `;
  });
}

export async function closeDatabase() {
  // No-op since we use fresh connections per operation now
}
