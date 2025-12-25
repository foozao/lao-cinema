// Genre management routes
import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { optionalAuth, requireAdmin } from '../lib/auth-middleware.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../lib/response-helpers.js';

export default async function genreRoutes(fastify: FastifyInstance) {
  
  // POST /genres - Create a new custom genre (admin only)
  fastify.post('/genres', { preHandler: [optionalAuth, requireAdmin] }, async (request, reply) => {
    const { nameEn, nameLo, isVisible = true } = request.body as { 
      nameEn: string; 
      nameLo?: string; 
      isVisible?: boolean;
    };
    
    if (!nameEn || nameEn.trim() === '') {
      return sendBadRequest(reply, 'English name is required');
    }
    
    try {
      // Find the next available negative ID for custom genres
      const existingGenres = await db.select()
        .from(schema.genres)
        .orderBy(schema.genres.id);
      
      // Use negative IDs for custom genres to distinguish from TMDB imports
      const negativeIds = existingGenres
        .map(g => g.id)
        .filter(id => id < 0);
      const nextId = negativeIds.length > 0 ? Math.min(...negativeIds) - 1 : -1;
      
      // Insert genre
      await db.insert(schema.genres).values({
        id: nextId,
        isVisible,
      });
      
      // Insert translations
      const translations: Array<{ genreId: number; language: 'en' | 'lo'; name: string }> = [
        { genreId: nextId, language: 'en' as const, name: nameEn.trim() },
      ];
      
      if (nameLo && nameLo.trim() !== '') {
        translations.push({ genreId: nextId, language: 'lo' as const, name: nameLo.trim() });
      }
      
      await db.insert(schema.genreTranslations).values(translations);
      
      // Fetch the created genre with translations
      const [genre] = await db.select()
        .from(schema.genres)
        .where(eq(schema.genres.id, nextId))
        .limit(1);
      
      const genreTranslations = await db.select()
        .from(schema.genreTranslations)
        .where(eq(schema.genreTranslations.genreId, nextId));
      
      const name: any = {};
      for (const trans of genreTranslations) {
        name[trans.language] = trans.name;
      }
      
      return {
        genre: {
          id: genre.id,
          name,
          isVisible: genre.isVisible,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create genre');
    }
  });
  
  // GET /genres - List all genres with visibility status (admin only)
  fastify.get('/genres', { preHandler: [optionalAuth, requireAdmin] }, async (request, reply) => {
    try {
      const genres = await db.select()
        .from(schema.genres)
        .orderBy(schema.genres.id);
      
      // Handle empty genres
      if (genres.length === 0) {
        return { genres: [] };
      }
      
      // Fetch translations for all genres
      const genreTranslations = await db.select()
        .from(schema.genreTranslations)
        .where(sql`${schema.genreTranslations.genreId} IN (${sql.join(genres.map(g => sql`${g.id}`), sql`, `)})`);
      
      // Fetch movie counts per genre
      const movieGenres = await db.select()
        .from(schema.movieGenres);
      
      const movieCountByGenre: Record<number, number> = {};
      for (const mg of movieGenres) {
        movieCountByGenre[mg.genreId] = (movieCountByGenre[mg.genreId] || 0) + 1;
      }
      
      // Build genre objects with translations and movie count
      const genresWithTranslations = genres.map(genre => {
        const translations = genreTranslations.filter(t => t.genreId === genre.id);
        const name: any = {};
        for (const trans of translations) {
          name[trans.language] = trans.name;
        }
        
        return {
          id: genre.id,
          name,
          isVisible: genre.isVisible,
          movieCount: movieCountByGenre[genre.id] || 0,
        };
      });
      
      return { genres: genresWithTranslations };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch genres');
    }
  });
  
  // PATCH /genres/:id/visibility - Toggle genre visibility
  fastify.patch('/genres/:id/visibility', { preHandler: [optionalAuth, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isVisible } = request.body as { isVisible: boolean };
    
    if (typeof isVisible !== 'boolean') {
      return sendBadRequest(reply, 'isVisible must be a boolean');
    }
    
    try {
      const genreId = parseInt(id, 10);
      
      if (isNaN(genreId)) {
        return sendBadRequest(reply, 'Invalid genre ID');
      }
      
      // Check if genre exists
      const existingGenre = await db.select()
        .from(schema.genres)
        .where(eq(schema.genres.id, genreId))
        .limit(1);
      
      if (existingGenre.length === 0) {
        return sendNotFound(reply, 'Genre not found');
      }
      
      // Update visibility
      await db.update(schema.genres)
        .set({ isVisible })
        .where(eq(schema.genres.id, genreId));
      
      // Fetch updated genre with translations
      const [genre] = await db.select()
        .from(schema.genres)
        .where(eq(schema.genres.id, genreId))
        .limit(1);
      
      const translations = await db.select()
        .from(schema.genreTranslations)
        .where(eq(schema.genreTranslations.genreId, genreId));
      
      const name: any = {};
      for (const trans of translations) {
        name[trans.language] = trans.name;
      }
      
      return {
        genre: {
          id: genre.id,
          name,
          isVisible: genre.isVisible,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update genre visibility');
    }
  });
}
