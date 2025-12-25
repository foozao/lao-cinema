/**
 * Translation Helpers
 * 
 * Utility functions to build LocalizedText objects from translation arrays.
 * Reduces code duplication across routes and services.
 */

/**
 * Build a LocalizedText object from an array of translations.
 * 
 * @param translations - Array of translation records with a language field
 * @param field - The field name to extract from each translation
 * @returns LocalizedText object with language keys
 * 
 * @example
 * const translations = [
 *   { language: 'en', name: 'John', bio: 'Hello' },
 *   { language: 'lo', name: 'ຈອນ', bio: 'ສະບາຍດີ' }
 * ];
 * buildLocalizedText(translations, 'name') // { en: 'John', lo: 'ຈອນ' }
 */
export function buildLocalizedText<T extends { language: string }>(
  translations: T[],
  field: keyof T
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const trans of translations) {
    const value = trans[field];
    if (value !== null && value !== undefined && value !== '') {
      result[trans.language] = String(value);
    }
  }
  return result;
}

/**
 * Build multiple LocalizedText objects from an array of translations.
 * More efficient than calling buildLocalizedText multiple times.
 * 
 * @param translations - Array of translation records with a language field
 * @param fields - Array of field names to extract
 * @returns Object with field names as keys, each containing a LocalizedText object
 * 
 * @example
 * const translations = [
 *   { language: 'en', name: 'John', biography: 'Hello' },
 *   { language: 'lo', name: 'ຈອນ', biography: 'ສະບາຍດີ' }
 * ];
 * buildMultipleLocalizedTexts(translations, ['name', 'biography'])
 * // { name: { en: 'John', lo: 'ຈອນ' }, biography: { en: 'Hello', lo: 'ສະບາຍດີ' } }
 */
export function buildMultipleLocalizedTexts<T extends { language: string }>(
  translations: T[],
  fields: (keyof T)[]
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  
  for (const field of fields) {
    result[field as string] = {};
  }
  
  for (const trans of translations) {
    for (const field of fields) {
      const value = trans[field];
      if (value !== null && value !== undefined && value !== '') {
        result[field as string][trans.language] = String(value);
      }
    }
  }
  
  return result;
}

/**
 * Build LocalizedText objects for person translations (name, biography, nicknames).
 * Special handling for nicknames which is an array field.
 * 
 * @param translations - Array of person translation records
 * @returns Object with name, biography, and nicknames LocalizedText objects
 */
export function buildPersonLocalizedTexts<T extends { 
  language: string; 
  name: string; 
  biography?: string | null;
  nicknames?: string[] | null;
}>(translations: T[]): {
  name: Record<string, string>;
  biography: Record<string, string>;
  nicknames: Record<string, string[]>;
} {
  const name: Record<string, string> = {};
  const biography: Record<string, string> = {};
  const nicknames: Record<string, string[]> = {};
  
  for (const trans of translations) {
    name[trans.language] = trans.name;
    if (trans.biography) {
      biography[trans.language] = trans.biography;
    }
    if (trans.nicknames && trans.nicknames.length > 0) {
      nicknames[trans.language] = trans.nicknames;
    }
  }
  
  return { name, biography, nicknames };
}

/**
 * Check if a LocalizedText object has any content.
 * 
 * @param text - LocalizedText object to check
 * @returns true if object has at least one non-empty value
 */
export function hasLocalizedContent(text: Record<string, string | string[] | undefined>): boolean {
  return Object.keys(text).length > 0;
}

/**
 * Return LocalizedText object or undefined if empty.
 * Useful for API responses where we don't want empty objects.
 * 
 * @param text - LocalizedText object to check
 * @returns The object if it has content, undefined otherwise
 */
export function localizedOrUndefined<T extends Record<string, unknown>>(text: T): T | undefined {
  return Object.keys(text).length > 0 ? text : undefined;
}

/**
 * Build LocalizedText with a fallback value if empty.
 * 
 * @param text - LocalizedText object
 * @param fallback - Fallback value if text is empty
 * @returns The text object or fallback object
 */
export function localizedWithFallback(
  text: Record<string, string>,
  fallback: string
): Record<string, string> {
  return Object.keys(text).length > 0 ? text : { en: fallback };
}
