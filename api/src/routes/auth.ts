/**
 * Authentication Routes - Aggregates all auth-related routes
 * 
 * Split into separate files for maintainability:
 * - auth-registration.ts: User registration
 * - auth-session.ts: Login, logout, session management
 * - auth-profile.ts: Profile CRUD operations
 * - auth-password-reset.ts: Forgot password flow
 * - auth-email-verification.ts: Email verification flow
 * 
 * Designed to be extensible for OAuth providers (Google, Apple).
 */

import { FastifyInstance } from 'fastify';
import authRegistrationRoutes from './auth-registration.js';
import authSessionRoutes from './auth-session.js';
import authProfileRoutes from './auth-profile.js';
import authPasswordResetRoutes from './auth-password-reset.js';
import authEmailVerificationRoutes from './auth-email-verification.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register all auth sub-routes
  await fastify.register(authRegistrationRoutes);
  await fastify.register(authSessionRoutes);
  await fastify.register(authProfileRoutes);
  await fastify.register(authPasswordResetRoutes);
  await fastify.register(authEmailVerificationRoutes);
}
