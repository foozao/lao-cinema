/**
 * Centralized Subtitle Language Configuration
 * 
 * This file contains all available subtitle language options.
 * Uncomment languages to make them available throughout the application.
 */

export interface SubtitleLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export interface SubtitleLanguageOption {
  value: string;
  labelKey: string;
}

/**
 * Full list of subtitle languages with native names
 * Used in admin subtitle manager
 */
export const SUBTITLE_LANGUAGES: readonly SubtitleLanguage[] = [
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'en', name: 'English', nativeName: 'English' },
  // Uncomment below to add more language options:
  // { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  // { code: 'zh', name: 'Chinese', nativeName: '中文' },
  // { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  // { code: 'ko', name: 'Korean', nativeName: '한국어' },
  // { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  // { code: 'fr', name: 'French', nativeName: 'Français' },
  // { code: 'es', name: 'Spanish', nativeName: 'Español' },
  // { code: 'de', name: 'German', nativeName: 'Deutsch' },
  // { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  // { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  // { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  // { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  // { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  // { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  // { code: 'my', name: 'Burmese', nativeName: 'မြန်မာဘာသာ' },
  // { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ' },
] as const;

/**
 * Simplified language options for user preference settings
 * Used in profile settings dropdown
 * Includes "none" option for no preference
 */
export const SUBTITLE_LANGUAGE_OPTIONS: readonly SubtitleLanguageOption[] = [
  { value: '', labelKey: 'none' },
  { value: 'en', labelKey: 'english' },
  { value: 'lo', labelKey: 'lao' },
  // Uncomment below to add more language options:
  // { value: 'th', labelKey: 'thai' },
  // { value: 'zh', labelKey: 'chinese' },
  // { value: 'ja', labelKey: 'japanese' },
  // { value: 'ko', labelKey: 'korean' },
  // { value: 'vi', labelKey: 'vietnamese' },
  // { value: 'fr', labelKey: 'french' },
  // { value: 'es', labelKey: 'spanish' },
] as const;
