// Movie routes

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import { buildMovieWithRelations } from '../lib/movie-builder.js';

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
  width: z.number().optional(),
  height: z.number().optional(),
  aspect_ratio: z.string().optional(),
});

const PersonSchema = z.object({
  id: z.number(),
  name: LocalizedTextSchema,
  biography: LocalizedTextSchema.optional(),
  profile_path: z.string().optional(),
  birthday: z.string().optional(),
  deathday: z.string().optional(),
  place_of_birth: z.string().optional(),
  known_for_department: z.string().optional(),
  popularity: z.number().optional(),
  gender: z.number().optional(),
  imdb_id: z.string().optional(),
  homepage: z.string().optional(),
});

const CastMemberSchema = z.object({
  person: PersonSchema,
  character: LocalizedTextSchema,
  order: z.number(),
});

const CrewMemberSchema = z.object({
  person: PersonSchema,
  job: LocalizedTextSchema,
  department: z.string(),
});

const MovieImageSchema = z.object({
  id: z.string().optional(), // Optional for new images
  type: z.enum(['poster', 'backdrop', 'logo']),
  file_path: z.string(),
  aspect_ratio: z.number().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  iso_639_1: z.string().nullable().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
  is_primary: z.boolean().optional(),
});

const ExternalPlatformSchema = z.object({
  platform: z.enum(['netflix', 'prime', 'disney', 'hbo', 'apple', 'hulu', 'other']),
  url: z.string().optional(),
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
  
  // Availability
  availability_status: z.enum(['available', 'external', 'unavailable', 'coming_soon']),
  
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
  
  // Images
  images: z.array(MovieImageSchema).optional(),
  
  // External platforms (for films not available on our platform)
  external_platforms: z.array(ExternalPlatformSchema).optional(),
});

