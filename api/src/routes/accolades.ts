// Accolades routes - Aggregates all accolade-related routes
// Split into separate files for maintainability:
// - accolade-events.ts: Accolade event CRUD
// - accolade-editions.ts: Accolade edition CRUD
// - accolade-categories.ts: Accolade category CRUD (competitive awards)
// - accolade-sections.ts: Accolade section CRUD (festival program tracks)
// - accolade-nominations.ts: Accolade nomination CRUD + winners

import { FastifyInstance } from 'fastify';
import accoladeEventsRoutes from './accolade-events.js';
import accoladeEditionsRoutes from './accolade-editions.js';
import accoladeCategoriesRoutes from './accolade-categories.js';
import accoladeSectionsRoutes from './accolade-sections.js';
import accoladeNominationsRoutes from './accolade-nominations.js';

export default async function accoladesRoutes(fastify: FastifyInstance) {
  // Register all accolade sub-routes
  await fastify.register(accoladeEventsRoutes);
  await fastify.register(accoladeEditionsRoutes);
  await fastify.register(accoladeCategoriesRoutes);
  await fastify.register(accoladeSectionsRoutes);
  await fastify.register(accoladeNominationsRoutes);
}
