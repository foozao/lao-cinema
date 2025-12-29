// Awards routes - Aggregates all award-related routes
// Split into separate files for maintainability:
// - award-shows.ts: Award show CRUD
// - award-editions.ts: Award edition CRUD
// - award-categories.ts: Award category CRUD
// - award-nominations.ts: Award nomination CRUD + winners

import { FastifyInstance } from 'fastify';
import awardShowsRoutes from './award-shows.js';
import awardEditionsRoutes from './award-editions.js';
import awardCategoriesRoutes from './award-categories.js';
import awardNominationsRoutes from './award-nominations.js';

export default async function awardsRoutes(fastify: FastifyInstance) {
  // Register all award sub-routes
  await fastify.register(awardShowsRoutes);
  await fastify.register(awardEditionsRoutes);
  await fastify.register(awardCategoriesRoutes);
  await fastify.register(awardNominationsRoutes);
}
