/**
 * Get the localized name of a language from its ISO 639-1 code
 * @param languageCode - ISO 639-1 language code (e.g., 'en', 'lo', 'th')
 * @param t - Translation function from next-intl
 * @returns Localized language name or the code in uppercase if not found
 */
export function getLanguageName(languageCode: string | undefined, t: (key: string) => string): string {
  if (!languageCode) return '';
  
  const code = languageCode.toLowerCase();
  const key = `languages.${code}`;
  
  try {
    const translated = t(key);
    // If translation key doesn't exist, next-intl returns the key itself
    // In that case, return the uppercase code as fallback
    return translated === key ? code.toUpperCase() : translated;
  } catch {
    return code.toUpperCase();
  }
}
