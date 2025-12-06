// Movie update route: PUT /movies/:id
// Split from movies.ts for better maintainability

import { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
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
} from '../lib/movie-helpers.js';

type Language = 'en' | 'lo';

export default async function movieUpdateRoutes(fastify: FastifyInstance) {
  // Update movie
  fastify.put<{ Params: { id: string }; Body: UpdateMovieInput }>(
    '/movies/:id',
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
          return reply.status(404).send({ error: 'Movie not found' });
        }

        // Extract fields that should be updated in movies table
        const { title, overview, tagline, cast, crew, genres, images, video_sources, external_platforms, ...movieUpdates } = updates;
        
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

        // Fetch and return the complete updated movie
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/movies/${id}`,
        });
        
        return reply.status(200).send(JSON.parse(response.body));
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to update movie' });
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

        const transData: Record<string, string> = {};
        if (title?.[lang]) transData.title = title[lang]!;
        if (overview?.[lang]) transData.overview = overview[lang]!;
        if (tagline?.[lang]) transData.tagline = tagline[lang]!;

        if (existingTrans.length > 0) {
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
    for (const member of cast) {
      const personId = member.person.id;
      const characterName = member.character;
      
      if (characterName) {
        await upsertTranslation(
          movieId,
          personId,
          characterName,
          schema.movieCastTranslations,
          'character'
        );
      }
    }
  }

  async function updateCrewTranslations(movieId: string, crew: CrewMember[]) {
    for (const member of crew) {
      const personId = member.person.id;
      const jobTitle = member.job;
      const department = member.department;
      
      if (jobTitle && department) {
        await upsertCrewTranslation(movieId, personId, department, jobTitle);
      }
    }
  }

  async function upsertTranslation(
    movieId: string,
    personId: number,
    localizedText: { en?: string; lo?: string },
    table: any,
    fieldName: 'character'
  ) {
    for (const lang of ['en', 'lo'] as const) {
      if (localizedText[lang]) {
        const existing = await db.select()
          .from(table)
          .where(sql`${table.movieId} = ${movieId} AND ${table.personId} = ${personId} AND ${table.language} = ${lang}`)
          .limit(1);

        if (existing.length > 0) {
          await db.update(table)
            .set({ [fieldName]: localizedText[lang] })
            .where(sql`${table.movieId} = ${movieId} AND ${table.personId} = ${personId} AND ${table.language} = ${lang}`);
        } else {
          await db.insert(table).values({
            movieId,
            personId,
            language: lang,
            [fieldName]: localizedText[lang],
          });
        }
      }
    }
  }

  async function upsertCrewTranslation(
    movieId: string,
    personId: number,
    department: string,
    jobTitle: { en?: string; lo?: string }
  ) {
    for (const lang of ['en', 'lo'] as const) {
      if (jobTitle[lang]) {
        const existing = await db.select()
          .from(schema.movieCrewTranslations)
          .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${personId} AND ${schema.movieCrewTranslations.department} = ${department} AND ${schema.movieCrewTranslations.language} = ${lang}`)
          .limit(1);

        if (existing.length > 0) {
          await db.update(schema.movieCrewTranslations)
            .set({ job: jobTitle[lang] })
            .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${personId} AND ${schema.movieCrewTranslations.department} = ${department} AND ${schema.movieCrewTranslations.language} = ${lang}`);
        } else {
          await db.insert(schema.movieCrewTranslations).values({
            movieId,
            personId,
            department,
            language: lang,
            job: jobTitle[lang]!,
          });
        }
      }
    }
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

      if (existingVS.length > 0) {
        // Update existing video source
        await db.update(schema.videoSources)
          .set(vsData)
          .where(eq(schema.videoSources.movieId, movieId));
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
}
