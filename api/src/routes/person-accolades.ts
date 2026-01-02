// Person Accolades routes - Get all accolades for a person

import { FastifyInstance } from 'fastify';
import { sendNotFound, sendInternalError } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, or } from 'drizzle-orm';
import { buildInClause } from '../lib/query-helpers.js';
import { buildLocalizedText } from '../lib/translation-helpers.js';

export default async function personAccoladesRoutes(fastify: FastifyInstance) {
  // Get all accolades for a person
  // Returns two categories:
  // 1. personal_awards: Awards where the person is the nominee (Best Actor, Best Director, etc.)
  // 2. film_accolades: Awards won by films they worked on (grouped by film)
  fastify.get<{
    Params: { id: string };
  }>('/people/:id/accolades', async (request, reply) => {
    try {
      const { id } = request.params;
      const personId = parseInt(id);
      
      if (isNaN(personId)) {
        return { personal_awards: [], film_accolades: [] };
      }
      
      // Verify person exists
      const [person] = await db.select().from(schema.people).where(eq(schema.people.id, personId)).limit(1);
      if (!person) {
        return sendNotFound(reply, 'Person not found');
      }
      
      // Get all movies this person worked on (cast + crew)
      const cast = await db.select().from(schema.movieCast).where(eq(schema.movieCast.personId, personId));
      const crew = await db.select().from(schema.movieCrew).where(eq(schema.movieCrew.personId, personId));
      const movieIds = [...new Set([...cast.map(c => c.movieId), ...crew.map(c => c.movieId)])];
      
      if (movieIds.length === 0) {
        return { personal_awards: [], film_accolades: [] };
      }
      
      // Get nominations where:
      // 1. Person is the nominee (personId = id) - PERSONAL AWARDS
      // 2. Movies they worked on are nominees (movieId in movieIds, personId is null) - FILM ACCOLADES
      const nominations = await db.select()
        .from(schema.accoladeNominations)
        .where(or(
          eq(schema.accoladeNominations.personId, personId),
          buildInClause(schema.accoladeNominations.movieId, movieIds)
        ));
      
      // Get section selections for movies they worked on
      const selections = movieIds.length > 0
        ? await db.select()
            .from(schema.accoladeSectionSelections)
            .where(buildInClause(schema.accoladeSectionSelections.movieId, movieIds))
        : [];
      
      if (nominations.length === 0 && selections.length === 0) {
        return { personal_awards: [], film_accolades: [] };
      }
      
      // Gather all IDs for batch queries
      const editionIds = [...new Set([
        ...nominations.map(n => n.editionId),
        ...selections.map(s => s.editionId)
      ])];
      const categoryIds = [...new Set(nominations.map(n => n.categoryId))];
      const sectionIds = [...new Set(selections.map(s => s.sectionId))];
      const nominationIds = nominations.map(n => n.id);
      const awardBodyIds = [...new Set(nominations.filter(n => n.awardBodyId).map(n => n.awardBodyId!))];
      
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
      
      // Get section IDs from both selections AND categories
      const categorySectionIds = categories.map(c => c.sectionId).filter((id): id is string => id !== null);
      const allSectionIds = [...new Set([...sectionIds, ...categorySectionIds])];
      
      const sections = allSectionIds.length > 0
        ? await db.select().from(schema.accoladeSections).where(buildInClause(schema.accoladeSections.id, allSectionIds))
        : [];
      
      const sectionTrans = allSectionIds.length > 0
        ? await db.select().from(schema.accoladeSectionTranslations).where(buildInClause(schema.accoladeSectionTranslations.sectionId, allSectionIds))
        : [];
      
      const nominationTrans = nominationIds.length > 0
        ? await db.select().from(schema.accoladeNominationTranslations).where(buildInClause(schema.accoladeNominationTranslations.nominationId, nominationIds))
        : [];
      
      // Get show (event) data
      const showIds = [...new Set(editions.map(e => e.eventId))];
      const shows = showIds.length > 0
        ? await db.select().from(schema.accoladeEvents).where(buildInClause(schema.accoladeEvents.id, showIds))
        : [];
      const showTrans = showIds.length > 0
        ? await db.select().from(schema.accoladeEventTranslations).where(buildInClause(schema.accoladeEventTranslations.eventId, showIds))
        : [];
      
      // Get movie data for film accolades
      const movies = movieIds.length > 0
        ? await db.select().from(schema.movies).where(buildInClause(schema.movies.id, movieIds))
        : [];
      const movieTrans = movieIds.length > 0
        ? await db.select().from(schema.movieTranslations).where(buildInClause(schema.movieTranslations.movieId, movieIds))
        : [];
      
      // Get award body data
      const awardBodies = awardBodyIds.length > 0
        ? await db.select().from(schema.awardBodies).where(buildInClause(schema.awardBodies.id, awardBodyIds))
        : [];
      const awardBodyTrans = awardBodyIds.length > 0
        ? await db.select().from(schema.awardBodyTranslations).where(buildInClause(schema.awardBodyTranslations.awardBodyId, awardBodyIds))
        : [];
      
      // Helper to format an accolade item
      const formatAccolade = (item: {
        id: string;
        type: 'nomination' | 'selection';
        editionId: string;
        categoryId?: string;
        sectionId?: string;
        isWinner?: boolean;
        movieId?: string;
        awardBodyId?: string | null;
      }): {
        id: string;
        type: 'nomination' | 'selection';
        is_winner: boolean;
        show: { id: string; slug: string | null; name: Record<string, string> } | null;
        edition: { id: string; year: number; edition_number: number | null } | null;
        category: { id: string; name: Record<string, string>; section?: { id: string; name: Record<string, string> } | null } | null;
        section: { id: string; name: Record<string, string> } | null;
        movie?: { id: string; title: Record<string, string>; poster_path: string | null };
        recognition_type?: Record<string, string>;
        notes?: Record<string, string>;
        award_body?: { id: string; abbreviation: string | null; name: Record<string, string> } | null;
      } => {
        const edition = editions.find(e => e.id === item.editionId);
        const show = edition ? shows.find(s => s.id === edition.eventId) : null;
        
        let category = null;
        if (item.categoryId) {
          const cat = categories.find(c => c.id === item.categoryId);
          const catTrans = categoryTrans.filter(t => t.categoryId === item.categoryId);
          
          // Get section info if category is section-scoped
          let categorySection = null;
          if (cat?.sectionId) {
            const sec = sections.find(s => s.id === cat.sectionId);
            const secTrans = sectionTrans.filter(t => t.sectionId === cat.sectionId);
            categorySection = sec ? {
              id: sec.id,
              name: buildLocalizedText(secTrans, 'name'),
            } : null;
          }
          
          category = cat ? {
            id: cat.id,
            name: buildLocalizedText(catTrans, 'name'),
            section: categorySection,
          } : null;
        }
        
        // Section for selections (not from category)
        let section = null;
        if (item.sectionId) {
          const sec = sections.find(s => s.id === item.sectionId);
          const secTrans = sectionTrans.filter(t => t.sectionId === item.sectionId);
          section = sec ? {
            id: sec.id,
            name: buildLocalizedText(secTrans, 'name'),
          } : null;
        }
        
        let movie = undefined;
        if (item.movieId) {
          const m = movies.find(m => m.id === item.movieId);
          const mTrans = movieTrans.filter(t => t.movieId === item.movieId);
          movie = m ? {
            id: m.id,
            title: buildLocalizedText(mTrans, 'title'),
            poster_path: m.posterPath,
          } : undefined;
        }
        
        let awardBody = null;
        if (item.awardBodyId) {
          const ab = awardBodies.find(a => a.id === item.awardBodyId);
          const abTrans = awardBodyTrans.filter(t => t.awardBodyId === item.awardBodyId);
          awardBody = ab ? {
            id: ab.id,
            abbreviation: ab.abbreviation,
            name: buildLocalizedText(abTrans, 'name'),
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
          movie,
          award_body: awardBody,
        };
      };
      
      // Separate personal awards from film accolades
      const personalAwards: any[] = [];
      const filmAccolades: any[] = [];
      
      // Process nominations
      for (const nom of nominations) {
        // Personal award: person is the nominee
        if (nom.personId === personId) {
          const formatted = formatAccolade({
            id: nom.id,
            type: 'nomination',
            editionId: nom.editionId,
            categoryId: nom.categoryId,
            isWinner: nom.isWinner,
            movieId: nom.forMovieId || undefined,
            awardBodyId: nom.awardBodyId,
          });
          
          // Add nomination-specific fields
          const nomTrans = nominationTrans.filter(t => t.nominationId === nom.id);
          formatted.recognition_type = buildLocalizedText(nomTrans, 'recognitionType');
          formatted.notes = buildLocalizedText(nomTrans, 'notes');
          
          personalAwards.push(formatted);
        }
        // Film accolade: movie they worked on is the nominee (and person is NOT the nominee)
        else if (nom.movieId && movieIds.includes(nom.movieId) && !nom.personId) {
          const formatted = formatAccolade({
            id: nom.id,
            type: 'nomination',
            editionId: nom.editionId,
            categoryId: nom.categoryId,
            isWinner: nom.isWinner,
            movieId: nom.movieId,
            awardBodyId: nom.awardBodyId,
          });
          
          // Add nomination-specific fields
          const nomTrans = nominationTrans.filter(t => t.nominationId === nom.id);
          formatted.recognition_type = buildLocalizedText(nomTrans, 'recognitionType');
          formatted.notes = buildLocalizedText(nomTrans, 'notes');
          
          filmAccolades.push(formatted);
        }
      }
      
      // Process selections (always film accolades)
      for (const sel of selections) {
        const formatted = formatAccolade({
          id: sel.id,
          type: 'selection',
          editionId: sel.editionId,
          sectionId: sel.sectionId ?? undefined,
          movieId: sel.movieId,
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
      
      personalAwards.sort(sortAccolades);
      filmAccolades.sort(sortAccolades);
      
      return { 
        personal_awards: personalAwards, 
        film_accolades: filmAccolades 
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch person accolades');
    }
  });
}
