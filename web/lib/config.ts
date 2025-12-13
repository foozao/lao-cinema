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
