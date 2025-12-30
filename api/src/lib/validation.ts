/**
 * Validation Schemas and Utilities
 * 
 * Centralized Zod schemas for consistent input validation across all routes.
 * Provides type-safe validation with detailed error messages.
 */

import { z, ZodError, ZodSchema } from 'zod';
import { FastifyReply } from 'fastify';

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * UUID string validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Non-empty string
 */
export const nonEmptyString = z.string().min(1, 'This field cannot be empty');

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email format').toLowerCase();

/**
 * Password validation - minimum 8 characters
 */
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

/**
 * Localized text - object with language keys (en, lo)
 */
export const localizedTextSchema = z.record(z.string(), z.string()).refine(
  (val) => Object.keys(val).length > 0,
  'At least one translation is required'
);

/**
 * Optional localized text
 */
export const optionalLocalizedTextSchema = z.record(z.string(), z.string()).optional();

/**
 * Positive integer
 */
export const positiveInt = z.number().int().positive('Must be a positive integer');

/**
 * Non-negative integer (0 or greater)
 */
export const nonNegativeInt = z.number().int().nonnegative('Must be zero or a positive integer');

/**
 * Non-negative number (including decimals)
 */
export const nonNegativeNumber = z.number().nonnegative('Must be zero or positive');

/**
 * Boolean string from query params ('true' or 'false')
 */
export const booleanString = z.enum(['true', 'false']).optional().transform(val => val === 'true');

/**
 * Pagination query params
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// =============================================================================
// ROUTE-SPECIFIC SCHEMAS
// =============================================================================

// --- Auth Schemas ---

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: emailSchema.optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: nonEmptyString,
  newPassword: passwordSchema,
});

// --- Watch Progress Schemas ---

export const updateWatchProgressSchema = z.object({
  progressSeconds: nonNegativeNumber,
  durationSeconds: nonNegativeNumber.refine(val => val > 0, 'Duration must be greater than 0'),
  completed: z.boolean().optional(),
});

// --- Rental Schemas ---

export const createRentalSchema = z.object({
  transactionId: nonEmptyString,
  amount: positiveInt.optional().default(500),
  paymentMethod: z.string().optional().default('demo'),
});

export const updatePackPositionSchema = z.object({
  currentShortId: uuidSchema,
});

// --- Video Token Schemas ---

export const videoTokenRequestSchema = z.object({
  movieId: uuidSchema,
  videoSourceId: uuidSchema,
});

// --- Migration Schemas ---

export const migrationSchema = z.object({
  anonymousId: nonEmptyString,
});

// --- Genre Schemas ---

export const createGenreSchema = z.object({
  tmdbId: z.number().int().optional(),
  name: localizedTextSchema,
  isVisible: z.boolean().optional().default(true),
});

export const updateGenreSchema = z.object({
  name: localizedTextSchema.optional(),
  isVisible: z.boolean().optional(),
});

// --- Movie Genre Schemas ---

export const setMovieGenresSchema = z.object({
  genreIds: z.array(z.string()),
});

// --- Homepage Schemas ---

export const updateFeaturedSchema = z.object({
  movieIds: z.array(uuidSchema),
});

// --- Notifications Schemas ---

export const notificationSubscribeSchema = z.object({
  email: emailSchema.optional(),
});

// --- People Schemas ---

export const createPersonSchema = z.object({
  name: localizedTextSchema,
  tmdbId: z.number().int().optional(),
  profilePath: z.string().optional(),
  biography: optionalLocalizedTextSchema,
  birthdate: z.string().optional(),
  deathdate: z.string().optional(),
  placeOfBirth: z.string().optional(),
  knownForDepartment: z.string().optional(),
});

export const updatePersonSchema = createPersonSchema.partial();

// --- Trailer Schemas ---

export const createTrailerSchema = z.object({
  movieId: uuidSchema,
  type: z.enum(['youtube', 'vimeo', 'url']),
  key: nonEmptyString,
  name: optionalLocalizedTextSchema,
  language: z.string().optional().default('en'),
  official: z.boolean().optional().default(true),
  publishedAt: z.string().optional(),
});

export const updateTrailerSchema = createTrailerSchema.partial().omit({ movieId: true });

// --- Short Pack Schemas ---

export const createShortPackSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  title: localizedTextSchema,
  description: optionalLocalizedTextSchema,
  price: positiveInt,
  currency: z.string().length(3).default('USD'),
  thumbnailPath: z.string().optional(),
  backdropPath: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateShortPackSchema = createShortPackSchema.partial();

// --- Award Schemas ---

export const createAwardShowSchema = z.object({
  name: localizedTextSchema,
  shortName: z.string().optional(),
  country: z.string().optional(),
  description: optionalLocalizedTextSchema,
  websiteUrl: z.string().url().optional(),
  logoPath: z.string().optional(),
});

export const updateAwardShowSchema = createAwardShowSchema.partial();

export const createAwardEditionSchema = z.object({
  awardShowId: uuidSchema,
  year: z.number().int().min(1900).max(2100),
  edition: z.number().int().positive().optional(),
  ceremonyDate: z.string().optional(),
  location: z.string().optional(),
});

export const updateAwardEditionSchema = createAwardEditionSchema.partial().omit({ awardShowId: true });

export const createAwardCategorySchema = z.object({
  awardShowId: uuidSchema,
  name: localizedTextSchema,
  description: optionalLocalizedTextSchema,
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const updateAwardCategorySchema = createAwardCategorySchema.partial().omit({ awardShowId: true });

export const createAwardNominationSchema = z.object({
  editionId: uuidSchema,
  categoryId: uuidSchema,
  movieId: uuidSchema.optional(),
  personId: uuidSchema.optional(),
  isWinner: z.boolean().optional().default(false),
  notes: optionalLocalizedTextSchema,
});

export const updateAwardNominationSchema = createAwardNominationSchema.partial();

// --- Production Company Schemas ---

export const createProductionCompanySchema = z.object({
  name: z.string().min(1).max(200),
  logoPath: z.string().optional(),
  originCountry: z.string().length(2).optional(),
  tmdbId: z.number().int().optional(),
});

export const updateProductionCompanySchema = createProductionCompanySchema.partial();

// --- Subtitle Schemas ---

export const createSubtitleSchema = z.object({
  movieId: uuidSchema,
  language: z.string().min(2).max(10),
  label: z.string().min(1).max(100),
  url: z.string().url(),
  format: z.enum(['vtt', 'srt', 'ass']).optional().default('vtt'),
  isDefault: z.boolean().optional().default(false),
});

export const updateSubtitleSchema = createSubtitleSchema.partial().omit({ movieId: true });

// --- Upload Schemas ---

export const uploadQuerySchema = z.object({
  type: z.enum(['poster', 'backdrop', 'profile', 'logo', 'thumbnail', 'general']),
});

// --- Path Parameter Schemas ---

export const movieIdParamSchema = z.object({
  movieId: uuidSchema,
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const packIdParamSchema = z.object({
  packId: uuidSchema,
});

// =============================================================================
// VALIDATION HELPER
// =============================================================================

/**
 * Format Zod errors into a user-friendly message
 */