export default async function movieRoutes(fastify: FastifyInstance) {
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

  // Get movie by ID
  fastify.get<{ Params: { id: string } }>('/movies/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Get movie
      const [movie] = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, id))
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
      });

      return movieData;
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
        fastify.log.info({ movieData }, 'Received movie data');

        // Extract fields that go into separate tables
        const { cast, crew, title, overview, tagline, genres, images, ...movieFields } = movieData;
        
        // Prepare movie data (only non-localized fields)
        const dataToInsert: any = {
          originalTitle: movieData.original_title || 'Untitled',
          adult: movieData.adult || false,
          availabilityStatus: movieData.availability_status || 'available',
        };
        
        // Only include defined values to avoid PostgreSQL undefined errors
        if (movieData.tmdb_id !== undefined) dataToInsert.tmdbId = movieData.tmdb_id;
        if (movieData.imdb_id !== undefined) dataToInsert.imdbId = movieData.imdb_id;
        if (movieData.original_language !== undefined) dataToInsert.originalLanguage = movieData.original_language;
        
        // Set poster_path and backdrop_path from primary images if available, otherwise from top-level fields
        if (images && images.length > 0) {
          const primaryPoster = images.find(img => img.type === 'poster' && img.is_primary);
          const primaryBackdrop = images.find(img => img.type === 'backdrop' && img.is_primary);
          if (primaryPoster) dataToInsert.posterPath = primaryPoster.file_path;
          if (primaryBackdrop) dataToInsert.backdropPath = primaryBackdrop.file_path;
        } else {
          if (movieData.poster_path !== undefined) dataToInsert.posterPath = movieData.poster_path;
          if (movieData.backdrop_path !== undefined) dataToInsert.backdropPath = movieData.backdrop_path;
        }
        
        if (movieData.release_date !== undefined) dataToInsert.releaseDate = movieData.release_date;
        if (movieData.runtime !== undefined) dataToInsert.runtime = movieData.runtime;
        if (movieData.vote_average !== undefined) dataToInsert.voteAverage = movieData.vote_average;
        if (movieData.vote_count !== undefined) dataToInsert.voteCount = movieData.vote_count;
        if (movieData.popularity !== undefined) dataToInsert.popularity = movieData.popularity;

        // Insert movie
        const [newMovie] = await db.insert(schema.movies).values(dataToInsert).returning();
        
        // Insert translations
        const translations = [];
        if (title?.en) {
          translations.push({
            movieId: newMovie.id,
            language: 'en' as const,
            title: title.en,
            overview: overview?.en || '',
            tagline: tagline?.en || null,
          });
        }
        if (title?.lo) {
          translations.push({
            movieId: newMovie.id,
            language: 'lo' as const,
            title: title.lo,
            overview: overview?.lo || '',
            tagline: tagline?.lo || null,
          });
        }
        
        if (translations.length > 0) {
          await db.insert(schema.movieTranslations).values(translations);
        }

        // Insert genres
        if (genres && genres.length > 0) {
          for (const genre of genres) {
            // Check if genre exists
            const existingGenre = await db.select()
              .from(schema.genres)
              .where(eq(schema.genres.id, genre.id))
              .limit(1);

            // Insert genre if doesn't exist
            if (existingGenre.length === 0) {
              await db.insert(schema.genres).values({
                id: genre.id,
              });

              // Insert genre translations
              const genreTranslations = [];
              if (genre.name.en) {
                genreTranslations.push({
                  genreId: genre.id,
                  language: 'en' as const,
                  name: genre.name.en,
                });
              }
              if (genre.name.lo) {
                genreTranslations.push({
                  genreId: genre.id,
                  language: 'lo' as const,
                  name: genre.name.lo,
                });
              }
              if (genreTranslations.length > 0) {
                await db.insert(schema.genreTranslations).values(genreTranslations);
              }
            }

            // Insert movie-genre relationship
            await db.insert(schema.movieGenres).values({
              movieId: newMovie.id,
              genreId: genre.id,
            });
          }
        }

        // Insert cast members
        if (cast && cast.length > 0) {
          for (const member of cast) {
            // Handle both nested (TMDB) and flat (test) formats
            const personData = 'person' in member ? member.person : member;
            const personId = personData.id;
            const personName = personData.name;
            const characterName = member.character;
            
            // Check if person exists
            const existingPerson = await db.select()
              .from(schema.people)
              .where(eq(schema.people.id, personId))
              .limit(1);

            // Insert person if doesn't exist
            if (existingPerson.length === 0) {
              const personInsertData: any = {
                id: personId,
                knownForDepartment: personData.known_for_department || 'Acting',
              };
              if (personData.profile_path !== undefined) {
                personInsertData.profilePath = personData.profile_path;
              }
              await db.insert(schema.people).values(personInsertData);

              // Insert person translations
              const personTranslations = [];
              if (personName.en) {
                personTranslations.push({
                  personId,
                  language: 'en' as const,
                  name: personName.en,
                });
              }
              if (personName.lo) {
                personTranslations.push({
                  personId,
                  language: 'lo' as const,
                  name: personName.lo,
                });
              }
              if (personTranslations.length > 0) {
                await db.insert(schema.peopleTranslations).values(personTranslations);
              }
            }

            // Insert movie-cast relationship
            await db.insert(schema.movieCast).values({
              movieId: newMovie.id,
              personId,
              order: member.order,
            });

            // Insert character translations
            const characterTranslations = [];
            if (characterName.en) {
              characterTranslations.push({
                movieId: newMovie.id,
                personId,
                language: 'en' as const,
                character: characterName.en,
              });
            }
            if (characterName.lo) {
              characterTranslations.push({
                movieId: newMovie.id,
                personId,
                language: 'lo' as const,
                character: characterName.lo,
              });
            }
            if (characterTranslations.length > 0) {
              await db.insert(schema.movieCastTranslations).values(characterTranslations);
            }
          }
        }

        // Insert crew members
        if (crew && crew.length > 0) {
          for (const member of crew) {
            // Handle both nested (TMDB) and flat (test) formats
            const personData = 'person' in member ? member.person : member;
            const personId = personData.id;
            const personName = personData.name;
            const jobName = member.job;
            
            // Check if person exists
            const existingPerson = await db.select()
              .from(schema.people)
              .where(eq(schema.people.id, personId))
              .limit(1);

            // Insert person if doesn't exist
            if (existingPerson.length === 0) {
              const personInsertData: any = {
                id: personId,
                knownForDepartment: personData.known_for_department || member.department,
              };
              if (personData.profile_path !== undefined) {
                personInsertData.profilePath = personData.profile_path;
              }
              await db.insert(schema.people).values(personInsertData);

              // Insert person translations
              const personTranslations = [];
              if (personName.en) {
                personTranslations.push({
                  personId,
                  language: 'en' as const,
                  name: personName.en,
                });
              }
              if (personName.lo) {
                personTranslations.push({
                  personId,
                  language: 'lo' as const,
                  name: personName.lo,
                });
              }
              if (personTranslations.length > 0) {
                await db.insert(schema.peopleTranslations).values(personTranslations);
              }
            }

            // Insert movie-crew relationship
            await db.insert(schema.movieCrew).values({
              movieId: newMovie.id,
              personId,
              department: member.department,
            });

            // Insert job translations
            const jobTranslations = [];
            if (jobName.en) {
              jobTranslations.push({
                movieId: newMovie.id,
                personId,
                department: member.department,
                language: 'en' as const,
                job: jobName.en,
              });
            }
            if (jobName.lo) {
              jobTranslations.push({
                movieId: newMovie.id,
                personId,
                department: member.department,
                language: 'lo' as const,
                job: jobName.lo,
              });
            }
            if (jobTranslations.length > 0) {
              await db.insert(schema.movieCrewTranslations).values(jobTranslations);
            }
          }
        }

        // Insert images
        if (images && images.length > 0) {
          const imageValues = images.map((img) => {
            const value: any = {
              movieId: newMovie.id,
              type: img.type,
              filePath: img.file_path,
              isPrimary: img.is_primary || false,
            };
            
            // Only include optional fields if they're defined
            if (img.aspect_ratio !== undefined) value.aspectRatio = img.aspect_ratio;
            if (img.height !== undefined) value.height = img.height;
            if (img.width !== undefined) value.width = img.width;
            if (img.iso_639_1 !== undefined) value.iso6391 = img.iso_639_1;
            if (img.vote_average !== undefined) value.voteAverage = img.vote_average;
            if (img.vote_count !== undefined) value.voteCount = img.vote_count;
            
            return value;
          });
          
          await db.insert(schema.movieImages).values(imageValues);
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

  // Update movie
  fastify.put<{ Params: { id: string }; Body: Partial<z.infer<typeof CreateMovieSchema>> }>(
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
        const movieFieldsToUpdate: any = {};
        if (movieUpdates.runtime !== undefined) movieFieldsToUpdate.runtime = movieUpdates.runtime;
        if (movieUpdates.vote_average !== undefined) movieFieldsToUpdate.voteAverage = movieUpdates.vote_average;
        if (movieUpdates.vote_count !== undefined) movieFieldsToUpdate.voteCount = movieUpdates.vote_count;
        if (movieUpdates.popularity !== undefined) movieFieldsToUpdate.popularity = movieUpdates.popularity;
        if (movieUpdates.release_date !== undefined) movieFieldsToUpdate.releaseDate = movieUpdates.release_date;
        if (movieUpdates.poster_path !== undefined) movieFieldsToUpdate.posterPath = movieUpdates.poster_path;
        if (movieUpdates.backdrop_path !== undefined) movieFieldsToUpdate.backdropPath = movieUpdates.backdrop_path;
        if (movieUpdates.availability_status !== undefined) movieFieldsToUpdate.availabilityStatus = movieUpdates.availability_status;

        if (Object.keys(movieFieldsToUpdate).length > 0) {
          await db.update(schema.movies)
            .set(movieFieldsToUpdate)
            .where(eq(schema.movies.id, id));
        }

        // Update translations if provided
        if (title || overview || tagline) {
          for (const lang of ['en', 'lo'] as const) {
            if (title?.[lang] || overview?.[lang] || tagline?.[lang]) {
              const existingTrans = await db.select()
                .from(schema.movieTranslations)
                .where(sql`${schema.movieTranslations.movieId} = ${id} AND ${schema.movieTranslations.language} = ${lang}`)
                .limit(1);

              const transData: any = {};
              if (title?.[lang]) transData.title = title[lang];
              if (overview?.[lang]) transData.overview = overview[lang];
              if (tagline?.[lang]) transData.tagline = tagline[lang];

              if (existingTrans.length > 0) {
                await db.update(schema.movieTranslations)
                  .set(transData)
                  .where(sql`${schema.movieTranslations.movieId} = ${id} AND ${schema.movieTranslations.language} = ${lang}`);
              } else if (title?.[lang]) {
                await db.insert(schema.movieTranslations).values({
                  movieId: id,
                  language: lang,
                  title: title[lang],
                  overview: overview?.[lang] || '',
                  tagline: tagline?.[lang],
                });
              }
            }
          }
        }

        // Update cast character translations if provided
        if (cast && Array.isArray(cast)) {
          for (const member of cast) {
            const personId = member.person.id;
            const characterName = member.character;
            
            if (characterName) {
              // Update or insert character translations
              for (const lang of ['en', 'lo'] as const) {
                if (characterName[lang]) {
                  const existingCharTrans = await db.select()
                    .from(schema.movieCastTranslations)
                    .where(sql`${schema.movieCastTranslations.movieId} = ${id} AND ${schema.movieCastTranslations.personId} = ${personId} AND ${schema.movieCastTranslations.language} = ${lang}`)
                    .limit(1);

                  if (existingCharTrans.length > 0) {
                    await db.update(schema.movieCastTranslations)
                      .set({ character: characterName[lang] })
                      .where(sql`${schema.movieCastTranslations.movieId} = ${id} AND ${schema.movieCastTranslations.personId} = ${personId} AND ${schema.movieCastTranslations.language} = ${lang}`);
                  } else {
                    await db.insert(schema.movieCastTranslations).values({
                      movieId: id,
                      personId,
                      language: lang,
                      character: characterName[lang],
                    });
                  }
                }
              }
            }
          }
        }

        // Update crew job translations if provided
        if (crew && Array.isArray(crew)) {
          for (const member of crew) {
            const personId = member.person.id;
            const jobTitle = member.job;
            const department = member.department;
            
            if (jobTitle && department) {
              // Update or insert job translations
              for (const lang of ['en', 'lo'] as const) {
                if (jobTitle[lang]) {
                  const existingJobTrans = await db.select()
                    .from(schema.movieCrewTranslations)
                    .where(sql`${schema.movieCrewTranslations.movieId} = ${id} AND ${schema.movieCrewTranslations.personId} = ${personId} AND ${schema.movieCrewTranslations.department} = ${department} AND ${schema.movieCrewTranslations.language} = ${lang}`)
                    .limit(1);

                  if (existingJobTrans.length > 0) {
                    await db.update(schema.movieCrewTranslations)
                      .set({ job: jobTitle[lang] })
                      .where(sql`${schema.movieCrewTranslations.movieId} = ${id} AND ${schema.movieCrewTranslations.personId} = ${personId} AND ${schema.movieCrewTranslations.department} = ${department} AND ${schema.movieCrewTranslations.language} = ${lang}`);
                  } else {
                    await db.insert(schema.movieCrewTranslations).values({
                      movieId: id,
                      personId,
                      department,
                      language: lang,
                      job: jobTitle[lang],
                    });
                  }
                }
              }
            }
          }
        }

        // Update video sources if provided
        if (video_sources && Array.isArray(video_sources)) {
          for (const vs of video_sources) {
            // Check if video source exists for this movie
            const existingVS = await db.select()
              .from(schema.videoSources)
              .where(eq(schema.videoSources.movieId, id))
              .limit(1);

            const vsData: any = {};
            if (vs.quality !== undefined) vsData.quality = vs.quality;
            if (vs.format !== undefined) vsData.format = vs.format;
            if (vs.width !== undefined) vsData.width = vs.width;
            if (vs.height !== undefined) vsData.height = vs.height;
            if (vs.aspect_ratio !== undefined) vsData.aspectRatio = vs.aspect_ratio;

            if (existingVS.length > 0) {
              // Update existing video source
              await db.update(schema.videoSources)
                .set(vsData)
                .where(eq(schema.videoSources.movieId, id));
            }
          }
        }

        // Update images if provided
        if (images && Array.isArray(images)) {
          // Delete existing images for this movie
          await db.delete(schema.movieImages)
            .where(eq(schema.movieImages.movieId, id));

          // Insert new images
          if (images.length > 0) {
            const imageValues = images.map((img) => {
              const value: any = {
                movieId: id,
                type: img.type,
                filePath: img.file_path,
                isPrimary: img.is_primary || false,
              };
              
              // Only include optional fields if they're defined
              if (img.aspect_ratio !== undefined) value.aspectRatio = img.aspect_ratio;
              if (img.height !== undefined) value.height = img.height;
              if (img.width !== undefined) value.width = img.width;
              if (img.iso_639_1 !== undefined) value.iso6391 = img.iso_639_1;
              if (img.vote_average !== undefined) value.voteAverage = img.vote_average;
              if (img.vote_count !== undefined) value.voteCount = img.vote_count;
              
              return value;
            });
            
            await db.insert(schema.movieImages).values(imageValues);

            // Update poster_path and backdrop_path to match primary images
            const primaryPoster = images.find(img => img.type === 'poster' && img.is_primary);
            const primaryBackdrop = images.find(img => img.type === 'backdrop' && img.is_primary);
            
            const pathUpdates: any = {};
            if (primaryPoster) pathUpdates.posterPath = primaryPoster.file_path;
            if (primaryBackdrop) pathUpdates.backdropPath = primaryBackdrop.file_path;
            
            if (Object.keys(pathUpdates).length > 0) {
              await db.update(schema.movies)
                .set(pathUpdates)
                .where(eq(schema.movies.id, id));
            }
          }
        }

        // Update external platforms if provided
        if (external_platforms !== undefined) {
          // Delete existing external platforms for this movie
          await db.delete(schema.movieExternalPlatforms)
            .where(eq(schema.movieExternalPlatforms.movieId, id));

          // Insert new external platforms
          if (external_platforms.length > 0) {
            const platformValues = external_platforms.map((ep) => ({
              movieId: id,
              platform: ep.platform,
              url: ep.url || null,
            }));
            
            await db.insert(schema.movieExternalPlatforms).values(platformValues);
          }
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

  // Set primary image
  fastify.put<{ 
    Params: { id: string; imageId: string }; 
    Body: { type: 'poster' | 'backdrop' | 'logo' } 
  }>(
    '/movies/:id/images/:imageId/primary',
    async (request, reply) => {
      try {
        const { id: movieId, imageId } = request.params;
        const { type } = request.body;

        // Verify movie exists
        const [movie] = await db.select()
          .from(schema.movies)
          .where(eq(schema.movies.id, movieId))
          .limit(1);

        if (!movie) {
          return reply.status(404).send({ error: 'Movie not found' });
        }

        // Verify image exists and belongs to this movie
        const [image] = await db.select()
          .from(schema.movieImages)
          .where(sql`${schema.movieImages.id} = ${imageId} AND ${schema.movieImages.movieId} = ${movieId}`)
          .limit(1);

        if (!image) {
          return reply.status(404).send({ error: 'Image not found' });
        }

        if (image.type !== type) {
          return reply.status(400).send({ error: 'Image type mismatch' });
        }

        // Unset all primary flags for this type
        await db.update(schema.movieImages)
          .set({ isPrimary: false })
          .where(sql`${schema.movieImages.movieId} = ${movieId} AND ${schema.movieImages.type} = ${type}`);

        // Set the selected image as primary
        await db.update(schema.movieImages)
          .set({ isPrimary: true })
          .where(eq(schema.movieImages.id, imageId));

        // Update the movie's poster_path or backdrop_path if applicable
        if (type === 'poster') {
          await db.update(schema.movies)
            .set({ posterPath: image.filePath })
            .where(eq(schema.movies.id, movieId));
        } else if (type === 'backdrop') {
          await db.update(schema.movies)
            .set({ backdropPath: image.filePath })
            .where(eq(schema.movies.id, movieId));
        }

        return reply.status(200).send({ 
          success: true,
          message: `Primary ${type} updated successfully`,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to update primary image' });
      }
    }
  );

  // Add cast member to movie
  fastify.post<{
    Params: { id: string };
    Body: {
      person_id: number;
      character: { en: string; lo?: string };
      order?: number;
    };
  }>('/movies/:id/cast', async (request, reply) => {
    try {
      const { id: movieId } = request.params;
      const { person_id, character, order } = request.body;

      // Verify movie exists
      const [movie] = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, movieId))
        .limit(1);

      if (!movie) {
        return reply.status(404).send({ error: 'Movie not found' });
      }

      // Verify person exists
      const [person] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, person_id))
        .limit(1);

      if (!person) {
        return reply.status(404).send({ error: 'Person not found' });
      }

      // Get the next order number if not provided
      let castOrder = order;
      if (castOrder === undefined) {
        const existingCast = await db.select({ order: schema.movieCast.order })
          .from(schema.movieCast)
          .where(eq(schema.movieCast.movieId, movieId));
        castOrder = existingCast.length > 0 ? Math.max(...existingCast.map(c => c.order)) + 1 : 0;
      }

      // Insert cast record
      await db.insert(schema.movieCast).values({
        movieId,
        personId: person_id,
        order: castOrder,
      });

      // Insert character translations
      if (character.en) {
        await db.insert(schema.movieCastTranslations).values({
          movieId,
          personId: person_id,
          language: 'en',
          character: character.en,
        });
      }

      if (character.lo) {
        await db.insert(schema.movieCastTranslations).values({
          movieId,
          personId: person_id,
          language: 'lo',
          character: character.lo,
        });
      }

      return { success: true, message: 'Cast member added successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to add cast member' });
    }
  });

  // Add crew member to movie
  fastify.post<{
    Params: { id: string };
    Body: {
      person_id: number;
      department: string;
      job: { en: string; lo?: string };
    };
  }>('/movies/:id/crew', async (request, reply) => {
    try {
      const { id: movieId } = request.params;
      const { person_id, department, job } = request.body;

      // Verify movie exists
      const [movie] = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, movieId))
        .limit(1);

      if (!movie) {
        return reply.status(404).send({ error: 'Movie not found' });
      }

      // Verify person exists
      const [person] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, person_id))
        .limit(1);

      if (!person) {
        return reply.status(404).send({ error: 'Person not found' });
      }

      // Insert crew record
      await db.insert(schema.movieCrew).values({
        movieId,
        personId: person_id,
        department,
      });

      // Insert job translations
      if (job.en) {
        await db.insert(schema.movieCrewTranslations).values({
          movieId,
          personId: person_id,
          department,
          language: 'en',
          job: job.en,
        });
      }

      if (job.lo) {
        await db.insert(schema.movieCrewTranslations).values({
          movieId,
          personId: person_id,
          department,
          language: 'lo',
          job: job.lo,
        });
      }

      return { success: true, message: 'Crew member added successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to add crew member' });
    }
  });

  // Remove cast member from movie
  fastify.delete<{
    Params: { id: string; personId: string };
  }>('/movies/:id/cast/:personId', async (request, reply) => {
    try {
      const { id: movieId, personId } = request.params;
      const personIdNum = parseInt(personId);

      // Delete cast translations first
      await db.delete(schema.movieCastTranslations)
        .where(sql`${schema.movieCastTranslations.movieId} = ${movieId} AND ${schema.movieCastTranslations.personId} = ${personIdNum}`);

      // Delete cast record
      await db.delete(schema.movieCast)
        .where(sql`${schema.movieCast.movieId} = ${movieId} AND ${schema.movieCast.personId} = ${personIdNum}`);

      return { success: true, message: 'Cast member removed successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to remove cast member' });
    }
  });

  // Remove crew member from movie
  fastify.delete<{
    Params: { id: string; personId: string };
    Querystring: { department?: string };
  }>('/movies/:id/crew/:personId', async (request, reply) => {
    try {
      const { id: movieId, personId } = request.params;
      const { department } = request.query;
      const personIdNum = parseInt(personId);

      if (department) {
        // Delete specific department entry
        await db.delete(schema.movieCrewTranslations)
          .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${personIdNum} AND ${schema.movieCrewTranslations.department} = ${department}`);
        await db.delete(schema.movieCrew)
          .where(sql`${schema.movieCrew.movieId} = ${movieId} AND ${schema.movieCrew.personId} = ${personIdNum} AND ${schema.movieCrew.department} = ${department}`);
      } else {
        // Delete all crew entries for this person
        await db.delete(schema.movieCrewTranslations)
          .where(sql`${schema.movieCrewTranslations.movieId} = ${movieId} AND ${schema.movieCrewTranslations.personId} = ${personIdNum}`);
        await db.delete(schema.movieCrew)
          .where(sql`${schema.movieCrew.movieId} = ${movieId} AND ${schema.movieCrew.personId} = ${personIdNum}`);
      }

      return { success: true, message: 'Crew member removed successfully' };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to remove crew member' });
    }
  });

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
