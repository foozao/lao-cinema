// Movie routes - Composition module
// This file composes all movie-related routes from separate modules
// for better maintainability and code organization.
//
// Route modules:
// - movie-crud.ts: GET all, GET by ID, POST create, DELETE
// - movie-update.ts: PUT update
// - movie-cast.ts: Add/remove cast members
// - movie-crew.ts: Add/remove crew members
// - movie-images.ts: Set primary image

import { FastifyInstance } from 'fastify';
import movieCrudRoutes from './movie-crud.js';
import movieUpdateRoutes from './movie-update.js';
import movieCastRoutes from './movie-cast.js';
import movieCrewRoutes from './movie-crew.js';
import movieImageRoutes from './movie-images.js';
import movieAccoladesRoutes from './movie-accolades.js';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';

export default async function movieRoutes(fastify: FastifyInstance) {
  // Register all movie routes from sub-modules
  // Using direct calls instead of fastify.register to avoid prefix duplication
  await movieCrudRoutes(fastify);
  await movieUpdateRoutes(fastify);
  await movieCastRoutes(fastify);
  await movieCrewRoutes(fastify);
  await movieImageRoutes(fastify);
  await movieAccoladesRoutes(fastify);
}

// Re-export schemas for backwards compatibility
export * from '../lib/movie-schemas.js';
