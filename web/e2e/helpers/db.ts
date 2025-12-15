/**
 * Database helpers for e2e tests
 * 
 * Provides utilities to seed test data and clean up the test database.
 * Always uses TEST_DATABASE_URL to ensure we never touch production/dev data.
 */

import postgres from 'postgres';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema_test';

if (!TEST_DATABASE_URL.includes('_test')) {
  throw new Error('TEST_DATABASE_URL must contain "_test" to prevent accidental production database usage');
}

const sql = postgres(TEST_DATABASE_URL);

export async function cleanDatabase() {
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
}

export async function seedTestUser(data: {
  email?: string;
  password?: string;
  displayName?: string;
  role?: 'user' | 'admin';
} = {}) {
  const { hashPassword } = await import('../../../api/src/lib/auth-utils.js');
  const passwordHash = await hashPassword(data.password || 'password123');
  
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
}

export async function seedTestGenre(data: {
  id?: number;
  nameEn?: string;
  nameLo?: string;
} = {}) {
  const genreId = data.id || Math.floor(Math.random() * 1000);
  
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
}

export async function featureMovie(movieId: string, order: number = 0) {
  await sql`
    INSERT INTO homepage_featured (movie_id, "order")
    VALUES (${movieId}, ${order})
    ON CONFLICT (movie_id) DO UPDATE SET "order" = ${order}
  `;
}

export async function addVideoSource(movieId: string, data: {
  quality?: string;
  url?: string;
  format?: string;
} = {}) {
  const [source] = await sql`
    INSERT INTO video_sources (
      movie_id,
      quality,
      url,
      format,
      file_size
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
}

export async function closeDatabase() {
  await sql.end();
}
