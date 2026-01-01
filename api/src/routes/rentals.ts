// Rentals routes - Aggregates all rental-related routes
// Split into separate files for maintainability:
// - rental-crud.ts: Basic CRUD (list all, get by movie, create movie rental)
// - rental-packs.ts: Pack rentals (access check, get/create pack, position update)
// - rental-migration.ts: Anonymous → authenticated migration

import { FastifyInstance } from 'fastify';
import rentalCrudRoutes from './rental-crud.js';
import rentalPackRoutes from './rental-packs.js';
import rentalMigrationRoutes from './rental-migration.js';

export default async function rentalRoutes(fastify: FastifyInstance) {
  // Order matters: pack routes must be registered before crud routes
  // because /rentals/packs/:packId must match before /rentals/:movieId
  await fastify.register(rentalPackRoutes);
  await fastify.register(rentalMigrationRoutes);
  await fastify.register(rentalCrudRoutes);
}
