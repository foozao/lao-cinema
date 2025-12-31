// Movie Accolades routes - Get all accolades for a movie

import { FastifyInstance } from 'fastify';
import { sendNotFound, sendInternalError } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, or, desc } from 'drizzle-orm';
import { buildInClause } from '../lib/query-helpers.js';
import { buildLocalizedText } from '../lib/translation-helpers.js';

export default async function movieAccoladesRoutes(fastify: FastifyInstance) {
  // Get all accolades for a movie (nominations + selections)
  // Includes both the movie's own accolades AND accolades of its cast/crew
  fastify.get<{
    Params: { id: string };
  }>('/movies/:id/accolades', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Verify movie exists
      const [movie] = await db.select().from(schema.movies).where(eq(schema.movies.id, id)).limit(1);
      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }
      
      // Get cast and crew for this movie
      const cast = await db.select().from(schema.movieCast).where(eq(schema.movieCast.movieId, id));
      const crew = await db.select().from(schema.movieCrew).where(eq(schema.movieCrew.movieId, id));
      const personIds = [...new Set([...cast.map(c => c.personId), ...crew.map(c => c.personId)])];
      
      // Get nominations where:
      // 1. Movie is the nominee (movieId = id)
      // 2. Movie is the "for movie" (forMovieId = id) - person nominated for work on this movie
      const nominations = await db.select()
        .from(schema.accoladeNominations)
        .where(or(
          eq(schema.accoladeNominations.movieId, id),
          eq(schema.accoladeNominations.forMovieId, id)
        ));
      
      // Get section selections for this movie
      const selections = await db.select()
        .from(schema.accoladeSectionSelections)
        .where(eq(schema.accoladeSectionSelections.movieId, id));
      
      if (nominations.length === 0 && selections.length === 0) {
        return { film_accolades: [], cast_crew_accolades: [] };
      }
      
      // Gather all IDs for batch queries
      const editionIds = [...new Set([
        ...nominations.map(n => n.editionId),
        ...selections.map(s => s.editionId)
      ])];
      const categoryIds = [...new Set(nominations.map(n => n.categoryId))];
      const sectionIds = [...new Set(selections.map(s => s.sectionId))];
      const nomineePersonIds = [...new Set(nominations.filter(n => n.personId).map(n => n.personId!))];
      const nominationIds = nominations.map(n => n.id);
      
      // Batch fetch all related data
      const editions = editionIds.length > 0 
        ? await db.select().from(schema.accoladeEditions).where(buildInClause(schema.accoladeEditions.id, editionIds))
        : [];
      
      const categories = categoryIds.length > 0
        ? await db.select().from(schema.accoladeCategories).where(buildInClause(schema.accoladeCategories.id, categoryIds))
        : [];
      
      const categoryTrans = categoryIds.length > 0
        ? await db.select().from(schema.accoladeCategoryTranslations).where(buildInClause(schema.accoladeCategoryTranslations.categoryId, categoryIds))
        : [];
      
      const sections = sectionIds.length > 0
        ? await db.select().from(schema.accoladeSections).where(buildInClause(schema.accoladeSections.id, sectionIds))
        : [];
      
      const sectionTrans = sectionIds.length > 0
        ? await db.select().from(schema.accoladeSectionTranslations).where(buildInClause(schema.accoladeSectionTranslations.sectionId, sectionIds))
        : [];
      
      const nominationTrans = nominationIds.length > 0
        ? await db.select().from(schema.accoladeNominationTranslations).where(buildInClause(schema.accoladeNominationTranslations.nominationId, nominationIds))
        : [];
      
      const people = nomineePersonIds.length > 0
        ? await db.select().from(schema.people).where(buildInClause(schema.people.id, nomineePersonIds))
        : [];
      
      const peopleTrans = nomineePersonIds.length > 0
        ? await db.select().from(schema.peopleTranslations).where(buildInClause(schema.peopleTranslations.personId, nomineePersonIds))
        : [];
      
      // Get show (event) data
      const showIds = [...new Set(editions.map(e => e.eventId))];
      const shows = showIds.length > 0
        ? await db.select().from(schema.accoladeEvents).where(buildInClause(schema.accoladeEvents.id, showIds))
        : [];
      const showTrans = showIds.length > 0
        ? await db.select().from(schema.accoladeEventTranslations).where(buildInClause(schema.accoladeEventTranslations.eventId, showIds))
        : [];
      
      // Helper to format an accolade item
      const formatAccolade = (item: {
        id: string;
        type: 'nomination' | 'selection';
        editionId: string;
        categoryId?: string;
        sectionId?: string;
        isWinner?: boolean;
        personId?: number | null;
      }): {
        id: string;
        type: 'nomination' | 'selection';
        is_winner: boolean;
        show: { id: string; slug: string | null; name: Record<string, string> } | null;
        edition: { id: string; year: number; edition_number: number | null } | null;
        category: { id: string; name: Record<string, string> } | null;
        section: { id: string; name: Record<string, string> } | null;
        person: { id: number; name: Record<string, string>; profile_path: string | null } | null;
        recognition_type?: Record<string, string>;
        notes?: Record<string, string>;
      } => {
        const edition = editions.find(e => e.id === item.editionId);
        const show = edition ? shows.find(s => s.id === edition.eventId) : null;
        
        let category = null;
        if (item.categoryId) {
          const cat = categories.find(c => c.id === item.categoryId);
          const catTrans = categoryTrans.filter(t => t.categoryId === item.categoryId);
          category = cat ? {
            id: cat.id,
            name: buildLocalizedText(catTrans, 'name'),
          } : null;
        }
        
        let section = null;
        if (item.sectionId) {
          const sec = sections.find(s => s.id === item.sectionId);
          const secTrans = sectionTrans.filter(t => t.sectionId === item.sectionId);
          section = sec ? {
            id: sec.id,
            name: buildLocalizedText(secTrans, 'name'),
          } : null;
        }
        
        let person = null;
        if (item.personId) {
          const p = people.find(p => p.id === item.personId);
          const pTrans = peopleTrans.filter(t => t.personId === item.personId);
          person = p ? {
            id: p.id,
            name: buildLocalizedText(pTrans, 'name'),
            profile_path: p.profilePath,
          } : null;
        }
        
        return {
          id: item.id,
          type: item.type,
          is_winner: item.isWinner ?? false,
          show: show ? {
            id: show.id,
            slug: show.slug,
            name: buildLocalizedText(showTrans.filter(t => t.eventId === show.id), 'name'),
          } : null,
          edition: edition ? {
            id: edition.id,
            year: edition.year,
            edition_number: edition.editionNumber,
          } : null,
          category,
          section,
          person,
        };
      };
      
      // Separate film accolades from cast/crew accolades
      const filmAccolades: any[] = [];
      const castCrewAccolades: any[] = [];
      
      // Process nominations
      for (const nom of nominations) {
        // For cast/crew accolades, verify the person is actually in this movie's cast/crew
        if (nom.forMovieId === id && nom.personId) {
          if (!personIds.includes(nom.personId)) {
            // Person not in this movie's cast/crew - skip this accolade
            continue;
          }
        }
        
        const formatted = formatAccolade({
          id: nom.id,
          type: 'nomination',
          editionId: nom.editionId,
          categoryId: nom.categoryId,
          isWinner: nom.isWinner,
          personId: nom.personId,
        });
        
        // Add nomination-specific fields
        const nomTrans = nominationTrans.filter(t => t.nominationId === nom.id);
        formatted.recognition_type = buildLocalizedText(nomTrans, 'recognitionType');
        formatted.notes = buildLocalizedText(nomTrans, 'notes');
        
        // If movie is the nominee, it's a film accolade
        if (nom.movieId === id) {
          filmAccolades.push(formatted);
        } else if (nom.forMovieId === id && nom.personId) {
          // Person nominated for work on this movie = cast/crew accolade
          castCrewAccolades.push(formatted);
        }
      }
      
      // Process selections (always film accolades)
      for (const sel of selections) {
        const formatted = formatAccolade({
          id: sel.id,
          type: 'selection',
          editionId: sel.editionId,
          sectionId: sel.sectionId,
        });
        filmAccolades.push(formatted);
      }
      
      // Sort: winners first, then by year (most recent first)
      const sortAccolades = (a: any, b: any) => {
        // Winners/nominations before selections
        if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
        // Nominations before selections (unless winner)
        if (a.type !== b.type) {
          if (a.type === 'nomination') return -1;
          return 1;
        }
        // Most recent first
        const yearA = a.edition?.year ?? 0;
        const yearB = b.edition?.year ?? 0;
        return yearB - yearA;
      };
      
      filmAccolades.sort(sortAccolades);
      castCrewAccolades.sort(sortAccolades);
      
      return { 
        film_accolades: filmAccolades, 
        cast_crew_accolades: castCrewAccolades 
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch movie accolades');
    }
  });
}
