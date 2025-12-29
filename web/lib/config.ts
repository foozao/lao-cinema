// Site configuration
// Easily configurable for different deployment phases

/**
 * The base URL of the site (without trailing slash)
 * Set via NEXT_PUBLIC_SITE_URL environment variable
 * 
 * Alpha/Beta: https://laocinema.com
 * Development: http://localhost:3000
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://laocinema.com';

/**
 * The site domain (without protocol)
 */
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, '');

/**
 * Site name for display purposes
 */
export const SITE_NAME = 'Lao Cinema';

/**
 * The base URL for API requests (without trailing slash)
 * Set via NEXT_PUBLIC_API_URL environment variable
 * 
 * Production: https://api.laocinema.com/api
 * Preview: https://api.preview.laocinema.com/api
 * Development: http://localhost:3001/api
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Text truncation settings
 */
export const TEXT_LIMITS = {
  // Biography truncation (universal - all screen sizes)
  biography: {
    maxLength: 400,
    graceThreshold: 100, // Don't truncate if remaining text is less than this
  },
  // Movie overview truncation (mobile only)
  movieOverview: {
    mobileMaxLength: 200,
    graceThreshold: 50,
  },
  // Hero section synopsis truncation
  heroOverview: {
    maxLength: 300,
    graceThreshold: 50, // Don't truncate if remaining text is less than this
    breakSearchRange: 50, // Look back this many chars for a period or comma to break at
  },
};

/**
 * Runtime threshold (in minutes) to distinguish between short films and feature films.
 * Films with runtime <= this value are considered short films.
 * Films with runtime > this value are considered feature films.
 */
export const SHORT_FILM_THRESHOLD_MINUTES = 40;
