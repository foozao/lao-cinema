import { Language, LocalizedText } from './types';

/**
 * Get localized text with fallback to English
 * @param text - LocalizedText object
 * @param lang - Preferred language
 * @returns The text in the preferred language, or English fallback
 */
export function getLocalizedText(text: LocalizedText, lang: Language = 'en'): string {
  // If requesting English or Lao is not available, return English
  if (lang === 'en' || !text.lo) {
    return text.en;
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
