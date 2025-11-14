import { eq, and } from 'drizzle-orm';
import { db } from './db.js';
import { 
  movies, 
  movieTranslations, 
  genres,
  genreTranslations,
  movieGenres,
  cast,
  castTranslations,
  crew,
  crewTranslations,
  videoSources 
} from './schema.js';

/**
 * Get a movie with translations in a specific language
 * Falls back to English if the requested language is not available
 */
export async function getMovieWithTranslations(movieId: string, language: 'en' | 'lo' = 'en') {
  const result = await db
    .select({
      // Movie data
      id: movies.id,
      originalTitle: movies.originalTitle,
      posterPath: movies.posterPath,
      backdropPath: movies.backdropPath,
      releaseDate: movies.releaseDate,
      runtime: movies.runtime,
      voteAverage: movies.voteAverage,
      voteCount: movies.voteCount,
      popularity: movies.popularity,
      adult: movies.adult,
      // Translation data
      title: movieTranslations.title,
      overview: movieTranslations.overview,
      translationLanguage: movieTranslations.language,
    })
    .from(movies)
    .leftJoin(
      movieTranslations,
      eq(movies.id, movieTranslations.movieId)
    )
    .where(eq(movies.id, movieId));

  if (result.length === 0) return null;

  // Find the requested language or fallback to English
  const translation = result.find(r => r.translationLanguage === language) 
    || result.find(r => r.translationLanguage === 'en')
    || result[0];

  return translation;
}

/**
 * Get all movies with translations in a specific language
 */
export async function getAllMoviesWithTranslations(language: 'en' | 'lo' = 'en') {
  const result = await db
    .select({
      id: movies.id,
      originalTitle: movies.originalTitle,
      posterPath: movies.posterPath,
      releaseDate: movies.releaseDate,
      runtime: movies.runtime,
      voteAverage: movies.voteAverage,
      title: movieTranslations.title,
      overview: movieTranslations.overview,
    })
    .from(movies)
    .leftJoin(
      movieTranslations,
      eq(movies.id, movieTranslations.movieId)
    )
    .where(eq(movieTranslations.language, language));

  return result;
}

/**
 * Get movie with all its data (genres, cast, crew, videos) in a specific language
 */
export async function getMovieComplete(movieId: string, language: 'en' | 'lo' = 'en') {
  // Get movie with translation
  const movie = await getMovieWithTranslations(movieId, language);
  if (!movie) return null;

  // Get genres with translations
  const movieGenresData = await db
    .select({
      id: genres.id,
      name: genreTranslations.name,
    })
    .from(movieGenres)
    .innerJoin(genres, eq(movieGenres.genreId, genres.id))
    .leftJoin(genreTranslations, eq(genres.id, genreTranslations.genreId))
    .where(and(
      eq(movieGenres.movieId, movieId),
      eq(genreTranslations.language, language)
    ));

  // Get cast with translations
  const castData = await db
    .select({
      id: cast.id,
      name: castTranslations.name,
      character: castTranslations.character,
      profilePath: cast.profilePath,
      order: cast.order,
    })
    .from(cast)
    .leftJoin(castTranslations, eq(cast.id, castTranslations.castId))
    .where(and(
      eq(cast.movieId, movieId),
      eq(castTranslations.language, language)
    ))
    .orderBy(cast.order);

  // Get crew with translations
  const crewData = await db
    .select({
      id: crew.id,
      name: crewTranslations.name,
      job: crewTranslations.job,
      department: crew.department,
      profilePath: crew.profilePath,
    })
    .from(crew)
    .leftJoin(crewTranslations, eq(crew.id, crewTranslations.crewId))
    .where(and(
      eq(crew.movieId, movieId),
      eq(crewTranslations.language, language)
    ));

  // Get video sources
  const videos = await db
    .select()
    .from(videoSources)
    .where(eq(videoSources.movieId, movieId));

  return {
    ...movie,
    genres: movieGenresData,
    cast: castData,
    crew: crewData,
    videoSources: videos,
  };
}

/**
 * Insert a new movie with translations
 */
export async function createMovie(data: {
  originalTitle: string;
  releaseDate: string;
  runtime: number;
  posterPath?: string;
  backdropPath?: string;
  voteAverage?: number;
  translations: {
    en: { title: string; overview: string };
    lo?: { title: string; overview: string };
  };
}) {
  // Insert movie
  const [movie] = await db.insert(movies).values({
    originalTitle: data.originalTitle,
    releaseDate: data.releaseDate,
    runtime: data.runtime,
    posterPath: data.posterPath,
    backdropPath: data.backdropPath,
    voteAverage: data.voteAverage || 0,
  }).returning();

  // Insert English translation (required)
  await db.insert(movieTranslations).values({
    movieId: movie.id,
    language: 'en',
    title: data.translations.en.title,
    overview: data.translations.en.overview,
  });

  // Insert Lao translation (optional)
  if (data.translations.lo) {
    await db.insert(movieTranslations).values({
      movieId: movie.id,
      language: 'lo',
      title: data.translations.lo.title,
      overview: data.translations.lo.overview,
    });
  }

  return movie;
}

/**
 * Get all genres with translations
 */
export async function getAllGenres(language: 'en' | 'lo' = 'en') {
  return await db
    .select({
      id: genres.id,
      name: genreTranslations.name,
    })
    .from(genres)
    .leftJoin(genreTranslations, eq(genres.id, genreTranslations.genreId))
    .where(eq(genreTranslations.language, language));
}
