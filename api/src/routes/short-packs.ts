// Short Packs routes - Aggregates all short pack-related routes
//
// Split into separate files for maintainability:
// - short-pack-crud.ts: Create, Read, Update, Delete operations
// - short-pack-items.ts: Manage shorts within a pack (add, remove, reorder)
// - short-pack-context.ts: Get pack info for movies and playback context

import { FastifyInstance } from 'fastify';
import shortPackCrudRoutes from './short-pack-crud.js';
import shortPackItemsRoutes from './short-pack-items.js';
import shortPackContextRoutes from './short-pack-context.js';

export default async function shortPackRoutes(fastify: FastifyInstance) {
  // Register all short pack sub-routes
  await fastify.register(shortPackCrudRoutes);
  await fastify.register(shortPackItemsRoutes);
  await fastify.register(shortPackContextRoutes);
}
