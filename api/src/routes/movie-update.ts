// Movie update route: PUT /movies/:id
// Split from movies.ts for better maintainability

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest, createChangesObject } from '../lib/audit-service.js';
import { 
  type UpdateMovieInput,
  type CastMember,
  type CrewMember,
  type MovieImage,
} from '../lib/movie-schemas.js';
import {
  insertMovieImages,
  mapMovieToUpdateData,
  findPrimaryImage,
  insertCastMembers,
  insertCrewMembers,
} from '../lib/movie-helpers.js';

type Language = 'en' | 'lo';

export default async function movieUpdateRoutes(fastify: FastifyInstance) {
  // Update movie
  fastify.put<{ Params: { id: string }; Body: UpdateMovieInput }>(
    '/movies/:id',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updates = request.body;

        // Check if movie exists first
        const existing = await db.select()
          .from(schema.movies)
          .where(eq(schema.movies.id, id))
          .limit(1);

        if (existing.length === 0) {
          return sendNotFound(reply, 'Movie not found');
        }

        // Fetch current translations for change tracking
        const existingTranslations = await db.select()
          .from(schema.movieTranslations)
          .where(eq(schema.movieTranslations.movieId, id));
        
        // Fetch existing nested entities for change tracking
        const existingSubtitles = await db.select()
          .from(schema.subtitleTracks)
          .where(eq(schema.subtitleTracks.movieId, id));
        const existingVideoSources = await db.select()
          .from(schema.videoSources)
          .where(eq(schema.videoSources.movieId, id));
        const existingPlatforms = await db.select()
          .from(schema.movieExternalPlatforms)
          .where(eq(schema.movieExternalPlatforms.movieId, id));
        
        // Build "before" state for change tracking
        const beforeState: Record<string, any> = {
          release_date: existing[0].releaseDate,
          runtime: existing[0].runtime,
          original_language: existing[0].originalLanguage,
          adult: existing[0].adult,
          slug: existing[0].slug,
          title_en: existingTranslations.find(t => t.language === 'en')?.title || null,
          title_lo: existingTranslations.find(t => t.language === 'lo')?.title || null,
          overview_en: existingTranslations.find(t => t.language === 'en')?.overview || null,
          overview_lo: existingTranslations.find(t => t.language === 'lo')?.overview || null,
          tagline_en: existingTranslations.find(t => t.language === 'en')?.tagline || null,
          tagline_lo: existingTranslations.find(t => t.language === 'lo')?.tagline || null,
          subtitle_count: existingSubtitles.length,
          video_source_count: existingVideoSources.length,
          platform_count: existingPlatforms.length,
        };
        
        // Add translation fields to before state
        for (const trans of existingTranslations) {
          if (trans.language === 'en') {
            beforeState.title_en = trans.title;
            beforeState.overview_en = trans.overview;
            beforeState.tagline_en = trans.tagline;
          } else if (trans.language === 'lo') {
            beforeState.title_lo = trans.title;
            beforeState.overview_lo = trans.overview;
            beforeState.tagline_lo = trans.tagline;
          }
        }

        // Extract fields that should be updated in movies table
        const { title, overview, tagline, cast, crew, genres, images, video_sources, external_platforms, trailers, production_companies, ...movieUpdates } = updates;
        
        // Update basic movie fields if provided
        const movieFieldsToUpdate = mapMovieToUpdateData(movieUpdates);

        if (Object.keys(movieFieldsToUpdate).length > 0) {
          await db.update(schema.movies)
            .set(movieFieldsToUpdate)
            .where(eq(schema.movies.id, id));
        }

        // Update translations if provided
        if (title || overview || tagline) {
          await updateMovieTranslations(id, title, overview, tagline);
        }

        // Update cast character translations if provided
        if (cast && Array.isArray(cast)) {
          await updateCastTranslations(id, cast);
        }

        // Update crew job translations if provided
        if (crew && Array.isArray(crew)) {
          await updateCrewTranslations(id, crew);
        }

        // Update video sources if provided
        if (video_sources && Array.isArray(video_sources)) {
          await updateVideoSources(id, video_sources);
        }

        // Update images if provided
        if (images && Array.isArray(images)) {
          await updateImages(id, images);
        }

        // Update external platforms if provided
        if (external_platforms !== undefined) {
          await updateExternalPlatforms(id, external_platforms);
        }

        // Update trailers if provided
        if (trailers !== undefined) {
          await updateTrailers(id, trailers);
        }

        // Update production companies if provided
        if (production_companies !== undefined) {
          await updateProductionCompanies(id, production_companies);
        }

        // Fetch updated nested entities for change tracking
        const updatedSubtitles = await db.select()
          .from(schema.subtitleTracks)
          .where(eq(schema.subtitleTracks.movieId, id));
        const updatedVideoSources = await db.select()
          .from(schema.videoSources)
          .where(eq(schema.videoSources.movieId, id));
        const updatedPlatforms = await db.select()
          .from(schema.movieExternalPlatforms)
          .where(eq(schema.movieExternalPlatforms.movieId, id));
        
        // Fetch and return the complete updated movie
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/movies/${id}`,
        });
        
        const updatedMovie = JSON.parse(response.body);
        
        // Build "after" state for change tracking
        const afterState: Record<string, any> = {
          release_date: updates.release_date ?? beforeState.release_date,
          runtime: updates.runtime ?? beforeState.runtime,
          original_language: updates.original_language ?? beforeState.original_language,
          adult: updates.adult ?? beforeState.adult,
          slug: updates.slug ?? beforeState.slug,
          title_en: title?.en ?? beforeState.title_en,
          title_lo: title?.lo ?? beforeState.title_lo,
          overview_en: overview?.en ?? beforeState.overview_en,
          overview_lo: overview?.lo ?? beforeState.overview_lo,
          tagline_en: tagline?.en ?? beforeState.tagline_en,
          tagline_lo: tagline?.lo ?? beforeState.tagline_lo,
          subtitle_count: updatedSubtitles.length,
          video_source_count: updatedVideoSources.length,
          platform_count: updatedPlatforms.length,
        };
        
        // Create changes object (only includes changed fields)
        const changes = createChangesObject(beforeState, afterState);
        
        // Add details about subtitle changes
        if (updatedSubtitles.length !== existingSubtitles.length) {
          const addedSubtitles = updatedSubtitles.filter(
            s => !existingSubtitles.some(es => es.id === s.id)
          );
          const removedSubtitles = existingSubtitles.filter(
            s => !updatedSubtitles.some(us => us.id === s.id)
          );
          
          if (addedSubtitles.length > 0) {
            changes.subtitles_added = {
              before: null,
              after: addedSubtitles.map(s => `${s.label} (${s.language})`).join(', ')
            };
          }
          if (removedSubtitles.length > 0) {
            changes.subtitles_removed = {
              before: removedSubtitles.map(s => `${s.label} (${s.language})`).join(', '),
              after: null
            };
          }
        }
        
        // Add details about video source changes
        if (updatedVideoSources.length !== existingVideoSources.length) {
          const addedSources = updatedVideoSources.filter(
            s => !existingVideoSources.some(es => es.id === s.id)
          );
          const removedSources = existingVideoSources.filter(
            s => !updatedVideoSources.some(us => us.id === s.id)
          );
          
          if (addedSources.length > 0) {
            changes.video_sources_added = {
              before: null,
              after: addedSources.map(s => `${s.quality} (${s.format})`).join(', ')
            };
          }
          if (removedSources.length > 0) {
            changes.video_sources_removed = {
              before: removedSources.map(s => `${s.quality} (${s.format})`).join(', '),
              after: null
            };
          }
        }
        
        // Add details about platform changes
        if (updatedPlatforms.length !== existingPlatforms.length) {
          const addedPlatforms = updatedPlatforms.filter(
            p => !existingPlatforms.some(ep => ep.id === p.id)
          );
          const removedPlatforms = existingPlatforms.filter(
            p => !updatedPlatforms.some(up => up.id === p.id)
          );
          
          if (addedPlatforms.length > 0) {
            changes.platforms_added = {
              before: null,
              after: addedPlatforms.map(p => p.platform).join(', ')
            };
          }
          if (removedPlatforms.length > 0) {
            changes.platforms_removed = {
              before: removedPlatforms.map(p => p.platform).join(', '),
              after: null
            };
          }
        }
        
        // Log audit event with changes
        await logAuditFromRequest(
          request, 
          'update', 
          'movie', 
          id, 
          updatedMovie.title?.en || existing[0].originalTitle,
          Object.keys(changes).length > 0 ? changes : undefined
        );
        
        return reply.status(200).send(updatedMovie);
      } catch (error) {
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to update movie');
      }
    }
  );

  // ==========================================================================
  // HELPER FUNCTIONS (private to this module)
  // ==========================================================================

  async function updateMovieTranslations(
    movieId: string,
    title?: { en?: string; lo?: string },
    overview?: { en?: string; lo?: string },
    tagline?: { en?: string; lo?: string }
  ) {
    for (const lang of ['en', 'lo'] as const) {
      if (title?.[lang] || overview?.[lang] || tagline?.[lang]) {
        const existingTrans = await db.select()
          .from(schema.movieTranslations)
          .where(sql`${schema.movieTranslations.movieId} = ${movieId} AND ${schema.movieTranslations.language} = ${lang}`)
          .limit(1);

        const transData: Record<string, any> = {};
        if (title?.[lang]) transData.title = title[lang]!;
        if (overview?.[lang]) transData.overview = overview[lang]!;
        if (tagline?.[lang]) transData.tagline = tagline[lang]!;

        if (existingTrans.length > 0) {
          // Always update timestamp when updating translations
          transData.updatedAt = new Date();
          await db.update(schema.movieTranslations)
            .set(transData)
            .where(sql`${schema.movieTranslations.movieId} = ${movieId} AND ${schema.movieTranslations.language} = ${lang}`);
        } else if (title?.[lang]) {
          await db.insert(schema.movieTranslations).values({
            movieId,
            language: lang,
            title: title[lang]!,
            overview: overview?.[lang] || '',
            tagline: tagline?.[lang],
          });
        }
      }
    }
  }

  async function updateCastTranslations(movieId: string, cast: CastMember[]) {
    // First, delete all existing cast for this movie
    await db.delete(schema.movieCast)
      .where(eq(schema.movieCast.movieId, movieId));
    await db.delete(schema.movieCastTranslations)
      .where(eq(schema.movieCastTranslations.movieId, movieId));
    
    // Then insert all cast members fresh using shared helper
    await insertCastMembers(db, schema, cast, movieId);
  }

  async function updateCrewTranslations(movieId: string, crew: CrewMember[]) {
    // First, delete all existing crew for this movie
    await db.delete(schema.movieCrew)
      .where(eq(schema.movieCrew.movieId, movieId));
    await db.delete(schema.movieCrewTranslations)
      .where(eq(schema.movieCrewTranslations.movieId, movieId));
    
    // Then insert all crew members fresh using shared helper
    await insertCrewMembers(db, schema, crew, movieId);
  }

  async function updateVideoSources(movieId: string, videoSources: any[]) {
    for (const vs of videoSources) {
      // Check if video source exists for this movie
      const existingVS = await db.select()
        .from(schema.videoSources)
        .where(eq(schema.videoSources.movieId, movieId))
        .limit(1);

      const vsData: Record<string, any> = {};
      if (vs.quality !== undefined) vsData.quality = vs.quality;
      if (vs.format !== undefined) vsData.format = vs.format;
      if (vs.width !== undefined) vsData.width = vs.width;
      if (vs.height !== undefined) vsData.height = vs.height;
      if (vs.aspect_ratio !== undefined) vsData.aspectRatio = vs.aspect_ratio;
      if (vs.has_burned_subtitles !== undefined) vsData.hasBurnedSubtitles = vs.has_burned_subtitles;
      if (vs.burned_subtitles_language !== undefined) vsData.burnedSubtitlesLanguage = vs.burned_subtitles_language;

      if (existingVS.length > 0) {
        // Update existing video source
        await db.update(schema.videoSources)
          .set(vsData)
          .where(eq(schema.videoSources.movieId, movieId));
      } else {
        // Create new video source if it doesn't exist
        await db.insert(schema.videoSources).values({
          movieId,
          quality: vs.quality || 'original',
          format: vs.format || 'mp4',
          url: vs.url || '',
          width: vs.width || null,
          height: vs.height || null,
          aspectRatio: vs.aspect_ratio || null,
          hasBurnedSubtitles: vs.has_burned_subtitles || false,
          burnedSubtitlesLanguage: vs.burned_subtitles_language || null,
        });
      }
    }
  }

  async function updateImages(movieId: string, images: MovieImage[]) {
    // Delete existing images for this movie
    await db.delete(schema.movieImages)
      .where(eq(schema.movieImages.movieId, movieId));

    // Insert new images
    if (images.length > 0) {
      await insertMovieImages(db, schema, movieId, images);

      // Update poster_path and backdrop_path to match primary images
      const primaryPoster = findPrimaryImage(images, 'poster');
      const primaryBackdrop = findPrimaryImage(images, 'backdrop');
      
      const pathUpdates: Record<string, string> = {};
      if (primaryPoster) pathUpdates.posterPath = primaryPoster.file_path;
      if (primaryBackdrop) pathUpdates.backdropPath = primaryBackdrop.file_path;
      
      if (Object.keys(pathUpdates).length > 0) {
        await db.update(schema.movies)
          .set(pathUpdates)
          .where(eq(schema.movies.id, movieId));
      }
    }
  }

  async function updateExternalPlatforms(movieId: string, externalPlatforms: any[]) {
    // Delete existing external platforms for this movie
    await db.delete(schema.movieExternalPlatforms)
      .where(eq(schema.movieExternalPlatforms.movieId, movieId));

    // Insert new external platforms
    if (externalPlatforms.length > 0) {
      const platformValues = externalPlatforms.map((ep) => ({
        movieId,
        platform: ep.platform,
        url: ep.url || null,
      }));
      
      await db.insert(schema.movieExternalPlatforms).values(platformValues);
    }
  }

  async function updateTrailers(movieId: string, trailers: any[]) {
    // Delete existing trailers for this movie
    await db.delete(schema.trailers)
      .where(eq(schema.trailers.movieId, movieId));

    // Insert new trailers
    if (trailers.length > 0) {
      const trailerValues = trailers.map((trailer: any, index: number) => {
        // Handle both TMDB format (site: 'YouTube') and new format (type: 'youtube')
        const isYouTube = trailer.type === 'youtube' || trailer.site === 'YouTube' || (trailer.key && !trailer.video_url);
        const isVideo = trailer.type === 'video' || trailer.video_url;
        
        return {
          movieId,
          type: (isVideo ? 'video' : 'youtube') as 'youtube' | 'video',
          // YouTube fields
          youtubeKey: isYouTube ? trailer.key : null,
          // Video fields (self-hosted)
          videoUrl: isVideo ? trailer.video_url : null,
          videoFormat: isVideo ? (trailer.video_format || 'mp4') : null,
          videoQuality: isVideo ? (trailer.video_quality || 'original') : null,
          sizeBytes: isVideo ? trailer.size_bytes : null,
          width: isVideo ? trailer.width : null,
          height: isVideo ? trailer.height : null,
          durationSeconds: isVideo ? trailer.duration_seconds : null,
          // Common fields
          name: trailer.name || 'Trailer',
          official: trailer.official || false,
          language: trailer.language || trailer.iso_639_1 || null,
          publishedAt: trailer.published_at || null,
          order: index,
        };
      });
      
      await db.insert(schema.trailers).values(trailerValues);
    }
  }

  async function updateProductionCompanies(movieId: string, productionCompanies: any[]) {
    // Delete existing production company associations for this movie
    await db.delete(schema.movieProductionCompanies)
      .where(eq(schema.movieProductionCompanies.movieId, movieId));

    // Insert new production companies
    if (productionCompanies && productionCompanies.length > 0) {
      for (let i = 0; i < productionCompanies.length; i++) {
        const company = productionCompanies[i];
        
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
          const companyName = typeof company.name === 'string' ? company.name : (company.name?.en || 'Unknown');
          await db.insert(schema.productionCompanyTranslations).values({
            companyId: company.id,
            language: 'en',
            name: companyName,
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
}
