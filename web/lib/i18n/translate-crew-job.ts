import { getCrewJobTranslationKey } from './crew-translations';

/**
 * Translate a crew job title using the translation function
 * Falls back to the original job title if no translation exists
 */
export function translateCrewJob(
  job: string,
  t: (key: string) => string
): string {
  const translationKey = getCrewJobTranslationKey(job);
  
  if (translationKey) {
    return t(translationKey);
  }
  
  // Return original job title if no translation exists
  return job;
}
