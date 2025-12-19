// Shared utility for building movie objects with all relations
// This ensures consistency across all movie-related endpoints

import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Builds a complete movie object with all relations (translations, cast, crew, etc.)
 * Used by GET /movies, GET /movies/:id, and GET /homepage/featured
 */
export async function buildMovieWithRelations(
  movie: any,
  db: PostgresJsDatabase<any>,
  schema: any,
  options: {
    includeCast?: boolean;
    includeCrew?: boolean;
    includeGenres?: boolean;
    includeImages?: boolean;
    castLimit?: number;
    crewLimit?: number;
  } = {}
) {
  const {
    includeCast = true,
    includeCrew = true,
    includeGenres = true,
    includeImages = false,
    castLimit,
    crewLimit,
  } = options;
  
  // Apply defaults only if not explicitly provided (including undefined)
  const finalCastLimit = 'castLimit' in options ? castLimit : 3;
  const finalCrewLimit = crewLimit;

  // Fetch translations
  const translations = await db.select()
    .from(schema.movieTranslations)
    .where(eq(schema.movieTranslations.movieId, movie.id));

  const title: any = {};
  const overview: any = {};
  const tagline: any = {};

  for (const trans of translations) {
    title[trans.language] = trans.title;
    overview[trans.language] = trans.overview;
    if (trans.tagline) {
      tagline[trans.language] = trans.tagline;
    }
  }

  // Fetch video sources
  const videoSources = await db.select()
    .from(schema.videoSources)
    .where(eq(schema.videoSources.movieId, movie.id));

  // Fetch external platforms
  const externalPlatforms = await db.select()
    .from(schema.movieExternalPlatforms)
    .where(eq(schema.movieExternalPlatforms.movieId, movie.id));

  // Fetch trailers (ordered by display order)
  const movieTrailers = await db.select()
    .from(schema.trailers)
    .where(eq(schema.trailers.movieId, movie.id))
    .orderBy(schema.trailers.order);

  // Build base movie object
  const movieData: any = {
    id: movie.id,
    tmdb_id: movie.tmdbId,
    imdb_id: movie.imdbId,
    slug: movie.slug,
    type: movie.type || 'feature',
    original_title: movie.originalTitle,
    original_language: movie.originalLanguage,
    poster_path: movie.posterPath,
    backdrop_path: movie.backdropPath,
    release_date: movie.releaseDate,
    runtime: movie.runtime,
    vote_average: movie.voteAverage,
    vote_count: movie.voteCount,
    popularity: movie.popularity,
    adult: movie.adult,
    availability_status: movie.availabilityStatus,
    trailers: movieTrailers.map(t => ({
      id: t.id,
      type: t.type,
      name: t.name,
      official: t.official,
      language: t.language,
      published_at: t.publishedAt,
      order: t.order,
      // YouTube trailer fields
      ...(t.type === 'youtube' && { key: t.youtubeKey }),
      // Video trailer fields
      ...(t.type === 'video' && {
        video_url: t.videoUrl,
        video_format: t.videoFormat,
        video_quality: t.videoQuality,
        size_bytes: t.sizeBytes,
        width: t.width,
        height: t.height,
        duration_seconds: t.durationSeconds,
      }),
    })),
    title: Object.keys(title).length > 0 ? title : { en: movie.originalTitle || 'Untitled' },
    overview: Object.keys(overview).length > 0 ? overview : { en: '' },
    tagline: Object.keys(tagline).length > 0 ? tagline : undefined,
    video_sources: videoSources.map(vs => {
      const baseUrl = process.env.VIDEO_BASE_URL || 'https://storage.googleapis.com/lao-cinema-videos/hls';
      return {
        id: vs.id,
        url: `${baseUrl}/${vs.url}/master.m3u8`,
        quality: vs.quality,
        format: vs.format,
        width: vs.width,
        height: vs.height,
        aspect_ratio: vs.aspectRatio,
      };
    }),
    external_platforms: externalPlatforms.map(ep => ({
      platform: ep.platform,
      url: ep.url,
    })),
    created_at: movie.createdAt,
    updated_at: movie.updatedAt,
  };

  // Fetch cast if requested - using batch fetching to avoid N+1 queries
  if (includeCast) {
    let castQuery = db.select()
      .from(schema.movieCast)
      .where(eq(schema.movieCast.movieId, movie.id))
      .orderBy(schema.movieCast.order);

    if (finalCastLimit) {
      castQuery = castQuery.limit(finalCastLimit) as any;
    }

    const castData = await castQuery;

    if (castData.length > 0) {
      // Batch fetch all data in 3 queries instead of 3N queries
      const personIds = castData.map((c: any) => c.personId);
      
      const [people, personTranslations, characterTranslations] = await Promise.all([
        db.select().from(schema.people)
          .where(sql`${schema.people.id} IN (${sql.join(personIds.map((id: any) => sql`${id}`), sql`, `)})`),
        db.select().from(schema.peopleTranslations)
          .where(sql`${schema.peopleTranslations.personId} IN (${sql.join(personIds.map((id: any) => sql`${id}`), sql`, `)})`),
        db.select().from(schema.movieCastTranslations)
          .where(eq(schema.movieCastTranslations.movieId, movie.id)),
      ]);

      // Create lookup maps for O(1) access
      const peopleMap = new Map(people.map((p: any) => [p.id, p]));
      const personTransMap = new Map<number, any[]>();
      for (const trans of personTranslations) {
        if (!personTransMap.has(trans.personId)) {
          personTransMap.set(trans.personId, []);
        }
        personTransMap.get(trans.personId)!.push(trans);
      }
      const charTransMap = new Map<number, any[]>();
      for (const trans of characterTranslations) {
        if (!charTransMap.has(trans.personId)) {
          charTransMap.set(trans.personId, []);
        }
        charTransMap.get(trans.personId)!.push(trans);
      }

      // Build cast array using maps
      movieData.cast = castData
        .map((castMember: any) => {
          const person = peopleMap.get(castMember.personId);
          if (!person) return null;

          const personName: any = {};
          const character: any = {};

          for (const trans of personTransMap.get(castMember.personId) || []) {
            personName[trans.language] = trans.name;
          }
          for (const trans of charTransMap.get(castMember.personId) || []) {
            character[trans.language] = trans.character;
          }

          return {
            person: {
              id: person.id,
              name: Object.keys(personName).length > 0 ? personName : { en: 'Unknown' },
              profile_path: person.profilePath,
            },
            character: Object.keys(character).length > 0 ? character : { en: '' },
            order: castMember.order,
          };
        })
        .filter((c: any) => c !== null);
    } else {
      movieData.cast = [];
    }
  } else {
    movieData.cast = [];
  }

  // Fetch crew if requested - using batch fetching to avoid N+1 queries
  if (includeCrew) {
    let crewQuery = db.select()
      .from(schema.movieCrew)
      .where(eq(schema.movieCrew.movieId, movie.id));

    if (finalCrewLimit) {
      crewQuery = crewQuery.limit(finalCrewLimit) as any;
    }

    const crewData = await crewQuery;

    if (crewData.length > 0) {
      // Batch fetch all data in 3 queries instead of 3N queries
      const personIds = crewData.map((c: any) => c.personId);
      
      const [people, personTranslations, jobTranslations] = await Promise.all([
        db.select().from(schema.people)
          .where(sql`${schema.people.id} IN (${sql.join(personIds.map((id: any) => sql`${id}`), sql`, `)})`),
        db.select().from(schema.peopleTranslations)
          .where(sql`${schema.peopleTranslations.personId} IN (${sql.join(personIds.map((id: any) => sql`${id}`), sql`, `)})`),
        db.select().from(schema.movieCrewTranslations)
          .where(eq(schema.movieCrewTranslations.movieId, movie.id)),
      ]);

      // Create lookup maps for O(1) access
      const peopleMap = new Map(people.map((p: any) => [p.id, p]));
      const personTransMap = new Map<number, any[]>();
      for (const trans of personTranslations) {
        if (!personTransMap.has(trans.personId)) {
          personTransMap.set(trans.personId, []);
        }
        personTransMap.get(trans.personId)!.push(trans);
      }
      const jobTransMap = new Map<number, any[]>();
      for (const trans of jobTranslations) {
        if (!jobTransMap.has(trans.personId)) {
          jobTransMap.set(trans.personId, []);
        }
        jobTransMap.get(trans.personId)!.push(trans);
      }

      // Build crew array using maps
      movieData.crew = crewData
        .map((crewMember: any) => {
          const person = peopleMap.get(crewMember.personId);
          if (!person) return null;

          const personName: any = {};
          const job: any = {};

          for (const trans of personTransMap.get(crewMember.personId) || []) {
            personName[trans.language] = trans.name;
          }
          // Filter by department since a person can have multiple roles (Director, Writer, etc.)
          for (const trans of jobTransMap.get(crewMember.personId) || []) {
            if (trans.department === crewMember.department) {
              job[trans.language] = trans.job;
            }
          }

          return {
            person: {
              id: person.id,
              name: Object.keys(personName).length > 0 ? personName : { en: 'Unknown' },
              profile_path: person.profilePath,
            },
            job: Object.keys(job).length > 0 ? job : { en: crewMember.department },
            department: crewMember.department,
          };
        })
        .filter((c: any) => c !== null);
    } else {
      movieData.crew = [];
    }
  } else {
    movieData.crew = [];
  }

  // Fetch genres if requested
  if (includeGenres) {
    const movieGenres = await db.select()
      .from(schema.movieGenres)
      .where(eq(schema.movieGenres.movieId, movie.id));

    const genreIds = movieGenres.map((mg: any) => mg.genreId);

    if (genreIds.length > 0) {
      const genres = await db.select()
        .from(schema.genres)
        .where(sql`${schema.genres.id} IN (${sql.join(genreIds.map((id: any) => sql`${id}`), sql`, `)})`);

      const genreTranslations = await db.select()
        .from(schema.genreTranslations)
        .where(sql`${schema.genreTranslations.genreId} IN (${sql.join(genreIds.map((id: any) => sql`${id}`), sql`, `)})`);

      movieData.genres = genres.map((genre: any) => {
        const genreTrans = genreTranslations.filter((gt: any) => gt.genreId === genre.id);
        const genreName: any = {};
        for (const trans of genreTrans) {
          genreName[trans.language] = trans.name;
        }

        return {
          id: genre.id,
          name: Object.keys(genreName).length > 0 ? genreName : { en: 'Unknown' },
        };
      });
    } else {
      movieData.genres = [];
    }
  } else {
    movieData.genres = [];
  }

  // Fetch images if requested
  if (includeImages) {
    const images = await db.select()
      .from(schema.movieImages)
      .where(eq(schema.movieImages.movieId, movie.id));

    movieData.images = images.map((img: any) => ({
      id: img.id,
      file_path: img.filePath,
      type: img.type,
      iso_639_1: img.iso6391,
      width: img.width,
      height: img.height,
      aspect_ratio: img.aspectRatio,
      vote_average: img.voteAverage,
      vote_count: img.voteCount,
      is_primary: img.isPrimary,
    }));
  }

  // Fetch production companies
  const movieProductionCompanies = await db.select()
    .from(schema.movieProductionCompanies)
    .where(eq(schema.movieProductionCompanies.movieId, movie.id))
    .orderBy(schema.movieProductionCompanies.order);

  const companyIds = movieProductionCompanies.map((mpc: any) => mpc.companyId);

  if (companyIds.length > 0) {
    const [companies, companyTranslations] = await Promise.all([
      db.select()
        .from(schema.productionCompanies)
        .where(sql`${schema.productionCompanies.id} IN (${sql.join(companyIds.map((id: any) => sql`${id}`), sql`, `)})`),
      db.select()
        .from(schema.productionCompanyTranslations)
        .where(sql`${schema.productionCompanyTranslations.companyId} IN (${sql.join(companyIds.map((id: any) => sql`${id}`), sql`, `)})`),
    ]);

    const companiesMap = new Map(companies.map((c: any) => [c.id, c]));
    const transMap = new Map<number, any[]>();
    for (const trans of companyTranslations) {
      if (!transMap.has(trans.companyId)) {
        transMap.set(trans.companyId, []);
      }
      transMap.get(trans.companyId)!.push(trans);
    }

    movieData.production_companies = movieProductionCompanies
      .map((mpc: any) => {
        const company = companiesMap.get(mpc.companyId);
        if (!company) return null;

        const name: any = {};
        for (const trans of transMap.get(mpc.companyId) || []) {
          name[trans.language] = trans.name;
        }

        return {
          id: company.id,
          name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
          logo_path: company.logoPath,
          custom_logo_url: company.customLogoUrl,
          origin_country: company.originCountry,
        };
      })
      .filter((c: any) => c !== null);
  } else {
    movieData.production_companies = [];
  }

  return movieData;
}

