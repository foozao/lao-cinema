// Movie routes

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';

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
      
      // Get translations for all movies
      const movieIds = allMovies.map(m => m.id);
      const translations = movieIds.length > 0 
        ? await db.select()
            .from(schema.movieTranslations)
            .where(sql`${schema.movieTranslations.movieId} IN (${sql.join(movieIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Build response with translations
      const moviesWithTranslations = allMovies.map(movie => {
        const movieTranslations = translations.filter(t => t.movieId === movie.id);
        
        const title: any = {};
        const overview: any = {};
        const tagline: any = {};
        
        for (const trans of movieTranslations) {
          title[trans.language] = trans.title;
          overview[trans.language] = trans.overview;
          if (trans.tagline) {
            tagline[trans.language] = trans.tagline;
          }
        }
        
        return {
          id: movie.id,
          tmdb_id: movie.tmdbId,
          imdb_id: movie.imdbId,
          original_title: movie.originalTitle,
          poster_path: movie.posterPath,
          backdrop_path: movie.backdropPath,
          release_date: movie.releaseDate,
          runtime: movie.runtime,
          vote_average: movie.voteAverage,
          vote_count: movie.voteCount,
          popularity: movie.popularity,
          adult: movie.adult,
          title: Object.keys(title).length > 0 ? title : { en: movie.originalTitle || 'Untitled' },
          overview: Object.keys(overview).length > 0 ? overview : { en: '' },
          tagline: Object.keys(tagline).length > 0 ? tagline : undefined,
          genres: [],
          cast: [],
          crew: [],
          video_sources: [],
          created_at: movie.createdAt,
          updated_at: movie.updatedAt,
        };
      });
      
      return { movies: moviesWithTranslations };
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

      // Get translations
      const translations = await db.select()
        .from(schema.movieTranslations)
        .where(eq(schema.movieTranslations.movieId, id));

      // Build localized text objects
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

      // Get cast with person data
      const castData = await db.select()
        .from(schema.movieCast)
        .where(eq(schema.movieCast.movieId, id));
      
      const cast = [];
      for (const castMember of castData) {
        const person = await db.select().from(schema.people).where(eq(schema.people.id, castMember.personId)).limit(1);
        const personTranslations = await db.select().from(schema.peopleTranslations).where(eq(schema.peopleTranslations.personId, castMember.personId));
        const characterTranslations = await db.select().from(schema.movieCastTranslations)
          .where(sql`${schema.movieCastTranslations.movieId} = ${id} AND ${schema.movieCastTranslations.personId} = ${castMember.personId}`);
        
        if (person[0]) {
          const personName: any = {};
          const character: any = {};
          
          for (const trans of personTranslations) {
            personName[trans.language] = trans.name;
          }
          for (const trans of characterTranslations) {
            character[trans.language] = trans.character;
          }
          
          cast.push({
            person: {
              id: person[0].id,
              name: Object.keys(personName).length > 0 ? personName : { en: 'Unknown' },
              profile_path: person[0].profilePath,
            },
            character: Object.keys(character).length > 0 ? character : { en: '' },
            order: castMember.order,
          });
        }
      }

      // Get crew with person data
      const crewData = await db.select()
        .from(schema.movieCrew)
        .where(eq(schema.movieCrew.movieId, id));
      
      const crew = [];
      for (const crewMember of crewData) {
        const person = await db.select().from(schema.people).where(eq(schema.people.id, crewMember.personId)).limit(1);
        const personTranslations = await db.select().from(schema.peopleTranslations).where(eq(schema.peopleTranslations.personId, crewMember.personId));
        const jobTranslations = await db.select().from(schema.movieCrewTranslations)
          .where(sql`${schema.movieCrewTranslations.movieId} = ${id} AND ${schema.movieCrewTranslations.personId} = ${crewMember.personId} AND ${schema.movieCrewTranslations.department} = ${crewMember.department}`);
        
        if (person[0]) {
          const personName: any = {};
          const job: any = {};
          
          for (const trans of personTranslations) {
            personName[trans.language] = trans.name;
          }
          for (const trans of jobTranslations) {
            job[trans.language] = trans.job;
          }
          
          crew.push({
            person: {
              id: person[0].id,
              name: Object.keys(personName).length > 0 ? personName : { en: 'Unknown' },
              profile_path: person[0].profilePath,
            },
            job: Object.keys(job).length > 0 ? job : { en: '' },
            department: crewMember.department,
          });
        }
      }

      // Get genres
      const genreData = await db.select()
        .from(schema.movieGenres)
        .where(eq(schema.movieGenres.movieId, id));
      
      const genres = [];
      for (const movieGenre of genreData) {
        const genre = await db.select().from(schema.genres).where(eq(schema.genres.id, movieGenre.genreId)).limit(1);
        const genreTranslations = await db.select().from(schema.genreTranslations).where(eq(schema.genreTranslations.genreId, movieGenre.genreId));
        
        if (genre[0]) {
          const genreName: any = {};
          
          for (const trans of genreTranslations) {
            genreName[trans.language] = trans.name;
          }
          
          genres.push({
            id: genre[0].id,
            name: Object.keys(genreName).length > 0 ? genreName : { en: 'Unknown' },
          });
        }
      }

      // Get video sources
      const videoSources = await db.select()
        .from(schema.videoSources)
        .where(eq(schema.videoSources.movieId, id));

      // Return in expected format with fallbacks
      return {
        id: movie.id,
        tmdb_id: movie.tmdbId,
        imdb_id: movie.imdbId,
        original_title: movie.originalTitle,
        poster_path: movie.posterPath,
        backdrop_path: movie.backdropPath,
        release_date: movie.releaseDate,
        runtime: movie.runtime,
        vote_average: movie.voteAverage,
        vote_count: movie.voteCount,
        popularity: movie.popularity,
        adult: movie.adult,
        title: Object.keys(title).length > 0 ? title : { en: movie.originalTitle || 'Untitled' },
        overview: Object.keys(overview).length > 0 ? overview : { en: '' },
        tagline: Object.keys(tagline).length > 0 ? tagline : undefined,
        genres,
        cast,
        crew,
        video_sources: videoSources.map(vs => ({
          id: vs.id,
          quality: vs.quality,
          format: vs.format,
          url: vs.url,
          size_bytes: vs.sizeBytes,
        })),
        created_at: movie.createdAt,
        updated_at: movie.updatedAt,
      };
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
        const { cast, crew, title, overview, tagline, genres, ...movieFields } = movieData;
        
        // Prepare movie data (only non-localized fields)
        const dataToInsert: any = {
          originalTitle: movieData.original_title || 'Untitled',
          adult: movieData.adult || false,
        };
        
        // Only include defined values to avoid PostgreSQL undefined errors
        if (movieData.tmdb_id !== undefined) dataToInsert.tmdbId = movieData.tmdb_id;
        if (movieData.imdb_id !== undefined) dataToInsert.imdbId = movieData.imdb_id;
        if (movieData.poster_path !== undefined) dataToInsert.posterPath = movieData.poster_path;
        if (movieData.backdrop_path !== undefined) dataToInsert.backdropPath = movieData.backdrop_path;
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
        const { title, overview, tagline, cast, crew, genres, ...movieUpdates } = updates;
        
        // Update basic movie fields if provided
        const movieFieldsToUpdate: any = {};
        if (movieUpdates.runtime !== undefined) movieFieldsToUpdate.runtime = movieUpdates.runtime;
        if (movieUpdates.vote_average !== undefined) movieFieldsToUpdate.voteAverage = movieUpdates.vote_average;
        if (movieUpdates.vote_count !== undefined) movieFieldsToUpdate.voteCount = movieUpdates.vote_count;
        if (movieUpdates.popularity !== undefined) movieFieldsToUpdate.popularity = movieUpdates.popularity;
        if (movieUpdates.release_date !== undefined) movieFieldsToUpdate.releaseDate = movieUpdates.release_date;
        if (movieUpdates.poster_path !== undefined) movieFieldsToUpdate.posterPath = movieUpdates.poster_path;
        if (movieUpdates.backdrop_path !== undefined) movieFieldsToUpdate.backdropPath = movieUpdates.backdrop_path;

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
