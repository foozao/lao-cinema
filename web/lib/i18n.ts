import { Language, LocalizedText } from './types';

/**
 * Get localized text with fallback to any available language
 * @param text - LocalizedText object
 * @param lang - Preferred language
 * @returns The text in the preferred language, or fallback to any available language
 */
export function getLocalizedText(text: LocalizedText | undefined | null, lang: Language = 'en'): string {
  // Handle undefined or null text
  if (!text) {
    return '';
  }
  
  // Try preferred language first, then fallback to any available
  if (lang === 'en') {
    return text.en || text.lo || '';
  }
  
  // Requesting Lao: try Lao first, fallback to English
  return text.lo || text.en || '';
}

/**
 * Get localized text with a guaranteed non-empty fallback
 * Use this for display names where "Unknown" or similar should show instead of blank
 * @param text - LocalizedText object (can be undefined/null)
 * @param lang - Preferred language
 * @param fallback - Fallback string if no text available (default: 'Unknown')
 * @returns The text in the preferred language, fallback language, or the fallback string
 */
export function getLocalizedName(
  text: LocalizedText | undefined | null,
  lang: Language = 'en',
  fallback: string = 'Unknown'
): string {
  const result = getLocalizedText(text, lang);
  return result || fallback;
}

/**
 * Create a LocalizedText object
 * @param en - English text (required)
 * @param lo - Lao text (optional)
 */
export function createLocalizedText(en: string, lo?: string): LocalizedText {
  return { en, lo };
}

/**
 * Get bilingual name display with both languages when available
 * Displays primary language first based on current locale
 * @param text - LocalizedText object
 * @param lang - Current language
 * @returns Both names if available (primary first), or single name
 */
export function getBilingualName(text: LocalizedText | undefined, lang: Language = 'en'): string {
  // Handle undefined or null text
  if (!text) {
    return '';
  }
  
  const enName = text.en || '';
  const loName = text.lo || '';
  
  // If both names exist and are different, show both
  if (enName && loName && enName !== loName) {
    // Put current language first
    if (lang === 'lo') {
      return `${loName} (${enName})`;
    } else {
      return `${enName} (${loName})`;
    }
  }
  
  // If only one exists or they're the same, return the available one
  return enName || loName;
}
