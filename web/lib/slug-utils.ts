/**
 * Slug validation and generation utilities
 */

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
