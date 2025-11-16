// Genre utilities for translation

/**
 * Convert a genre name to a translation key
 * Handles both English names and already-converted keys
 */
export function genreToKey(genreName: string): string {
  // If it's already a camelCase key, return it
  if (genreName && genreName[0] === genreName[0].toLowerCase() && !genreName.includes(' ')) {
    return genreName;
  }

  // Convert "Science Fiction" -> "scienceFiction"
  return genreName
    .split(' ')
    .map((word, index) => 
      index === 0 
        ? word.toLowerCase() 
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

/**
 * Get the translation key for a genre
 * Falls back to the original name if no key is found
 */
export function getGenreKey(genreName: string): string {
  const key = genreToKey(genreName);
  
  // List of valid genre keys
  const validKeys = [
    'action',
    'adventure',
    'animation',
    'comedy',
    'crime',
    'documentary',
    'drama',
    'family',
    'fantasy',
    'history',
    'horror',
    'music',
    'mystery',
    'romance',
    'scienceFiction',
    'thriller',
    'war',
    'western',
  ];

  return validKeys.includes(key) ? key : genreName.toLowerCase();
}
