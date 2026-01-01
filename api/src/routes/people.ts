// People routes - Aggregates all people-related routes
// Split into separate files for maintainability:
// - people-crud.ts: Basic CRUD (list/search, get by ID, create, update, delete)
// - people-merge.ts: Merge duplicate people entries

import { FastifyInstance } from 'fastify';
import peopleCrudRoutes from './people-crud.js';
import peopleMergeRoutes from './people-merge.js';

export default async function peopleRoutes(fastify: FastifyInstance) {
  // Order matters: merge route must be registered before crud routes
  // because /people/merge must match before /people/:id
  await fastify.register(peopleMergeRoutes);
  await fastify.register(peopleCrudRoutes);
}