/**
 * Builds cast and crew credits for a person with optimized batch queries
 * Avoids N+1 query problem by fetching all data in batches
 * 
 * @param personId - ID of the person to fetch credits for
 * @param db - Database instance
 * @param schema - Database schema
 * @returns Object with cast and crew arrays
 */
export async function buildPersonCredits(
  personId: number,
  db: PostgresJsDatabase<any>,
  schema: any
) {
  // Fetch all cast and crew credits for this person
  const [castCredits, crewCredits] = await Promise.all([
    db.select()
      .from(schema.movieCast)
      .where(eq(schema.movieCast.personId, personId)),
    db.select()
      .from(schema.movieCrew)
      .where(eq(schema.movieCrew.personId, personId)),
  ]);

  // Extract unique movie IDs
  const castMovieIds = castCredits.map((c: any) => c.movieId);
  const crewMovieIds = crewCredits.map((c: any) => c.movieId);
  const allMovieIds = [...new Set([...castMovieIds, ...crewMovieIds])];

  // If no credits, return empty arrays
  if (allMovieIds.length === 0) {
    return { cast: [], crew: [] };
  }

  // Batch fetch all movies and translations in 2 queries instead of 2N queries
  const [movies, movieTranslations] = await Promise.all([
    allMovieIds.length > 0
      ? db.select()
          .from(schema.movies)
          .where(sql`${schema.movies.id} IN (${sql.join(allMovieIds.map((id: any) => sql`${id}`), sql`, `)})`)
      : Promise.resolve([]),
    allMovieIds.length > 0
      ? db.select()
          .from(schema.movieTranslations)
          .where(sql`${schema.movieTranslations.movieId} IN (${sql.join(allMovieIds.map((id: any) => sql`${id}`), sql`, `)})`)
      : Promise.resolve([]),
  ]);

  // Batch fetch character and job translations
  const [characterTranslations, jobTranslations] = await Promise.all([
    castMovieIds.length > 0
      ? db.select()
          .from(schema.movieCastTranslations)
          .where(sql`${schema.movieCastTranslations.personId} = ${personId} AND ${schema.movieCastTranslations.movieId} IN (${sql.join(castMovieIds.map((id: any) => sql`${id}`), sql`, `)})`)
      : Promise.resolve([]),
    crewMovieIds.length > 0
      ? db.select()
          .from(schema.movieCrewTranslations)
          .where(sql`${schema.movieCrewTranslations.personId} = ${personId} AND ${schema.movieCrewTranslations.movieId} IN (${sql.join(crewMovieIds.map((id: any) => sql`${id}`), sql`, `)})`)
      : Promise.resolve([]),
  ]);

  // Create lookup maps for O(1) access
  const moviesMap = new Map(movies.map((m: any) => [m.id, m]));
  
  const movieTransMap = new Map<string, any[]>();
  for (const trans of movieTranslations) {
    if (!movieTransMap.has(trans.movieId)) {
      movieTransMap.set(trans.movieId, []);
    }
    movieTransMap.get(trans.movieId)!.push(trans);
  }

  const charTransMap = new Map<string, any[]>();
  for (const trans of characterTranslations) {
    if (!charTransMap.has(trans.movieId)) {
      charTransMap.set(trans.movieId, []);
    }
    charTransMap.get(trans.movieId)!.push(trans);
  }

  const jobTransMap = new Map<string, any>();
  for (const trans of jobTranslations) {
    const key = `${trans.movieId}-${trans.department}`;
    if (!jobTransMap.has(key)) {
      jobTransMap.set(key, []);
    }
    jobTransMap.get(key)!.push(trans);
  }

  // Build cast array using maps
  const cast = castCredits
    .map((credit: any) => {
      const movie = moviesMap.get(credit.movieId);
      if (!movie) return null;

      // Build movie title from translations
      const movieTitle: any = {};
      for (const trans of movieTransMap.get(credit.movieId) || []) {
        movieTitle[trans.language] = trans.title;
      }

      // Build character from translations
      const character: any = {};
      for (const trans of charTransMap.get(credit.movieId) || []) {
        character[trans.language] = trans.character;
      }

      return {
        movie: {
          id: movie.id,
          slug: movie.slug,
          title: Object.keys(movieTitle).length > 0 ? movieTitle : { en: movie.originalTitle || 'Untitled' },
          poster_path: movie.posterPath,
          release_date: movie.releaseDate,
        },
        character: Object.keys(character).length > 0 ? character : { en: '' },
        order: credit.order,
      };
    })
    .filter((c: any) => c !== null);

  // Build crew array using maps
  const crew = crewCredits
    .map((credit: any) => {
      const movie = moviesMap.get(credit.movieId);
      if (!movie) return null;

      // Build movie title from translations
      const movieTitle: any = {};
      for (const trans of movieTransMap.get(credit.movieId) || []) {
        movieTitle[trans.language] = trans.title;
      }

      // Build job from translations (filtered by department)
      const job: any = {};
      const key = `${credit.movieId}-${credit.department}`;
      for (const trans of jobTransMap.get(key) || []) {
        job[trans.language] = trans.job;
      }

      return {
        movie: {
          id: movie.id,
          slug: movie.slug,
          title: Object.keys(movieTitle).length > 0 ? movieTitle : { en: movie.originalTitle || 'Untitled' },
          poster_path: movie.posterPath,
          release_date: movie.releaseDate,
        },
        job: Object.keys(job).length > 0 ? job : { en: '' },
        department: credit.department,
      };
    })
    .filter((c: any) => c !== null);

  return { cast, crew };
}
