// People routes

import { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';

export default async function peopleRoutes(fastify: FastifyInstance) {
  // Get all people
  fastify.get('/people', async (request, reply) => {
    try {
      const allPeople = await db.select().from(schema.people);
      
      // Get translations for all people
      const peopleIds = allPeople.map(p => p.id);
      const translations = peopleIds.length > 0
        ? await db.select()
            .from(schema.peopleTranslations)
            .where(sql`${schema.peopleTranslations.personId} IN (${sql.join(peopleIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Build response with translations
      const peopleWithTranslations = allPeople.map(person => {
        const personTranslations = translations.filter(t => t.personId === person.id);
        
        const name: any = {};
        const biography: any = {};
        
        for (const trans of personTranslations) {
          name[trans.language] = trans.name;
          if (trans.biography) {
            biography[trans.language] = trans.biography;
          }
        }
        
        return {
          id: person.id,
          name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
          biography: Object.keys(biography).length > 0 ? biography : undefined,
          profile_path: person.profilePath,
          birthday: person.birthday,
          deathday: person.deathday,
          place_of_birth: person.placeOfBirth,
          known_for_department: person.knownForDepartment,
          popularity: person.popularity,
          gender: person.gender,
          imdb_id: person.imdbId,
          homepage: person.homepage,
        };
      });
      
      return { people: peopleWithTranslations };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch people' });
    }
  });

  // Get person by ID
  fastify.get<{ Params: { id: string } }>('/people/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const personId = parseInt(id);
      
      if (isNaN(personId)) {
        return reply.status(400).send({ error: 'Invalid person ID' });
      }
      
      // Get person
      const [person] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, personId))
        .limit(1);

      if (!person) {
        return reply.status(404).send({ error: 'Person not found' });
      }

      // Get translations
      const translations = await db.select()
        .from(schema.peopleTranslations)
        .where(eq(schema.peopleTranslations.personId, personId));

      // Build localized text objects
      const name: any = {};
      const biography: any = {};
      
      for (const trans of translations) {
        name[trans.language] = trans.name;
        if (trans.biography) {
          biography[trans.language] = trans.biography;
        }
      }

      // Get cast credits (movies where this person acted)
      const castCredits = await db.select()
        .from(schema.movieCast)
        .where(eq(schema.movieCast.personId, personId));
      
      const cast = [];
      for (const credit of castCredits) {
        // Get movie
        const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, credit.movieId)).limit(1);
        if (!movie) continue;
        
        // Get movie translations
        const movieTranslations = await db.select().from(schema.movieTranslations).where(eq(schema.movieTranslations.movieId, credit.movieId));
        const movieTitle: any = {};
        for (const trans of movieTranslations) {
          movieTitle[trans.language] = trans.title;
        }
        
        // Get character translations
        const characterTranslations = await db.select().from(schema.movieCastTranslations)
          .where(sql`${schema.movieCastTranslations.movieId} = ${credit.movieId} AND ${schema.movieCastTranslations.personId} = ${personId}`);
        const character: any = {};
        for (const trans of characterTranslations) {
          character[trans.language] = trans.character;
        }
        
        cast.push({
          movie: {
            id: movie.id,
            title: Object.keys(movieTitle).length > 0 ? movieTitle : { en: movie.originalTitle || 'Untitled' },
            poster_path: movie.posterPath,
            release_date: movie.releaseDate,
          },
          character: Object.keys(character).length > 0 ? character : { en: '' },
          order: credit.order,
        });
      }

      // Get crew credits (movies where this person was crew)
      const crewCredits = await db.select()
        .from(schema.movieCrew)
        .where(eq(schema.movieCrew.personId, personId));
      
      const crew = [];
      for (const credit of crewCredits) {
        // Get movie
        const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, credit.movieId)).limit(1);
        if (!movie) continue;
        
        // Get movie translations
        const movieTranslations = await db.select().from(schema.movieTranslations).where(eq(schema.movieTranslations.movieId, credit.movieId));
        const movieTitle: any = {};
        for (const trans of movieTranslations) {
          movieTitle[trans.language] = trans.title;
        }
        
        // Get job translations
        const jobTranslations = await db.select().from(schema.movieCrewTranslations)
          .where(sql`${schema.movieCrewTranslations.movieId} = ${credit.movieId} AND ${schema.movieCrewTranslations.personId} = ${personId} AND ${schema.movieCrewTranslations.department} = ${credit.department}`);
        const job: any = {};
        for (const trans of jobTranslations) {
          job[trans.language] = trans.job;
        }
        
        crew.push({
          movie: {
            id: movie.id,
            title: Object.keys(movieTitle).length > 0 ? movieTitle : { en: movie.originalTitle || 'Untitled' },
            poster_path: movie.posterPath,
            release_date: movie.releaseDate,
          },
          job: Object.keys(job).length > 0 ? job : { en: '' },
          department: credit.department,
        });
      }

      // Return in expected format with fallbacks
      return {
        id: person.id,
        name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
        biography: Object.keys(biography).length > 0 ? biography : undefined,
        profile_path: person.profilePath,
        birthday: person.birthday,
        deathday: person.deathday,
        place_of_birth: person.placeOfBirth,
        known_for_department: person.knownForDepartment,
        popularity: person.popularity,
        gender: person.gender,
        imdb_id: person.imdbId,
        homepage: person.homepage,
        cast,
        crew,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch person' });
    }
  });

  // Update person by ID
  fastify.put<{ 
    Params: { id: string };
    Body: {
      name?: { en?: string; lo?: string };
      biography?: { en?: string; lo?: string };
      birthday?: string;
      deathday?: string;
      place_of_birth?: string;
      known_for_department?: string;
      homepage?: string;
    };
  }>('/people/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const personId = parseInt(id);
      
      if (isNaN(personId)) {
        return reply.status(400).send({ error: 'Invalid person ID' });
      }

      const updates = request.body;

      // Update basic person info
      const personUpdates: any = {};
      if (updates.birthday !== undefined) personUpdates.birthday = updates.birthday || null;
      if (updates.deathday !== undefined) personUpdates.deathday = updates.deathday || null;
      if (updates.place_of_birth !== undefined) personUpdates.placeOfBirth = updates.place_of_birth || null;
      if (updates.known_for_department !== undefined) personUpdates.knownForDepartment = updates.known_for_department || null;
      if (updates.homepage !== undefined) personUpdates.homepage = updates.homepage || null;

      if (Object.keys(personUpdates).length > 0) {
        await db.update(schema.people)
          .set(personUpdates)
          .where(eq(schema.people.id, personId));
      }

      // Update translations
      if (updates.name || updates.biography) {
        // Get existing translations
        const existingTranslations = await db.select()
          .from(schema.peopleTranslations)
          .where(eq(schema.peopleTranslations.personId, personId));

        const languages = ['en', 'lo'] as const;
        
        for (const lang of languages) {
          const existingTrans = existingTranslations.find(t => t.language === lang);
          const nameValue = updates.name?.[lang];
          const bioValue = updates.biography?.[lang];

          // Skip if no updates for this language
          if (nameValue === undefined && bioValue === undefined) continue;

          if (existingTrans) {
            // Update existing translation
            const transUpdates: any = {};
            if (nameValue !== undefined) transUpdates.name = nameValue;
            if (bioValue !== undefined) transUpdates.biography = bioValue || null;

            if (Object.keys(transUpdates).length > 0) {
              await db.update(schema.peopleTranslations)
                .set(transUpdates)
                .where(
                  sql`${schema.peopleTranslations.personId} = ${personId} AND ${schema.peopleTranslations.language} = ${lang}`
                );
            }
          } else if (nameValue) {
            // Create new translation (only if name is provided)
            await db.insert(schema.peopleTranslations).values({
              personId,
              language: lang,
              name: nameValue,
              biography: bioValue || null,
            });
          }
        }
      }

      // Fetch and return updated person
      const updatedPerson = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, personId))
        .limit(1);

      if (updatedPerson.length === 0) {
        return reply.status(404).send({ error: 'Person not found' });
      }

      const translations = await db.select()
        .from(schema.peopleTranslations)
        .where(eq(schema.peopleTranslations.personId, personId));

      const name: any = {};
      const biography: any = {};

      for (const trans of translations) {
        name[trans.language] = trans.name;
        if (trans.biography) {
          biography[trans.language] = trans.biography;
        }
      }

      const person = updatedPerson[0];
      return {
        id: person.id,
        name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
        biography: Object.keys(biography).length > 0 ? biography : undefined,
        profile_path: person.profilePath,
        birthday: person.birthday,
        deathday: person.deathday,
        place_of_birth: person.placeOfBirth,
        known_for_department: person.knownForDepartment,
        popularity: person.popularity,
        gender: person.gender,
        imdb_id: person.imdbId,
        homepage: person.homepage,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to update person' });
    }
  });
}
