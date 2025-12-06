// Shared utility for building movie objects with all relations
// This ensures consistency across all movie-related endpoints

import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Builds a complete movie object with all relations (translations, cast, crew, etc.)
 * Used by GET /movies, GET /movies/:id, and GET /homepage/featured
 */
export async function buildMovieWithRelations(
  movie: any,
  db: NodePgDatabase<any>,
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
    castLimit = 3,
    crewLimit = undefined,
  } = options;

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

  // Build base movie object
  const movieData: any = {
    id: movie.id,
    tmdb_id: movie.tmdbId,
    imdb_id: movie.imdbId,
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

  // Fetch cast if requested
  if (includeCast) {
    let castQuery = db.select()
      .from(schema.movieCast)
      .where(eq(schema.movieCast.movieId, movie.id))
      .orderBy(schema.movieCast.order);

    if (castLimit) {
      castQuery = castQuery.limit(castLimit) as any;
    }

    const castData = await castQuery;

    const cast = await Promise.all(castData.map(async (castMember: any) => {
      const person = await db.select().from(schema.people).where(eq(schema.people.id, castMember.personId)).limit(1);
      const personTranslations = await db.select().from(schema.peopleTranslations).where(eq(schema.peopleTranslations.personId, castMember.personId));
      const characterTranslations = await db.select().from(schema.movieCastTranslations)
        .where(sql`${schema.movieCastTranslations.movieId} = ${movie.id} AND ${schema.movieCastTranslations.personId} = ${castMember.personId}`);

      if (person[0]) {
        const personName: any = {};
        const character: any = {};

        for (const trans of personTranslations) {
          personName[trans.language] = trans.name;
        }
        for (const trans of characterTranslations) {
          character[trans.language] = trans.character;
        }

        return {
          person: {
            id: person[0].id,
            name: Object.keys(personName).length > 0 ? personName : { en: 'Unknown' },
            profile_path: person[0].profilePath,
          },
          character: Object.keys(character).length > 0 ? character : { en: '' },
          order: castMember.order,
        };
      }
      return null;
    }));

    movieData.cast = cast.filter((c: any) => c !== null);
  } else {
    movieData.cast = [];
  }

  // Fetch crew if requested
  if (includeCrew) {
    let crewQuery = db.select()
      .from(schema.movieCrew)
      .where(eq(schema.movieCrew.movieId, movie.id));

    if (crewLimit) {
      crewQuery = crewQuery.limit(crewLimit) as any;
    }

    const crewData = await crewQuery;

    const crew = await Promise.all(crewData.map(async (crewMember: any) => {
      const person = await db.select().from(schema.people).where(eq(schema.people.id, crewMember.personId)).limit(1);
      const personTranslations = await db.select().from(schema.peopleTranslations).where(eq(schema.peopleTranslations.personId, crewMember.personId));
      const jobTranslations = await db.select().from(schema.movieCrewTranslations)
        .where(sql`${schema.movieCrewTranslations.movieId} = ${movie.id} AND ${schema.movieCrewTranslations.personId} = ${crewMember.personId}`);

      if (person[0]) {
        const personName: any = {};
        const job: any = {};

        for (const trans of personTranslations) {
          personName[trans.language] = trans.name;
        }
        for (const trans of jobTranslations) {
          job[trans.language] = trans.job;
        }

        return {
          person: {
            id: person[0].id,
            name: Object.keys(personName).length > 0 ? personName : { en: 'Unknown' },
            profile_path: person[0].profilePath,
          },
          job: Object.keys(job).length > 0 ? job : { en: crewMember.department },
          department: crewMember.department,
        };
      }
      return null;
    }));

    movieData.crew = crew.filter((c: any) => c !== null);
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

  return movieData;
}
