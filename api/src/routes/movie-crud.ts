// Movie CRUD routes: GET all, GET by ID, POST create, DELETE
// Split from movies.ts for better maintainability

import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { buildMovieWithRelations } from '../lib/movie-builder.js';
import { 
  CreateMovieSchema, 
  type CreateMovieInput,
  type Genre,
  type CastMember,
  type CrewMember,
} from '../lib/movie-schemas.js';
import {
  insertMovieTranslations,
  insertGenreTranslations,
  insertMovieImages,
  insertCastMembers,
  insertCrewMembers,
  mapMovieToInsertData,
} from '../lib/movie-helpers.js';

export default async function movieCrudRoutes(fastify: FastifyInstance) {
  // Get all movies
  fastify.get('/movies', async (request, reply) => {
    try {
      const allMovies = await db.select().from(schema.movies);
      
      // Build complete movie objects using shared builder
      const moviesWithData = await Promise.all(
        allMovies.map(movie => buildMovieWithRelations(movie, db, schema, {
          includeCast: true,
          includeCrew: true,
          includeGenres: false, // Not needed for list view
          castLimit: 3, // Limit for performance
        }))
      );
      
      return { movies: moviesWithData };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch movies' });
    }
  });

  // Get movie by ID or slug
  fastify.get<{ Params: { id: string } }>('/movies/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Check if id is a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      // Get movie by ID or slug
      const [movie] = await db.select()
        .from(schema.movies)
        .where(isUUID ? eq(schema.movies.id, id) : eq(schema.movies.slug, id))
        .limit(1);

      if (!movie) {
        return reply.status(404).send({ error: 'Movie not found' });
      }

      // Build complete movie object using shared builder
      const movieData = await buildMovieWithRelations(movie, db, schema, {
        includeCast: true,
        includeCrew: true,
        includeGenres: true,
        includeImages: true, // Include images for detail view
        castLimit: undefined, // No limit for single movie view (edit page needs all cast)
        crewLimit: undefined, // No limit for crew either
      });

      return movieData;
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch movie' });
    }
  });

  // Create movie (import from TMDB or manual)
  fastify.post<{ Body: CreateMovieInput }>(
    '/movies',
    async (request, reply) => {
      try {
        const movieData = request.body;
        fastify.log.info({ movieData }, 'Received movie data');

        // Extract fields that go into separate tables
        const { cast, crew, title, overview, tagline, genres, images, ...movieFields } = movieData;
        
        // Map and insert movie
        const dataToInsert = mapMovieToInsertData(movieFields, images);
        const [newMovie] = await db.insert(schema.movies).values(dataToInsert as any).returning();
        
        // Insert translations
        await insertMovieTranslations(db, schema, newMovie.id, title, overview, tagline);

        // Insert genres
        if (genres && genres.length > 0) {
          await insertGenres(genres, newMovie.id);
        }

        // Insert cast members
        if (cast && cast.length > 0) {
          await insertCastMembers(db, schema, cast, newMovie.id);
        }

        // Insert crew members
        if (crew && crew.length > 0) {
          await insertCrewMembers(db, schema, crew, newMovie.id);
        }

        // Insert images
        if (images && images.length > 0) {
          await insertMovieImages(db, schema, newMovie.id, images);
        }

        // Insert external platforms
        if (movieData.external_platforms && movieData.external_platforms.length > 0) {
          const platformValues = movieData.external_platforms.map((ep) => ({
            movieId: newMovie.id,
            platform: ep.platform,
            url: ep.url || null,
          }));
          
          await db.insert(schema.movieExternalPlatforms).values(platformValues);
        }

        // Insert trailers (from TMDB import)
        if (movieData.trailers && movieData.trailers.length > 0) {
          const trailerValues = movieData.trailers.map((trailer: any, index: number) => ({
            movieId: newMovie.id,
            type: 'youtube' as const,
            youtubeKey: trailer.key,
            name: trailer.name || 'Trailer',
            official: trailer.official || false,
            language: trailer.iso_639_1 || null,
            publishedAt: trailer.published_at || null,
            order: index,
          }));
          
          await db.insert(schema.trailers).values(trailerValues);
        }

        // Insert production companies (from TMDB import)
        if (movieData.production_companies && movieData.production_companies.length > 0) {
          await insertProductionCompanies(movieData.production_companies, newMovie.id);
        }

        // Fetch the complete movie with translations to return
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/movies/${newMovie.id}`,
        });
        
        return reply.status(201).send(JSON.parse(response.body));
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to create movie' });
      }
    }
  );

  // Delete movie
  fastify.delete<{ Params: { id: string } }>('/movies/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const [deletedMovie] = await db.delete(schema.movies)
        .where(eq(schema.movies.id, id))
        .returning();

      if (!deletedMovie) {
        return reply.status(404).send({ error: 'Movie not found' });
      }

      return { message: 'Movie deleted successfully', id };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to delete movie' });
    }
  });

  // ==========================================================================
  // HELPER FUNCTIONS (private to this module)
  // ==========================================================================

  async function insertGenres(genres: Genre[], movieId: string) {
    for (const genre of genres) {
      // Check if genre exists
      const existingGenre = await db.select()
        .from(schema.genres)
        .where(eq(schema.genres.id, genre.id))
        .limit(1);

      // Insert genre if doesn't exist
      if (existingGenre.length === 0) {
        await db.insert(schema.genres).values({ id: genre.id });
        await insertGenreTranslations(db, schema, genre.id, genre.name);
      }

      // Insert movie-genre relationship
      await db.insert(schema.movieGenres).values({
        movieId,
        genreId: genre.id,
      });
    }
  }

  async function insertProductionCompanies(companies: any[], movieId: string) {
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      
      // Check if production company exists
      const existingCompany = await db.select()
        .from(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, company.id))
        .limit(1);

      // Insert company if doesn't exist
      if (existingCompany.length === 0) {
        await db.insert(schema.productionCompanies).values({
          id: company.id,
          logoPath: company.logo_path || null,
          originCountry: company.origin_country || null,
        });
        
        // Insert English translation
        await db.insert(schema.productionCompanyTranslations).values({
          companyId: company.id,
          language: 'en',
          name: company.name,
        });
      }

      // Insert movie-production company relationship
      await db.insert(schema.movieProductionCompanies).values({
        movieId,
        companyId: company.id,
        order: i,
      }).onConflictDoNothing();
    }
  }
}
