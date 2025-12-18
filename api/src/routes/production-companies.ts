import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { db, schema } from '../db/index.js';
import { eq, sql, desc } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest, createChangesObject } from '../lib/audit-service.js';

export async function productionCompaniesRoutes(fastify: FastifyInstance) {
  // Get all production companies
  fastify.get<{ Querystring: { search?: string; limit?: string } }>('/production-companies', async (request) => {
    try {
      const { search, limit } = request.query;
      const limitNum = limit ? parseInt(limit) : undefined;

      let allCompanies;
      
      if (search && search.trim()) {
        // Search in translations
        const searchPattern = `%${search.trim()}%`;
        const searchResults = await db.select({ companyId: schema.productionCompanyTranslations.companyId })
          .from(schema.productionCompanyTranslations)
          .where(sql`${schema.productionCompanyTranslations.name} ILIKE ${searchPattern}`);
        
        const companyIds = [...new Set(searchResults.map(r => r.companyId))];
        
        if (companyIds.length === 0) {
          return { companies: [] };
        }
        
        allCompanies = await db.select()
          .from(schema.productionCompanies)
          .where(sql`${schema.productionCompanies.id} IN (${sql.join(companyIds.map(id => sql`${id}`), sql`, `)})`);
        
        if (limitNum) {
          allCompanies = allCompanies.slice(0, limitNum);
        }
      } else {
        // Get all companies
        allCompanies = await db.select()
          .from(schema.productionCompanies)
          .orderBy(desc(schema.productionCompanies.createdAt));
        
        if (limitNum) {
          allCompanies = allCompanies.slice(0, limitNum);
        }
      }
      
      // Get translations for all companies
      const companyIds = allCompanies.map(c => c.id);
      const translations = companyIds.length > 0
        ? await db.select()
            .from(schema.productionCompanyTranslations)
            .where(sql`${schema.productionCompanyTranslations.companyId} IN (${sql.join(companyIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Get movies for each company
      const movieAssociations = companyIds.length > 0
        ? await db.select({
            companyId: schema.movieProductionCompanies.companyId,
            movieId: schema.movieProductionCompanies.movieId,
          })
            .from(schema.movieProductionCompanies)
            .where(sql`${schema.movieProductionCompanies.companyId} IN (${sql.join(companyIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Get movie details
      const movieIds = [...new Set(movieAssociations.map(a => a.movieId))];
      const movies = movieIds.length > 0
        ? await db.select({
            id: schema.movies.id,
            originalTitle: schema.movies.originalTitle,
          })
            .from(schema.movies)
            .where(sql`${schema.movies.id} IN (${sql.join(movieIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      const movieTranslations = movieIds.length > 0
        ? await db.select()
            .from(schema.movieTranslations)
            .where(sql`${schema.movieTranslations.movieId} IN (${sql.join(movieIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      
      // Build response
      const companiesWithTranslations = allCompanies.map(company => {
        const companyTranslations = translations.filter(t => t.companyId === company.id);
        
        const name: Record<string, string> = {};
        for (const trans of companyTranslations) {
          name[trans.language] = trans.name;
        }
        
        // Get movies for this company
        const companyMovieIds = movieAssociations
          .filter(a => a.companyId === company.id)
          .map(a => a.movieId);
        
        const companyMovies = movies
          .filter(m => companyMovieIds.includes(m.id))
          .map(movie => {
            const movieTrans = movieTranslations.filter(t => t.movieId === movie.id);
            const movieName: Record<string, string> = {};
            for (const trans of movieTrans) {
              movieName[trans.language] = trans.title;
            }
            
            return {
              id: movie.id,
              title: Object.keys(movieName).length > 0 ? movieName : { en: movie.originalTitle },
            };
          });
        
        return {
          id: company.id,
          name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
          logo_path: company.logoPath,
          custom_logo_url: company.customLogoUrl,
          origin_country: company.originCountry,
          movies: companyMovies,
        };
      });
      
      return { companies: companiesWithTranslations };
    } catch (error) {
      fastify.log.error(error);
      throw error;
    }
  });

  // Get production company by ID
  fastify.get<{ Params: { id: string } }>('/production-companies/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const companyId = parseInt(id);
      
      const [company] = await db.select()
        .from(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, companyId));
      
      if (!company) {
        return sendNotFound(reply, 'Production company not found');
      }
      
      // Get translations
      const translations = await db.select()
        .from(schema.productionCompanyTranslations)
        .where(eq(schema.productionCompanyTranslations.companyId, companyId));
      
      const name: Record<string, string> = {};
      for (const trans of translations) {
        name[trans.language] = trans.name;
      }
      
      // Get movies for this company
      const movieAssociations = await db.select()
        .from(schema.movieProductionCompanies)
        .where(eq(schema.movieProductionCompanies.companyId, companyId));
      
      const movieIds = movieAssociations.map(m => m.movieId);
      
      let movies: any[] = [];
      if (movieIds.length > 0) {
        const movieData = await db.select()
          .from(schema.movies)
          .where(sql`${schema.movies.id} IN (${sql.join(movieIds.map(id => sql`${id}`), sql`, `)})`);
        
        const movieTranslations = await db.select()
          .from(schema.movieTranslations)
          .where(sql`${schema.movieTranslations.movieId} IN (${sql.join(movieIds.map(id => sql`${id}`), sql`, `)})`);
        
        movies = movieData.map(movie => {
          const trans = movieTranslations.filter(t => t.movieId === movie.id);
          const title: Record<string, string> = {};
          for (const t of trans) {
            title[t.language] = t.title;
          }
          return {
            id: movie.id,
            title,
            poster_path: movie.posterPath,
            release_date: movie.releaseDate,
          };
        });
      }
      
      return {
        id: company.id,
        slug: company.slug,
        name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
        logo_path: company.logoPath,
        custom_logo_url: company.customLogoUrl,
        website_url: company.websiteUrl,
        origin_country: company.originCountry,
        movies,
      };
    } catch (error) {
      fastify.log.error(error);
      throw error;
    }
  });

  // Create production company
  fastify.post<{
    Body: {
      id?: number; // Optional - for TMDB imports
      name: { en: string; lo?: string };
      slug?: string;
      logo_path?: string;
      custom_logo_url?: string;
      website_url?: string;
      origin_country?: string;
    }
  }>('/production-companies', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id, name, slug, logo_path, custom_logo_url, website_url, origin_country } = request.body;
      
      // Validate English name is provided
      if (!name || !name.en) {
        return sendBadRequest(reply, 'English name is required');
      }
      
      // Generate ID for manual entries (negative to distinguish from TMDB)
      let companyId = id;
      if (!companyId) {
        const [minId] = await db.select({ min: sql<number>`COALESCE(MIN(id), 0)` })
          .from(schema.productionCompanies);
        companyId = Math.min(minId?.min || 0, 0) - 1;
      }
      
      // Insert company
      await db.insert(schema.productionCompanies).values({
        id: companyId,
        slug: slug || null,
        logoPath: logo_path || null,
        customLogoUrl: custom_logo_url || null,
        websiteUrl: website_url || null,
        originCountry: origin_country || null,
      });
      
      // Insert translations
      await db.insert(schema.productionCompanyTranslations).values({
        companyId,
        language: 'en',
        name: name.en,
      });
      
      if (name.lo) {
        await db.insert(schema.productionCompanyTranslations).values({
          companyId,
          language: 'lo',
          name: name.lo,
        });
      }
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'create',
        'production_company',
        String(companyId),
        name.en,
        {
          company_id: { before: null, after: companyId },
          name_en: { before: null, after: name.en },
          name_lo: { before: null, after: name.lo || null },
          origin_country: { before: null, after: origin_country || null },
        }
      );

      return sendCreated(reply, {
        id: companyId,
        name,
        slug,
        logo_path,
        custom_logo_url,
        website_url,
        origin_country,
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to create production company');
    }
  });

  // Update production company
  fastify.patch<{
    Params: { id: string };
    Body: {
      name?: { en?: string; lo?: string };
      slug?: string;
      logo_path?: string;
      custom_logo_url?: string;
      website_url?: string;
      origin_country?: string;
    }
  }>('/production-companies/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const companyId = parseInt(id);
      const { name, slug, logo_path, custom_logo_url, website_url, origin_country } = request.body;
      
      // Check if company exists
      const [existing] = await db.select()
        .from(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, companyId));
      
      if (!existing) {
        return sendNotFound(reply, 'Production company not found');
      }
      
      // Get existing translations for change tracking
      const existingTranslations = await db.select()
        .from(schema.productionCompanyTranslations)
        .where(eq(schema.productionCompanyTranslations.companyId, companyId));
      
      const beforeState: Record<string, any> = {
        slug: existing.slug,
        logo_path: existing.logoPath,
        custom_logo_url: existing.customLogoUrl,
        website_url: existing.websiteUrl,
        origin_country: existing.originCountry,
        name_en: existingTranslations.find(t => t.language === 'en')?.name,
        name_lo: existingTranslations.find(t => t.language === 'lo')?.name,
      };
      
      // Update company fields
      const updates: any = { updatedAt: new Date() };
      if (slug !== undefined) updates.slug = slug || null;
      if (logo_path !== undefined) updates.logoPath = logo_path;
      if (custom_logo_url !== undefined) updates.customLogoUrl = custom_logo_url;
      if (website_url !== undefined) updates.websiteUrl = website_url;
      if (origin_country !== undefined) updates.originCountry = origin_country;
      
      await db.update(schema.productionCompanies)
        .set(updates)
        .where(eq(schema.productionCompanies.id, companyId));
      
      // Update translations
      if (name?.en) {
        await db.insert(schema.productionCompanyTranslations)
          .values({ companyId, language: 'en', name: name.en })
          .onConflictDoUpdate({
            target: [schema.productionCompanyTranslations.companyId, schema.productionCompanyTranslations.language],
            set: { name: name.en, updatedAt: new Date() },
          });
      }
      
      if (name?.lo) {
        await db.insert(schema.productionCompanyTranslations)
          .values({ companyId, language: 'lo', name: name.lo })
          .onConflictDoUpdate({
            target: [schema.productionCompanyTranslations.companyId, schema.productionCompanyTranslations.language],
            set: { name: name.lo, updatedAt: new Date() },
          });
      }
      
      // Get updated company with translations
      const translations = await db.select()
        .from(schema.productionCompanyTranslations)
        .where(eq(schema.productionCompanyTranslations.companyId, companyId));
      
      const updatedName: Record<string, string> = {};
      for (const trans of translations) {
        updatedName[trans.language] = trans.name;
      }
      
      const [updatedCompany] = await db.select()
        .from(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, companyId));
      
      // Build after state and log changes
      const afterState: Record<string, any> = {
        slug: slug !== undefined ? slug : beforeState.slug,
        logo_path: logo_path !== undefined ? logo_path : beforeState.logo_path,
        custom_logo_url: custom_logo_url !== undefined ? custom_logo_url : beforeState.custom_logo_url,
        website_url: website_url !== undefined ? website_url : beforeState.website_url,
        origin_country: origin_country !== undefined ? origin_country : beforeState.origin_country,
        name_en: name?.en ?? beforeState.name_en,
        name_lo: name?.lo ?? beforeState.name_lo,
      };
      
      const changes = createChangesObject(beforeState, afterState);
      
      await logAuditFromRequest(
        request,
        'update',
        'production_company',
        String(companyId),
        updatedName.en || updatedName.lo || 'Unknown',
        Object.keys(changes).length > 0 ? changes : undefined
      );

      return {
        id: companyId,
        slug: updatedCompany.slug,
        name: updatedName,
        logo_path: updatedCompany.logoPath,
        custom_logo_url: updatedCompany.customLogoUrl,
        website_url: updatedCompany.websiteUrl,
        origin_country: updatedCompany.originCountry,
      };
    } catch (error) {
      fastify.log.error(error);
      throw error;
    }
  });

  // Delete production company
  fastify.delete<{ Params: { id: string } }>('/production-companies/:id', { preHandler: [requireEditorOrAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const companyId = parseInt(id);
      
      const [existing] = await db.select()
        .from(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, companyId));
      
      if (!existing) {
        return sendNotFound(reply, 'Production company not found');
      }
      
      // Get name for audit log before deletion
      const translations = await db.select()
        .from(schema.productionCompanyTranslations)
        .where(eq(schema.productionCompanyTranslations.companyId, companyId));
      const companyName = translations.find(t => t.language === 'en')?.name || 'Unknown';
      
      // Delete company (cascade will delete translations and movie associations)
      await db.delete(schema.productionCompanies)
        .where(eq(schema.productionCompanies.id, companyId));
      
      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'production_company',
        String(companyId),
        companyName,
        {
          company_id: { before: companyId, after: null },
          name_en: { before: companyName, after: null },
        }
      );
      
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      throw error;
    }
  });

  // Search production companies (convenience endpoint)
  fastify.get<{ Querystring: { q: string; limit?: string } }>('/production-companies/search', async (request) => {
    const { q, limit = '10' } = request.query;
    
    if (!q || q.trim().length < 2) {
      return { companies: [] };
    }
    
    const searchPattern = `%${q.trim()}%`;
    const searchResults = await db.select({ companyId: schema.productionCompanyTranslations.companyId })
      .from(schema.productionCompanyTranslations)
      .where(sql`${schema.productionCompanyTranslations.name} ILIKE ${searchPattern}`)
      .limit(parseInt(limit));
    
    const companyIds = [...new Set(searchResults.map(r => r.companyId))];
    
    if (companyIds.length === 0) {
      return { companies: [] };
    }
    
    const companies = await db.select()
      .from(schema.productionCompanies)
      .where(sql`${schema.productionCompanies.id} IN (${sql.join(companyIds.map(id => sql`${id}`), sql`, `)})`);
    
    const translations = await db.select()
      .from(schema.productionCompanyTranslations)
      .where(sql`${schema.productionCompanyTranslations.companyId} IN (${sql.join(companyIds.map(id => sql`${id}`), sql`, `)})`);
    
    const result = companies.map(company => {
      const companyTrans = translations.filter(t => t.companyId === company.id);
      const name: Record<string, string> = {};
      for (const trans of companyTrans) {
        name[trans.language] = trans.name;
      }
      return {
        id: company.id,
        name: Object.keys(name).length > 0 ? name : { en: 'Unknown' },
        logo_path: company.logoPath,
        origin_country: company.originCountry,
      };
    });
    
    return { companies: result };
  });
}