export function formatZodErrors(error: ZodError): string {
  return error.errors.map(e => {
    const path = e.path.join('.');
    return path ? `${path}: ${e.message}` : e.message;
  }).join('; ');
}

/**
 * Validate request body with Zod schema and return parsed data or send error response
 * @returns Parsed data if valid, undefined if error response was sent
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
  reply: FastifyReply
): T | undefined {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    reply.status(400).type('application/problem+json').send({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: formatZodErrors(result.error),
      errors: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return undefined;
  }
  
  return result.data;
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  query: unknown,
  reply: FastifyReply
): T | undefined {
  const result = schema.safeParse(query);
  
  if (!result.success) {
    reply.status(400).type('application/problem+json').send({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: `Invalid query parameters: ${formatZodErrors(result.error)}`,
      errors: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return undefined;
  }
  
  return result.data;
}

/**
 * Validate path parameters with Zod schema
 */
export function validateParams<T>(
  schema: ZodSchema<T>,
  params: unknown,
  reply: FastifyReply
): T | undefined {
  const result = schema.safeParse(params);
  
  if (!result.success) {
    reply.status(400).type('application/problem+json').send({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: `Invalid path parameters: ${formatZodErrors(result.error)}`,
      errors: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return undefined;
  }
  
  return result.data;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateWatchProgressInput = z.infer<typeof updateWatchProgressSchema>;
export type CreateRentalInput = z.infer<typeof createRentalSchema>;
export type VideoTokenRequestInput = z.infer<typeof videoTokenRequestSchema>;
export type CreateGenreInput = z.infer<typeof createGenreSchema>;
export type UpdateGenreInput = z.infer<typeof updateGenreSchema>;
export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type CreateTrailerInput = z.infer<typeof createTrailerSchema>;
export type UpdateTrailerInput = z.infer<typeof updateTrailerSchema>;
export type CreateShortPackInput = z.infer<typeof createShortPackSchema>;
export type UpdateShortPackInput = z.infer<typeof updateShortPackSchema>;
