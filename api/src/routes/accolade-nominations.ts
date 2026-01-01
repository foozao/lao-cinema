// Accolade Nominations routes

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { buildInClause } from '../lib/query-helpers.js';
import { logAuditFromRequest } from '../lib/audit-service.js';
import { buildLocalizedText } from '../lib/translation-helpers.js';

export default async function accoladeNominationsRoutes(fastify: FastifyInstance) {
  // Create nomination
  fastify.post<{
    Body: {
      edition_id: string;
      category_id: string;
      award_body_id?: string;
      person_id?: number;
      movie_id?: string;
      for_movie_id?: string;
      work_title?: { en?: string; lo?: string };
      notes?: { en?: string; lo?: string };
      recognition_type?: { en?: string; lo?: string };
      is_winner?: boolean;
      sort_order?: number;
    };
  }>('/accolades/nominations', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { edition_id, category_id, award_body_id, person_id, movie_id, for_movie_id, work_title, notes, recognition_type, is_winner, sort_order } = request.body;
      
      if (!edition_id || !category_id) {
        return sendBadRequest(reply, 'edition_id and category_id are required');
      }
      
      if (!person_id && !movie_id) {
        return sendBadRequest(reply, 'Either person_id or movie_id is required');
      }
      
      // Verify edition and category exist
      const [edition] = await db.select().from(schema.accoladeEditions).where(eq(schema.accoladeEditions.id, edition_id)).limit(1);
      if (!edition) {
        return sendNotFound(reply, 'Accolade edition not found');
      }
      
      const [category] = await db.select().from(schema.accoladeCategories).where(eq(schema.accoladeCategories.id, category_id)).limit(1);
      if (!category) {
        return sendNotFound(reply, 'Accolade category not found');
      }
      
      // Verify award body exists if provided
      if (award_body_id) {
        const [awardBody] = await db.select().from(schema.awardBodies).where(eq(schema.awardBodies.id, award_body_id)).limit(1);
        if (!awardBody) {
          return sendNotFound(reply, 'Award body not found');
        }
      }
      
      const [newNomination] = await db.insert(schema.accoladeNominations).values({
        editionId: edition_id,
        categoryId: category_id,
        awardBodyId: award_body_id || null,
        personId: person_id || null,
        movieId: movie_id || null,
        forMovieId: for_movie_id || null,
        isWinner: is_winner || false,
        sortOrder: sort_order || 0,
      }).returning();
      
      // Insert translations if provided
      if (work_title?.en || notes?.en || recognition_type?.en) {
        await db.insert(schema.accoladeNominationTranslations).values({
          nominationId: newNomination.id,
          language: 'en',
          workTitle: work_title?.en || null,
          notes: notes?.en || null,
          recognitionType: recognition_type?.en || null,
        });
      }
      
      if (work_title?.lo || notes?.lo || recognition_type?.lo) {
        await db.insert(schema.accoladeNominationTranslations).values({
          nominationId: newNomination.id,
          language: 'lo',
          workTitle: work_title?.lo || null,
          notes: notes?.lo || null,
          recognitionType: recognition_type?.lo || null,
        });
      }
      
      // Log audit event
      const nomineeDesc = person_id ? `Person #${person_id}` : movie_id ? `Movie ${movie_id}` : 'Unknown';
      await logAuditFromRequest(
        request,
        'create',
        'settings',
        newNomination.id,
        nomineeDesc,
        {
          nomination_id: { before: null, after: newNomination.id },
          edition_id: { before: null, after: edition_id },
          category_id: { before: null, after: category_id },
        }
      );
      
      return sendCreated(reply, {
        id: newNomination.id,
        edition_id: newNomination.editionId,
        category_id: newNomination.categoryId,
        award_body_id: newNomination.awardBodyId,
        person_id: newNomination.personId,
        movie_id: newNomination.movieId,
        for_movie_id: newNomination.forMovieId,
        work_title,
        notes,
        is_winner: newNomination.isWinner,
        sort_order: newNomination.sortOrder,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create nomination');
    }
  });

  // Update nomination
  fastify.put<{
    Params: { id: string };
    Body: {
      award_body_id?: string | null;
      person_id?: number;
      movie_id?: string;
      for_movie_id?: string;
      work_title?: { en?: string; lo?: string };
      notes?: { en?: string; lo?: string };
      recognition_type?: { en?: string; lo?: string };
      is_winner?: boolean;
      sort_order?: number;
    };
  }>('/accolades/nominations/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      const [existing] = await db.select().from(schema.accoladeNominations).where(eq(schema.accoladeNominations.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Nomination not found');
      }
      
      // Verify award body exists if provided
      if (updates.award_body_id) {
        const [awardBody] = await db.select().from(schema.awardBodies).where(eq(schema.awardBodies.id, updates.award_body_id)).limit(1);
        if (!awardBody) {
          return sendNotFound(reply, 'Award body not found');
        }
      }
      
      const nominationUpdates: any = { updatedAt: new Date() };
      if (updates.award_body_id !== undefined) nominationUpdates.awardBodyId = updates.award_body_id || null;
      if (updates.person_id !== undefined) nominationUpdates.personId = updates.person_id || null;
      if (updates.movie_id !== undefined) nominationUpdates.movieId = updates.movie_id || null;
      if (updates.for_movie_id !== undefined) nominationUpdates.forMovieId = updates.for_movie_id || null;
      if (updates.is_winner !== undefined) nominationUpdates.isWinner = updates.is_winner;
      if (updates.sort_order !== undefined) nominationUpdates.sortOrder = updates.sort_order;
      
      await db.update(schema.accoladeNominations).set(nominationUpdates).where(eq(schema.accoladeNominations.id, id));
      
      // Update translations
      if (updates.work_title || updates.notes || updates.recognition_type) {
        for (const lang of ['en', 'lo'] as const) {
          const workTitleVal = updates.work_title?.[lang];
          const notesVal = updates.notes?.[lang];
          const recognitionTypeVal = updates.recognition_type?.[lang];
          
          if (workTitleVal !== undefined || notesVal !== undefined || recognitionTypeVal !== undefined) {
            const [existingTrans] = await db.select().from(schema.accoladeNominationTranslations)
              .where(and(eq(schema.accoladeNominationTranslations.nominationId, id), eq(schema.accoladeNominationTranslations.language, lang)))
              .limit(1);
            
            if (existingTrans) {
              const transUpdates: any = { updatedAt: new Date() };
              if (workTitleVal !== undefined) transUpdates.workTitle = workTitleVal || null;
              if (notesVal !== undefined) transUpdates.notes = notesVal || null;
              if (recognitionTypeVal !== undefined) transUpdates.recognitionType = recognitionTypeVal || null;
              await db.update(schema.accoladeNominationTranslations).set(transUpdates)
                .where(and(eq(schema.accoladeNominationTranslations.nominationId, id), eq(schema.accoladeNominationTranslations.language, lang)));
            } else if (workTitleVal || notesVal || recognitionTypeVal) {
              await db.insert(schema.accoladeNominationTranslations).values({
                nominationId: id,
                language: lang,
                workTitle: workTitleVal || null,
                notes: notesVal || null,
                recognitionType: recognitionTypeVal || null,
              });
            }
          }
        }
      }
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'update',
        'settings',
        id,
        `Nomination ${id}`
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to update nomination');
    }
  });

  // Delete nomination
  fastify.delete<{ Params: { id: string } }>('/accolades/nominations/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const [existing] = await db.select().from(schema.accoladeNominations).where(eq(schema.accoladeNominations.id, id)).limit(1);
      if (!existing) {
        return sendNotFound(reply, 'Nomination not found');
      }
      
      await db.delete(schema.accoladeNominations).where(eq(schema.accoladeNominations.id, id));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'settings',
        id,
        `Nomination ${id}`,
        {
          nomination_id: { before: id, after: null },
        }
      );
      
      return { success: true, id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to delete nomination');
    }
  });

  // Get all winners and nominees across all awards (for showcase)
  fastify.get('/accolades/winners', async (request, reply) => {
    try {
      // Get all nominations (winners and nominees) with related data
      const winners = await db.select()
        .from(schema.accoladeNominations)
        .orderBy(desc(schema.accoladeNominations.createdAt))
        .limit(100);
      
      if (winners.length === 0) {
        return { winners: [] };
      }
      
      // Get all related data
      const editionIds = [...new Set(winners.map(w => w.editionId))];
      const categoryIds = [...new Set(winners.map(w => w.categoryId))];
      const personIds = [...new Set(winners.filter(w => w.personId).map(w => w.personId!))];
      const movieIds = [...new Set(winners.map(w => w.movieId).filter(Boolean).concat(winners.map(w => w.forMovieId).filter(Boolean)))] as string[];
      
      const editions = await db.select().from(schema.accoladeEditions).where(buildInClause(schema.accoladeEditions.id, editionIds));
      const categories = await db.select().from(schema.accoladeCategories).where(buildInClause(schema.accoladeCategories.id, categoryIds));
      const categoryTrans = await db.select().from(schema.accoladeCategoryTranslations).where(buildInClause(schema.accoladeCategoryTranslations.categoryId, categoryIds));
      const nominationTrans = await db.select().from(schema.accoladeNominationTranslations).where(buildInClause(schema.accoladeNominationTranslations.nominationId, winners.map(w => w.id)));
      
      const people = personIds.length > 0 
        ? await db.select().from(schema.people).where(buildInClause(schema.people.id, personIds))
        : [];
      const peopleTrans = personIds.length > 0 
        ? await db.select().from(schema.peopleTranslations).where(buildInClause(schema.peopleTranslations.personId, personIds))
        : [];
      const movies = movieIds.length > 0 
        ? await db.select().from(schema.movies).where(buildInClause(schema.movies.id, movieIds))
        : [];
      const movieTrans = movieIds.length > 0 
        ? await db.select().from(schema.movieTranslations).where(buildInClause(schema.movieTranslations.movieId, movieIds))
        : [];
      
      // Get show data
      const showIds = [...new Set(editions.map(e => e.eventId))];
      const shows = await db.select().from(schema.accoladeEvents).where(buildInClause(schema.accoladeEvents.id, showIds));
      const showTrans = await db.select().from(schema.accoladeEventTranslations).where(buildInClause(schema.accoladeEventTranslations.eventId, showIds));
      
      // Get section data for section-scoped categories
      const sectionIds = [...new Set(categories.filter(c => c.sectionId).map(c => c.sectionId!))] as string[];
      const sections = sectionIds.length > 0
        ? await db.select().from(schema.accoladeSections).where(buildInClause(schema.accoladeSections.id, sectionIds))
        : [];
      const sectionTrans = sectionIds.length > 0
        ? await db.select().from(schema.accoladeSectionTranslations).where(buildInClause(schema.accoladeSectionTranslations.sectionId, sectionIds))
        : [];
      
      // Get award body data
      const awardBodyIds = [...new Set(winners.filter(w => w.awardBodyId).map(w => w.awardBodyId!))];
      const awardBodies = awardBodyIds.length > 0
        ? await db.select().from(schema.awardBodies).where(buildInClause(schema.awardBodies.id, awardBodyIds))
        : [];
      const awardBodyTrans = awardBodyIds.length > 0
        ? await db.select().from(schema.awardBodyTranslations).where(buildInClause(schema.awardBodyTranslations.awardBodyId, awardBodyIds))
        : [];
      
      // Format response
      const formattedWinners = winners.map(winner => {
        const edition = editions.find(e => e.id === winner.editionId);
        const show = edition ? shows.find(s => s.id === edition.eventId) : null;
        const category = categories.find(c => c.id === winner.categoryId);
        const catTrans = categoryTrans.filter(t => t.categoryId === winner.categoryId);
        const nomTrans = nominationTrans.filter(t => t.nominationId === winner.id);
        
        let nominee = null;
        if (winner.personId) {
          const person = people.find(p => p.id === winner.personId);
          const pTrans = peopleTrans.filter(t => t.personId === winner.personId);
          nominee = person ? {
            type: 'person',
            id: person.id,
            name: buildLocalizedText(pTrans, 'name'),
            profile_path: person.profilePath,
          } : null;
        } else if (winner.movieId) {
          const movie = movies.find(m => m.id === winner.movieId);
          const mTrans = movieTrans.filter(t => t.movieId === winner.movieId);
          nominee = movie ? {
            type: 'movie',
            id: movie.id,
            title: buildLocalizedText(mTrans, 'title'),
            poster_path: movie.posterPath,
          } : null;
        }
        
        let forMovie = null;
        if (winner.forMovieId) {
          const movie = movies.find(m => m.id === winner.forMovieId);
          const mTrans = movieTrans.filter(t => t.movieId === winner.forMovieId);
          forMovie = movie ? {
            id: movie.id,
            title: buildLocalizedText(mTrans, 'title'),
            poster_path: movie.posterPath,
          } : null;
        }
        
        // Get award body if present
        let awardBody = null;
        if (winner.awardBodyId) {
          const body = awardBodies.find(b => b.id === winner.awardBodyId);
          const bodyTrans = awardBodyTrans.filter(t => t.awardBodyId === winner.awardBodyId);
          awardBody = body ? {
            id: body.id,
            abbreviation: body.abbreviation,
            name: buildLocalizedText(bodyTrans, 'name'),
            type: body.type,
          } : null;
        }
        
        return {
          id: winner.id,
          nominee,
          for_movie: forMovie,
          is_winner: winner.isWinner,
          recognition_type: buildLocalizedText(nomTrans, 'recognitionType'),
          award_body: awardBody,
          show: show ? {
            id: show.id,
            name: buildLocalizedText(showTrans.filter(t => t.eventId === show.id), 'name'),
            country: show.country,
          } : null,
          edition: edition ? {
            id: edition.id,
            year: edition.year,
            edition_number: edition.editionNumber,
          } : null,
          category: category ? {
            id: category.id,
            name: buildLocalizedText(catTrans, 'name'),
            nominee_type: category.nomineeType,
            section: category.sectionId ? (() => {
              const section = sections.find(s => s.id === category.sectionId);
              const secTrans = sectionTrans.filter(t => t.sectionId === category.sectionId);
              return section ? {
                id: section.id,
                name: buildLocalizedText(secTrans, 'name'),
              } : null;
            })() : null,
          } : null,
        };
      });
      
      // Also get section selections (films at festivals)
      const selections = await db.select()
        .from(schema.accoladeSectionSelections)
        .orderBy(desc(schema.accoladeSectionSelections.createdAt))
        .limit(50);
      
      let formattedSelections: any[] = [];
      if (selections.length > 0) {
        const selEditionIds = [...new Set(selections.map(s => s.editionId))];
        const selSectionIds = [...new Set(selections.map(s => s.sectionId))];
        const selMovieIds = [...new Set(selections.map(s => s.movieId))];
        
        const selEditions = await db.select().from(schema.accoladeEditions).where(buildInClause(schema.accoladeEditions.id, selEditionIds));
        const selSections = await db.select().from(schema.accoladeSections).where(buildInClause(schema.accoladeSections.id, selSectionIds));
        const selSectionTrans = await db.select().from(schema.accoladeSectionTranslations).where(buildInClause(schema.accoladeSectionTranslations.sectionId, selSectionIds));
        const selMovies = await db.select().from(schema.movies).where(buildInClause(schema.movies.id, selMovieIds));
        const selMovieTrans = await db.select().from(schema.movieTranslations).where(buildInClause(schema.movieTranslations.movieId, selMovieIds));
        
        const selShowIds = [...new Set(selEditions.map(e => e.eventId))];
        const selShows = await db.select().from(schema.accoladeEvents).where(buildInClause(schema.accoladeEvents.id, selShowIds));
        const selShowTrans = await db.select().from(schema.accoladeEventTranslations).where(buildInClause(schema.accoladeEventTranslations.eventId, selShowIds));
        
        formattedSelections = selections.map(sel => {
          const edition = selEditions.find(e => e.id === sel.editionId);
          const show = edition ? selShows.find(s => s.id === edition.eventId) : null;
          const section = selSections.find(s => s.id === sel.sectionId);
          const secTrans = selSectionTrans.filter(t => t.sectionId === sel.sectionId);
          const movie = selMovies.find(m => m.id === sel.movieId);
          const mTrans = selMovieTrans.filter(t => t.movieId === sel.movieId);
          
          return {
            id: sel.id,
            type: 'selection',
            nominee: movie ? {
              type: 'movie',
              id: movie.id,
              title: buildLocalizedText(mTrans, 'title'),
              poster_path: movie.posterPath,
            } : null,
            section: section ? {
              id: section.id,
              name: buildLocalizedText(secTrans, 'name'),
            } : null,
            show: show ? {
              id: show.id,
              name: buildLocalizedText(selShowTrans.filter(t => t.eventId === show.id), 'name'),
              country: show.country,
            } : null,
            edition: edition ? {
              id: edition.id,
              year: edition.year,
              edition_number: edition.editionNumber,
            } : null,
          };
        });
      }
      
      return { winners: formattedWinners, selections: formattedSelections };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch winners');
    }
  });

  // Set winner for a category in an edition
  fastify.post<{
    Body: {
      nomination_id: string;
    };
  }>('/accolades/nominations/set-winner', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { nomination_id } = request.body;
      
      if (!nomination_id) {
        return sendBadRequest(reply, 'nomination_id is required');
      }
      
      const [nomination] = await db.select().from(schema.accoladeNominations).where(eq(schema.accoladeNominations.id, nomination_id)).limit(1);
      if (!nomination) {
        return sendNotFound(reply, 'Nomination not found');
      }
      
      // Clear any existing winners in this category for this edition
      await db.update(schema.accoladeNominations)
        .set({ isWinner: false, updatedAt: new Date() })
        .where(and(
          eq(schema.accoladeNominations.editionId, nomination.editionId),
          eq(schema.accoladeNominations.categoryId, nomination.categoryId)
        ));
      
      // Set the new winner
      await db.update(schema.accoladeNominations)
        .set({ isWinner: true, updatedAt: new Date() })
        .where(eq(schema.accoladeNominations.id, nomination_id));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'update',
        'settings',
        nomination_id,
        `Set winner for nomination ${nomination_id}`,
        {
          is_winner: { before: false, after: true },
        }
      );
      
      return { success: true, nomination_id };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to set winner');
    }
  });
}
