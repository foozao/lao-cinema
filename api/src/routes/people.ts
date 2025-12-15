// People routes

import { FastifyInstance } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, sql, ilike, or } from 'drizzle-orm';
import { buildPersonCredits } from '../lib/movie-builder.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest, createChangesObject } from '../lib/audit-service.js';

export default async function peopleRoutes(fastify: FastifyInstance) {
  // Get all people (with optional search)
  fastify.get<{ Querystring: { search?: string; limit?: string } }>('/people', async (request, reply) => {
    try {
      const { search, limit } = request.query;
      const limitNum = limit ? parseInt(limit) : undefined;

      let allPeople;
      
      if (search && search.trim()) {
        // Search in translations (name and nicknames)
        const searchPattern = `%${search.trim()}%`;
        fastify.log.info(`Searching for people with pattern: ${searchPattern}`);
        
        const searchResults = await db.select({ personId: schema.peopleTranslations.personId })
          .from(schema.peopleTranslations)
          .where(
            sql`${schema.peopleTranslations.name} ILIKE ${searchPattern} OR 
                EXISTS (SELECT 1 FROM unnest(nicknames) AS n WHERE n ILIKE ${searchPattern})`
          );
        
        const personIds = [...new Set(searchResults.map(r => r.personId))];
        fastify.log.info(`Found ${personIds.length} people matching search`);
        
        if (personIds.length === 0) {
          return { people: [] };
        }
        
        allPeople = await db.select()
          .from(schema.people)
          .where(sql`${schema.people.id} IN (${sql.join(personIds.map(id => sql`${id}`), sql`, `)})`);
        
        if (limitNum) {
          allPeople = allPeople.slice(0, limitNum);
        }
      } else {
        allPeople = await db.select().from(schema.people);
      }
      
      // Get translations for all people
      const peopleIds = allPeople.map(p => p.id);
      const translations = peopleIds.length > 0
        ? await db.select()
            .from(schema.peopleTranslations)
            .where(sql`${schema.peopleTranslations.personId} IN (${sql.join(peopleIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Get all cast and crew credits to determine departments
      const castCredits = peopleIds.length > 0
        ? await db.select()
            .from(schema.movieCast)
            .where(sql`${schema.movieCast.personId} IN (${sql.join(peopleIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      const crewCredits = peopleIds.length > 0
        ? await db.select()
            .from(schema.movieCrew)
            .where(sql`${schema.movieCrew.personId} IN (${sql.join(peopleIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Get movie details for credits (only when searching, to show in results)
      const allMovieIds = [...new Set([
        ...castCredits.map(c => c.movieId),
        ...crewCredits.map(c => c.movieId)
      ])];
      
      const movies = allMovieIds.length > 0
        ? await db.select({ id: schema.movies.id, originalTitle: schema.movies.originalTitle })
            .from(schema.movies)
            .where(sql`${schema.movies.id} IN (${sql.join(allMovieIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      const movieTranslations = allMovieIds.length > 0
        ? await db.select()
            .from(schema.movieTranslations)
            .where(sql`${schema.movieTranslations.movieId} IN (${sql.join(allMovieIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Get cast translations for character names
      const castTranslations = peopleIds.length > 0
        ? await db.select()
            .from(schema.movieCastTranslations)
            .where(sql`${schema.movieCastTranslations.personId} IN (${sql.join(peopleIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Get crew translations for job titles
      const crewTranslations = peopleIds.length > 0
        ? await db.select()
            .from(schema.movieCrewTranslations)
            .where(sql`${schema.movieCrewTranslations.personId} IN (${sql.join(peopleIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Build response with translations and departments
      const peopleWithTranslations = allPeople.map(person => {
        const personTranslations = translations.filter(t => t.personId === person.id);
        
        const name: any = {};
        const biography: any = {};
        const nicknames: any = {};
        
        for (const trans of personTranslations) {
          name[trans.language] = trans.name;
          if (trans.biography) {
            biography[trans.language] = trans.biography;
          }
          if (trans.nicknames && trans.nicknames.length > 0) {
            nicknames[trans.language] = trans.nicknames;
          }
        }
        
        // Collect all unique departments this person has worked in
        const departments = new Set<string>();
        
        // Add "Acting" if they have cast credits
        if (castCredits.some(c => c.personId === person.id)) {
          departments.add('Acting');
        }
        
        // Add all crew departments
        crewCredits
          .filter(c => c.personId === person.id)
          .forEach(c => departments.add(c.department));
        
        // Build movie credits for this person (cast + crew, limit to 4 total for search results)
        const personCastCredits = castCredits.filter(c => c.personId === person.id);
        const personCrewCredits = crewCredits.filter(c => c.personId === person.id);
        
        // Build cast credits
        const castMovieCredits = personCastCredits.slice(0, 3).map(credit => {
          const movie = movies.find(m => m.id === credit.movieId);
          const movieTrans = movieTranslations.filter(t => t.movieId === credit.movieId);
          const castTrans = castTranslations.filter(t => t.movieId === credit.movieId && t.personId === person.id);
          
          const movieTitle: Record<string, string> = {};
          for (const trans of movieTrans) {
            movieTitle[trans.language] = trans.title;
          }
          
          const character: Record<string, string> = {};
          for (const trans of castTrans) {
            if (trans.character) {
              character[trans.language] = trans.character;
            }
          }
          
          return {
            movie_id: credit.movieId,
            movie_title: Object.keys(movieTitle).length > 0 ? movieTitle : { en: movie?.originalTitle || 'Unknown' },
            role: Object.keys(character).length > 0 ? character : undefined,
            type: 'cast' as const,
          };
        });
        
        // Build crew credits (different movies from cast if possible)
        const castMovieIds = new Set(castMovieCredits.map(c => c.movie_id));
        const uniqueCrewCredits = personCrewCredits.filter(c => !castMovieIds.has(c.movieId));
        const crewToShow = uniqueCrewCredits.length > 0 ? uniqueCrewCredits.slice(0, 2) : personCrewCredits.slice(0, 2);
        
        const crewMovieCredits = crewToShow.map(credit => {
          const movie = movies.find(m => m.id === credit.movieId);
          const movieTrans = movieTranslations.filter(t => t.movieId === credit.movieId);
          const crewTrans = crewTranslations.filter(t => 
            t.movieId === credit.movieId && 
            t.personId === person.id && 
            t.department === credit.department
          );
          
          const movieTitle: Record<string, string> = {};
          for (const trans of movieTrans) {
            movieTitle[trans.language] = trans.title;
          }
          
          const job: Record<string, string> = {};
          for (const trans of crewTrans) {
            job[trans.language] = trans.job;
          }
          
          return {
            movie_id: credit.movieId,
            movie_title: Object.keys(movieTitle).length > 0 ? movieTitle : { en: movie?.originalTitle || 'Unknown' },
            role: Object.keys(job).length > 0 ? job : { en: credit.department },
            type: 'crew' as const,
          };
        });
        
        // Combine and limit to 4 total
        const movieCredits = [...castMovieCredits, ...crewMovieCredits].slice(0, 4);
        
        return {
          id: person.id,
          name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
          nicknames: Object.keys(nicknames).length > 0 ? nicknames : undefined,
          biography: Object.keys(biography).length > 0 ? biography : undefined,
          profile_path: person.profilePath,
          birthday: person.birthday,
          deathday: person.deathday,
          place_of_birth: person.placeOfBirth,
          known_for_department: person.knownForDepartment,
          departments: Array.from(departments).sort(), // All departments they've worked in
          popularity: person.popularity,
          gender: person.gender,
          imdb_id: person.imdbId,
          homepage: person.homepage,
          movie_credits: movieCredits.length > 0 ? movieCredits : undefined,
        };
      });
      
      return { people: peopleWithTranslations };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch people' });
    }
  });

  // Create a new person
  fastify.post<{
    Body: {
      name: { en: string; lo?: string };
      nicknames?: { en?: string[]; lo?: string[] };
      biography?: { en?: string; lo?: string };
      known_for_department?: string;
      birthday?: string;
      place_of_birth?: string;
      profile_path?: string;
    };
  }>('/people', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { name, nicknames, biography, known_for_department, birthday, place_of_birth, profile_path } = request.body;

      if (!name?.en) {
        return reply.status(400).send({ error: 'English name is required' });
      }

      // Generate a unique ID for manually created people
      // Use negative IDs to distinguish from TMDB IDs (which are positive)
      const [minIdResult] = await db.select({ minId: sql<number>`COALESCE(MIN(id), 0)` })
        .from(schema.people);
      const newId = Math.min(minIdResult.minId - 1, -1);

      // Insert person
      const [newPerson] = await db.insert(schema.people)
        .values({
          id: newId,
          knownForDepartment: known_for_department || null,
          birthday: birthday || null,
          placeOfBirth: place_of_birth || null,
          profilePath: profile_path || null,
        })
        .returning();

      // Insert translations
      await db.insert(schema.peopleTranslations).values({
        personId: newPerson.id,
        language: 'en',
        name: name.en,
        nicknames: nicknames?.en || null,
        biography: biography?.en || null,
      });

      if (name.lo) {
        await db.insert(schema.peopleTranslations).values({
          personId: newPerson.id,
          language: 'lo',
          name: name.lo,
          nicknames: nicknames?.lo || null,
          biography: biography?.lo || null,
        });
      }

      // Log audit event
      await logAuditFromRequest(request, 'create', 'person', String(newPerson.id), name.en);

      return {
        id: newPerson.id,
        name,
        nicknames: nicknames || undefined,
        biography: biography || undefined,
        known_for_department: known_for_department || undefined,
        birthday: birthday || undefined,
        place_of_birth: place_of_birth || undefined,
        profile_path: profile_path || undefined,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to create person' });
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
      const nicknames: any = {};
      
      for (const trans of translations) {
        name[trans.language] = trans.name;
        if (trans.biography) {
          biography[trans.language] = trans.biography;
        }
        if (trans.nicknames && trans.nicknames.length > 0) {
          nicknames[trans.language] = trans.nicknames;
        }
      }

      // Get cast and crew credits using optimized batch queries
      const { cast, crew } = await buildPersonCredits(personId, db, schema);

      // Get person images
      const images = await db.select()
        .from(schema.personImages)
        .where(eq(schema.personImages.personId, personId))
        .orderBy(sql`${schema.personImages.isPrimary} DESC, ${schema.personImages.createdAt} DESC`);

      // Return in expected format with fallbacks
      return {
        id: person.id,
        name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
        nicknames: Object.keys(nicknames).length > 0 ? nicknames : undefined,
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
        images: images.length > 0 ? images : undefined,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch person' });
    }
  });

  // Merge two people (combine duplicate TMDB entries)
  fastify.post<{
    Body: {
      sourceId: number; // Person to merge from (will be deleted)
      targetId: number; // Person to merge into (will be kept)
    };
  }>('/people/merge', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { sourceId, targetId } = request.body;

      if (!sourceId || !targetId) {
        return reply.status(400).send({ error: 'Both sourceId and targetId are required' });
      }

      if (sourceId === targetId) {
        return reply.status(400).send({ error: 'Cannot merge a person with themselves' });
      }

      // Verify both people exist
      const [sourcePerson] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, sourceId))
        .limit(1);

      const [targetPerson] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, targetId))
        .limit(1);

      if (!sourcePerson) {
        return reply.status(404).send({ error: 'Source person not found' });
      }

      if (!targetPerson) {
        return reply.status(404).send({ error: 'Target person not found' });
      }

      // 1. Merge translations (add missing translations from source to target)
      const sourceTranslations = await db.select()
        .from(schema.peopleTranslations)
        .where(eq(schema.peopleTranslations.personId, sourceId));

      const targetTranslations = await db.select()
        .from(schema.peopleTranslations)
        .where(eq(schema.peopleTranslations.personId, targetId));

      const targetLanguages = new Set(targetTranslations.map(t => t.language));

      for (const sourceTrans of sourceTranslations) {
        if (!targetLanguages.has(sourceTrans.language)) {
          // Add missing translation to target
          await db.insert(schema.peopleTranslations).values({
            personId: targetId,
            language: sourceTrans.language,
            name: sourceTrans.name,
            biography: sourceTrans.biography,
          });
        }
      }

      // 2. Migrate cast credits from source to target
      const sourceCastCredits = await db.select()
        .from(schema.movieCast)
        .where(eq(schema.movieCast.personId, sourceId));

      for (const credit of sourceCastCredits) {
        // Check if target already has this cast credit
        const [existingCredit] = await db.select()
          .from(schema.movieCast)
          .where(sql`${schema.movieCast.movieId} = ${credit.movieId} AND ${schema.movieCast.personId} = ${targetId}`)
          .limit(1);

        if (!existingCredit) {
          // Update cast credit to point to target person
          await db.update(schema.movieCast)
            .set({ personId: targetId })
            .where(sql`${schema.movieCast.movieId} = ${credit.movieId} AND ${schema.movieCast.personId} = ${sourceId}`);

          // Migrate cast character translations
          const castTranslations = await db.select()
            .from(schema.movieCastTranslations)
            .where(sql`${schema.movieCastTranslations.movieId} = ${credit.movieId} AND ${schema.movieCastTranslations.personId} = ${sourceId}`);

          for (const trans of castTranslations) {
            // Check if translation already exists for target
            const [existingTrans] = await db.select()
              .from(schema.movieCastTranslations)
              .where(sql`${schema.movieCastTranslations.movieId} = ${credit.movieId} AND ${schema.movieCastTranslations.personId} = ${targetId} AND ${schema.movieCastTranslations.language} = ${trans.language}`)
              .limit(1);

            if (!existingTrans) {
              await db.update(schema.movieCastTranslations)
                .set({ personId: targetId })
                .where(sql`${schema.movieCastTranslations.movieId} = ${credit.movieId} AND ${schema.movieCastTranslations.personId} = ${sourceId} AND ${schema.movieCastTranslations.language} = ${trans.language}`);
            }
          }
        } else {
          // Target already has this credit, just delete source's translations
          await db.delete(schema.movieCastTranslations)
            .where(sql`${schema.movieCastTranslations.movieId} = ${credit.movieId} AND ${schema.movieCastTranslations.personId} = ${sourceId}`);
        }
      }

      // 3. Migrate crew credits from source to target
      const sourceCrewCredits = await db.select()
        .from(schema.movieCrew)
        .where(eq(schema.movieCrew.personId, sourceId));

      for (const credit of sourceCrewCredits) {
        // Check if target already has this crew credit
        const [existingCredit] = await db.select()
          .from(schema.movieCrew)
          .where(sql`${schema.movieCrew.movieId} = ${credit.movieId} AND ${schema.movieCrew.personId} = ${targetId} AND ${schema.movieCrew.department} = ${credit.department}`)
          .limit(1);

        if (!existingCredit) {
          // Update crew credit to point to target person
          await db.update(schema.movieCrew)
            .set({ personId: targetId })
            .where(sql`${schema.movieCrew.movieId} = ${credit.movieId} AND ${schema.movieCrew.personId} = ${sourceId} AND ${schema.movieCrew.department} = ${credit.department}`);

          // Migrate crew job translations
          const crewTranslations = await db.select()
            .from(schema.movieCrewTranslations)
            .where(sql`${schema.movieCrewTranslations.movieId} = ${credit.movieId} AND ${schema.movieCrewTranslations.personId} = ${sourceId} AND ${schema.movieCrewTranslations.department} = ${credit.department}`);

          for (const trans of crewTranslations) {
            // Check if translation already exists for target
            const [existingTrans] = await db.select()
              .from(schema.movieCrewTranslations)
              .where(sql`${schema.movieCrewTranslations.movieId} = ${credit.movieId} AND ${schema.movieCrewTranslations.personId} = ${targetId} AND ${schema.movieCrewTranslations.department} = ${credit.department} AND ${schema.movieCrewTranslations.language} = ${trans.language}`)
              .limit(1);

            if (!existingTrans) {
              await db.update(schema.movieCrewTranslations)
                .set({ personId: targetId })
                .where(sql`${schema.movieCrewTranslations.movieId} = ${credit.movieId} AND ${schema.movieCrewTranslations.personId} = ${sourceId} AND ${schema.movieCrewTranslations.department} = ${credit.department} AND ${schema.movieCrewTranslations.language} = ${trans.language}`);
            }
          }
        } else {
          // Target already has this credit, just delete source's translations
          await db.delete(schema.movieCrewTranslations)
            .where(sql`${schema.movieCrewTranslations.movieId} = ${credit.movieId} AND ${schema.movieCrewTranslations.personId} = ${sourceId} AND ${schema.movieCrewTranslations.department} = ${credit.department}`);
        }
      }

      // 4. Create alias to track the merge (prevents TMDB from recreating the duplicate)
      await db.insert(schema.personAliases).values({
        tmdbId: sourceId,
        canonicalPersonId: targetId,
      });

      // 5. Delete source person (CASCADE will handle remaining translations and credits)
      await db.delete(schema.people)
        .where(eq(schema.people.id, sourceId));

      // Log audit event
      await logAuditFromRequest(request, 'merge_people', 'person', String(targetId), `Merged ${sourceId} into ${targetId}`);

      return {
        success: true,
        message: `Successfully merged person ${sourceId} into ${targetId}`,
        targetId,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to merge people' });
    }
  });

  // Update person by ID
  fastify.put<{ 
    Params: { id: string };
    Body: {
      name?: { en?: string; lo?: string };
      nicknames?: { en?: string[]; lo?: string[] };
      biography?: { en?: string; lo?: string };
      birthday?: string;
      deathday?: string;
      place_of_birth?: string;
      known_for_department?: string;
      homepage?: string;
    };
  }>('/people/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const personId = parseInt(id);
      
      if (isNaN(personId)) {
        return reply.status(400).send({ error: 'Invalid person ID' });
      }

      const updates = request.body;
      
      // Fetch current state for change tracking
      const [existingPerson] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, personId))
        .limit(1);
      
      if (!existingPerson) {
        return reply.status(404).send({ error: 'Person not found' });
      }
      
      const existingTrans = await db.select()
        .from(schema.peopleTranslations)
        .where(eq(schema.peopleTranslations.personId, personId));
      
      // Build before state
      const beforeState: Record<string, any> = {
        birthday: existingPerson.birthday,
        deathday: existingPerson.deathday,
        place_of_birth: existingPerson.placeOfBirth,
        known_for_department: existingPerson.knownForDepartment,
        homepage: existingPerson.homepage,
      };
      
      for (const trans of existingTrans) {
        if (trans.language === 'en') {
          beforeState.name_en = trans.name;
          beforeState.biography_en = trans.biography;
          beforeState.nicknames_en = trans.nicknames;
        } else if (trans.language === 'lo') {
          beforeState.name_lo = trans.name;
          beforeState.biography_lo = trans.biography;
          beforeState.nicknames_lo = trans.nicknames;
        }
      }

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
      if (updates.name || updates.nicknames || updates.biography) {
        // Get existing translations
        const existingTranslations = await db.select()
          .from(schema.peopleTranslations)
          .where(eq(schema.peopleTranslations.personId, personId));

        const languages = ['en', 'lo'] as const;
        
        for (const lang of languages) {
          const existingTrans = existingTranslations.find(t => t.language === lang);
          const nameValue = updates.name?.[lang];
          const nicknamesValue = updates.nicknames?.[lang];
          const bioValue = updates.biography?.[lang];

          // Skip if no updates for this language
          if (nameValue === undefined && nicknamesValue === undefined && bioValue === undefined) continue;

          if (existingTrans) {
            // Update existing translation
            const transUpdates: any = {};
            if (nameValue !== undefined) transUpdates.name = nameValue;
            if (nicknamesValue !== undefined) transUpdates.nicknames = nicknamesValue && nicknamesValue.length > 0 ? nicknamesValue : null;
            if (bioValue !== undefined) transUpdates.biography = bioValue || null;

            if (Object.keys(transUpdates).length > 0) {
              // Always update timestamp when updating translations
              transUpdates.updatedAt = new Date();
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
              nicknames: nicknamesValue && nicknamesValue.length > 0 ? nicknamesValue : null,
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
      const nicknames: any = {};

      for (const trans of translations) {
        name[trans.language] = trans.name;
        if (trans.biography) {
          biography[trans.language] = trans.biography;
        }
        if (trans.nicknames && trans.nicknames.length > 0) {
          nicknames[trans.language] = trans.nicknames;
        }
      }

      const person = updatedPerson[0];
      
      // Build after state for change tracking
      const afterState: Record<string, any> = {
        birthday: updates.birthday ?? beforeState.birthday,
        deathday: updates.deathday ?? beforeState.deathday,
        place_of_birth: updates.place_of_birth ?? beforeState.place_of_birth,
        known_for_department: updates.known_for_department ?? beforeState.known_for_department,
        homepage: updates.homepage ?? beforeState.homepage,
        name_en: updates.name?.en ?? beforeState.name_en,
        name_lo: updates.name?.lo ?? beforeState.name_lo,
        biography_en: updates.biography?.en ?? beforeState.biography_en,
        biography_lo: updates.biography?.lo ?? beforeState.biography_lo,
        nicknames_en: updates.nicknames?.en ?? beforeState.nicknames_en,
        nicknames_lo: updates.nicknames?.lo ?? beforeState.nicknames_lo,
      };
      
      // Create changes object
      const changes = createChangesObject(beforeState, afterState);
      
      // Log audit event with changes
      await logAuditFromRequest(
        request, 
        'update_person', 
        'person', 
        id, 
        name.en || name.lo || 'Unknown',
        Object.keys(changes).length > 0 ? changes : undefined
      );

      return {
        id: person.id,
        name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
        nicknames: Object.keys(nicknames).length > 0 ? nicknames : undefined,
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

  // Delete person by ID
  fastify.delete<{ Params: { id: string } }>('/people/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const personId = parseInt(id);
      
      if (isNaN(personId)) {
        return reply.status(400).send({ error: 'Invalid person ID' });
      }

      // Check if person exists
      const [person] = await db.select()
        .from(schema.people)
        .where(eq(schema.people.id, personId))
        .limit(1);

      if (!person) {
        return reply.status(404).send({ error: 'Person not found' });
      }

      // Get person name for audit log before deleting
      const translations = await db.select()
        .from(schema.peopleTranslations)
        .where(eq(schema.peopleTranslations.personId, personId));
      const personName = translations.find(t => t.language === 'en')?.name || translations[0]?.name || 'Unknown';

      // Delete person (CASCADE will handle translations, cast, crew, etc.)
      await db.delete(schema.people)
        .where(eq(schema.people.id, personId));

      // Log audit event
      await logAuditFromRequest(request, 'delete', 'person', id, personName);

      return {
        success: true,
        message: `Successfully deleted person ${personId}`,
        id: personId,
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to delete person' });
    }
  });
}
