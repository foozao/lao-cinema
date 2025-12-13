// Homepage featured films routes

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, sql, asc } from 'drizzle-orm';
import { buildMovieWithRelations } from '../lib/movie-builder.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

const AddFeaturedSchema = z.object({
  movieId: z.string().uuid(),
  order: z.number().int().min(0),
});

const UpdateOrderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    order: z.number().int().min(0),
  })),
});

export default async function homepageRoutes(fastify: FastifyInstance) {
  // Get featured films for homepage
  fastify.get('/homepage/featured', async (request, reply) => {
    try {
      // Get featured film IDs in order
      const featured = await db.select()
        .from(schema.homepageFeatured)
        .orderBy(asc(schema.homepageFeatured.order));

      if (featured.length === 0) {
        return { movies: [] };
      }

      // Get full movie data for each featured film
      const movieIds = featured.map(f => f.movieId);
      const movies = await db.select()
        .from(schema.movies)
        .where(sql`${schema.movies.id} IN (${sql.join(movieIds.map(id => sql`${id}`), sql`, `)})`);

      // Build complete movie objects using shared builder
      const moviesWithData = await Promise.all(
        movies.map(movie => buildMovieWithRelations(movie, db, schema, {
          includeCast: true,
          includeCrew: true,
          includeGenres: true,
          castLimit: 3, // Limit for performance
        }))
      );

      // Sort by featured order
      const sortedMovies = featured.map(f => {
        return moviesWithData.find(m => m.id === f.movieId);
      }).filter(m => m !== undefined);

      return { movies: sortedMovies };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch featured films' });
    }
  });

  // Get all featured entries (for admin)
  fastify.get('/homepage/featured/admin', async (request, reply) => {
    try {
      const featured = await db.select()
        .from(schema.homepageFeatured)
        .orderBy(asc(schema.homepageFeatured.order));

      // Get movie details for each
      const moviesData = await Promise.all(
        featured.map(async (f) => {
          const [movie] = await db.select()
            .from(schema.movies)
            .where(eq(schema.movies.id, f.movieId))
            .limit(1);

          if (!movie) return null;

          const translations = await db.select()
            .from(schema.movieTranslations)
            .where(eq(schema.movieTranslations.movieId, f.movieId));

          const title: any = {};
          for (const trans of translations) {
            title[trans.language] = trans.title;
          }

          return {
            id: f.id,
            movieId: f.movieId,
            order: f.order,
            movie: {
              id: movie.id,
              title: Object.keys(title).length > 0 ? title : { en: movie.originalTitle || 'Untitled' },
              poster_path: movie.posterPath,
              release_date: movie.releaseDate,
            },
          };
        })
      );

      return { featured: moviesData.filter(m => m !== null) };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch featured films' });
    }
  });

  // Add a film to featured
  fastify.post<{ Body: z.infer<typeof AddFeaturedSchema> }>(
    '/homepage/featured',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { movieId, order } = request.body;

        // Check if movie exists
        const [movie] = await db.select()
          .from(schema.movies)
          .where(eq(schema.movies.id, movieId))
          .limit(1);

        if (!movie) {
          return reply.status(404).send({ error: 'Movie not found' });
        }

        // Check if already featured
        const existing = await db.select()
          .from(schema.homepageFeatured)
          .where(eq(schema.homepageFeatured.movieId, movieId))
          .limit(1);

        if (existing.length > 0) {
          return reply.status(400).send({ error: 'Movie is already featured' });
        }

        // Add to featured
        const [featured] = await db.insert(schema.homepageFeatured)
          .values({
            movieId,
            order,
          })
          .returning();

        // Get movie title for audit log
        const movieTranslations = await db.select()
          .from(schema.movieTranslations)
          .where(eq(schema.movieTranslations.movieId, movieId));
        const movieTitle = movieTranslations.find(t => t.language === 'en')?.title || movie.originalTitle || 'Unknown';

        // Log audit event with details
        await logAuditFromRequest(
          request, 
          'feature_movie', 
          'movie', 
          movieId, 
          movieTitle,
          {
            featured_id: { before: null, after: featured.id },
            movie_id: { before: null, after: movieId },
            movie_title: { before: null, after: movieTitle },
            order: { before: null, after: order },
          }
        );

        return reply.status(201).send(featured);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to add featured film' });
      }
    }
  );

  // Update order of featured films
  fastify.put<{ Body: z.infer<typeof UpdateOrderSchema> }>(
    '/homepage/featured/reorder',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { items } = request.body;

        // Update each item's order
        await Promise.all(
          items.map(item =>
            db.update(schema.homepageFeatured)
              .set({ order: item.order, updatedAt: new Date() })
              .where(eq(schema.homepageFeatured.id, item.id))
          )
        );

        return { success: true };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to update order' });
      }
    }
  );

  // Remove a film from featured
  fastify.delete<{ Params: { id: string } }>(
    '/homepage/featured/:id',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const [deleted] = await db.delete(schema.homepageFeatured)
          .where(eq(schema.homepageFeatured.id, id))
          .returning();

        if (!deleted) {
          return reply.status(404).send({ error: 'Featured film not found' });
        }

        // Get movie title for audit log
        const movieTranslations = await db.select()
          .from(schema.movieTranslations)
          .where(eq(schema.movieTranslations.movieId, deleted.movieId));
        const movieTitle = movieTranslations.find(t => t.language === 'en')?.title || 'Unknown';

        // Log audit event with details
        await logAuditFromRequest(
          request, 
          'unfeature_movie', 
          'movie', 
          deleted.movieId, 
          movieTitle,
          {
            featured_id: { before: deleted.id, after: null },
            movie_id: { before: deleted.movieId, after: null },
            movie_title: { before: movieTitle, after: null },
            order: { before: deleted.order, after: null },
          }
        );

        return { success: true, id: deleted.id };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to remove featured film' });
      }
    }
  );
}
