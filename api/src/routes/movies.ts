// Movie routes

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

// Validation schemas
const LocalizedTextSchema = z.object({
  en: z.string(),
  lo: z.string().optional(),
});

const GenreSchema = z.object({
  id: z.number(),
  name: LocalizedTextSchema,
});

const ProductionCompanySchema = z.object({
  id: z.number(),
  name: z.string(),
  logo_path: z.string().optional(),
  origin_country: z.string(),
});

const ProductionCountrySchema = z.object({
  iso_3166_1: z.string(),
  name: z.string(),
});

const SpokenLanguageSchema = z.object({
  iso_639_1: z.string(),
  english_name: z.string(),
  name: z.string(),
});

const CollectionSchema = z.object({
  id: z.number(),
  name: LocalizedTextSchema,
  poster_path: z.string().optional(),
  backdrop_path: z.string().optional(),
});

const VideoSourceSchema = z.object({
  id: z.string(),
  quality: z.enum(['original', '1080p', '720p', '480p', '360p']),
  format: z.enum(['hls', 'mp4']),
  url: z.string(),
  size_bytes: z.number().optional(),
});

const CastMemberSchema = z.object({
  id: z.number(),
  name: LocalizedTextSchema,
  character: LocalizedTextSchema,
  profile_path: z.string().optional(),
  order: z.number(),
});

const CrewMemberSchema = z.object({
  id: z.number(),
  name: LocalizedTextSchema,
  job: LocalizedTextSchema,
  department: z.string(),
  profile_path: z.string().optional(),
});

const CreateMovieSchema = z.object({
  // TMDB fields
  tmdb_id: z.number().optional(),
  imdb_id: z.string().optional(),
  tmdb_last_synced: z.string().optional(),
  tmdb_sync_enabled: z.boolean().optional(),
  
  // Basic info
  original_title: z.string().optional(),
  original_language: z.string().optional(),
  poster_path: z.string().optional(),
  backdrop_path: z.string().optional(),
  release_date: z.string(),
  runtime: z.number().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
  popularity: z.number().optional(),
  adult: z.boolean(),
  video: z.boolean().optional(),
  
  // Production
  budget: z.number().optional(),
  revenue: z.number().optional(),
  status: z.string().optional(),
  homepage: z.string().optional(),
  
  // Localized content
  title: LocalizedTextSchema,
  overview: LocalizedTextSchema,
  tagline: LocalizedTextSchema.optional(),
  
  // Relationships
  genres: z.array(GenreSchema),
  production_companies: z.array(ProductionCompanySchema).optional(),
  production_countries: z.array(ProductionCountrySchema).optional(),
  spoken_languages: z.array(SpokenLanguageSchema).optional(),
  belongs_to_collection: CollectionSchema.nullable().optional(),
  
  // Video sources
  video_sources: z.array(VideoSourceSchema),
  
  // Cast and crew
  cast: z.array(CastMemberSchema).optional(),
  crew: z.array(CrewMemberSchema).optional(),
});

export default async function movieRoutes(fastify: FastifyInstance) {
  // Get all movies
  fastify.get('/movies', async (request, reply) => {
    try {
      const allMovies = await db.select().from(schema.movies);
      return { movies: allMovies };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch movies' });
    }
  });

  // Get movie by ID
  fastify.get<{ Params: { id: string } }>('/movies/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const movie = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, id))
        .limit(1);

      if (movie.length === 0) {
        return reply.status(404).send({ error: 'Movie not found' });
      }

      return movie[0];
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch movie' });
    }
  });

  // Create movie (import from TMDB or manual)
  fastify.post<{ Body: z.infer<typeof CreateMovieSchema> }>(
    '/movies',
    async (request, reply) => {
      try {
        const movieData = request.body;

        // Convert tmdb_last_synced string to Date if present
        const dataToInsert = {
          ...movieData,
          tmdb_last_synced: movieData.tmdb_last_synced ? new Date(movieData.tmdb_last_synced) : undefined,
          cast: movieData.cast || [],
          crew: movieData.crew || [],
          production_companies: movieData.production_companies || [],
          production_countries: movieData.production_countries || [],
          spoken_languages: movieData.spoken_languages || [],
        };

        // Insert movie
        const [newMovie] = await db.insert(schema.movies).values(dataToInsert).returning();

        return reply.status(201).send(newMovie);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to create movie' });
      }
    }
  );

  // Update movie
  fastify.put<{ Params: { id: string }; Body: Partial<z.infer<typeof CreateMovieSchema>> }>(
    '/movies/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updates = request.body;

        // Convert tmdb_last_synced string to Date if present
        const dataToUpdate = {
          ...updates,
          tmdb_last_synced: updates.tmdb_last_synced ? new Date(updates.tmdb_last_synced) : undefined,
          updated_at: new Date(),
        };

        const [updatedMovie] = await db.update(schema.movies)
          .set(dataToUpdate)
          .where(eq(schema.movies.id, id))
          .returning();

        if (!updatedMovie) {
          return reply.status(404).send({ error: 'Movie not found' });
        }

        return updatedMovie;
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to update movie' });
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
}
