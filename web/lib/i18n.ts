import { Language, LocalizedText } from './types';

/**
 * Get localized text with fallback to English
 * @param text - LocalizedText object
 * @param lang - Preferred language
 * @returns The text in the preferred language, or English fallback
 */
export function getLocalizedText(text: LocalizedText | undefined, lang: Language = 'en'): string {
  // Handle undefined or null text
  if (!text) {
    return '';
  }
  
  // If requesting English or Lao is not available, return English
  if (lang === 'en' || !text.lo) {
    return text.en || '';
  }
  
  // Return Lao if available
  return text.lo;
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
