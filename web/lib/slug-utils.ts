/**
 * Slug validation and generation utilities
 */

/**
 * Validates if a slug is in the correct format:
 * - Lowercase letters (a-z)
 * - Numbers (0-9)
 * - Hyphens (-)
 * - No spaces or special characters
 * - Cannot start or end with a hyphen
 * - Minimum 1 character, maximum 100 characters
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length === 0 || slug.length > 100) {
    return false;
  }
  
  // Must be lowercase alphanumeric with hyphens only
  // Cannot start or end with hyphen
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * Generates a URL-friendly slug from a string
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Trims hyphens from start/end
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove hyphens from start and end
    .replace(/^-+|-+$/g, '')
    // Limit to 100 characters
    .substring(0, 100);
}

/**
 * Sanitizes a slug input by converting it to valid format
 * More lenient than generateSlug - preserves hyphens for manual editing
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Limit to 100 characters
    .substring(0, 100);
}

/**
 * Get validation error message for a slug
 */
export function getSlugValidationError(slug: string): string | null {
  if (!slug) {
    return null; // Empty is allowed (optional field)
  }
  
  if (slug.length > 100) {
    return 'Slug must be 100 characters or less';
  }
  
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return 'Slug cannot start or end with a hyphen';
  }
  
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return 'Slug can only contain lowercase letters, numbers, and hyphens';
  }
  
  if (/--/.test(slug)) {
    return 'Slug cannot contain consecutive hyphens';
  }
  
  if (!/[a-z0-9]/.test(slug)) {
    return 'Slug must contain at least one letter or number';
  }
  
  return null;
}
