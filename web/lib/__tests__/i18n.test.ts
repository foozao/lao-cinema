import { describe, it, expect } from '@jest/globals';
import { getLocalizedText, createLocalizedText } from '../i18n';
import type { LocalizedText } from '../types';

describe('i18n utilities', () => {
  describe('createLocalizedText', () => {
    it('should create LocalizedText with only English', () => {
      const result = createLocalizedText('Hello');
      
      expect(result).toEqual({
        en: 'Hello',
        lo: undefined,
      });
    });

    it('should create LocalizedText with both English and Lao', () => {
      const result = createLocalizedText('Hello', 'ສະບາຍດີ');
      
      expect(result).toEqual({
        en: 'Hello',
        lo: 'ສະບາຍດີ',
      });
    });

    it('should handle empty strings', () => {
      const result = createLocalizedText('', '');
      
      expect(result).toEqual({
        en: '',
        lo: '',
      });
    });
  });

  describe('getLocalizedText', () => {
    const textWithBothLanguages: LocalizedText = {
      en: 'The River',
      lo: 'ແມ່ນ້ຳ',
    };

    const textWithOnlyEnglish: LocalizedText = {
      en: 'The River',
    };

    describe('when requesting English', () => {
      it('should return English text when both languages available', () => {
        const result = getLocalizedText(textWithBothLanguages, 'en');
        expect(result).toBe('The River');
      });

      it('should return English text when only English available', () => {
        const result = getLocalizedText(textWithOnlyEnglish, 'en');
        expect(result).toBe('The River');
      });
    });

    describe('when requesting Lao', () => {
      it('should return Lao text when available', () => {
        const result = getLocalizedText(textWithBothLanguages, 'lo');
        expect(result).toBe('ແມ່ນ້ຳ');
      });

      it('should fallback to English when Lao not available', () => {
        const result = getLocalizedText(textWithOnlyEnglish, 'lo');
        expect(result).toBe('The River');
      });
    });

    describe('default behavior', () => {
      it('should default to English when no language specified', () => {
        const result = getLocalizedText(textWithBothLanguages);
        expect(result).toBe('The River');
      });
    });

    describe('edge cases', () => {
      it('should handle empty Lao string as unavailable', () => {
        const textWithEmptyLao: LocalizedText = {
          en: 'Test',
          lo: '',
        };
        const result = getLocalizedText(textWithEmptyLao, 'lo');
        // Empty string is falsy, so should fallback to English
        expect(result).toBe('Test');
      });

      it('should return Lao text even if it contains special characters', () => {
        const textWithSpecialChars: LocalizedText = {
          en: 'Test',
          lo: 'ທົດສອບ 123 !@#',
        };
        const result = getLocalizedText(textWithSpecialChars, 'lo');
        expect(result).toBe('ທົດສອບ 123 !@#');
      });
    });
  });

  describe('integration', () => {
    it('should work together: create and get text', () => {
      const text = createLocalizedText('Movie Title', 'ຊື່ຮູບເງົາ');
      
      expect(getLocalizedText(text, 'en')).toBe('Movie Title');
      expect(getLocalizedText(text, 'lo')).toBe('ຊື່ຮູບເງົາ');
    });

    it('should maintain fallback behavior through create and get', () => {
      const text = createLocalizedText('Only English');
      
      expect(getLocalizedText(text, 'en')).toBe('Only English');
      expect(getLocalizedText(text, 'lo')).toBe('Only English'); // Fallback
    });
  });
});
