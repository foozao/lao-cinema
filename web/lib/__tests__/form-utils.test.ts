/**
 * Form Utilities Tests
 * 
 * Unit tests for form change detection and state management utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  hasObjectChanged,
  hasFormDataChanged,
  hasAnyChanged,
  hasArrayChanged,
  normalizeValue,
  hasStringChanged,
} from '../form-utils';

describe('Form Utilities', () => {
  describe('hasObjectChanged', () => {
    it('should return false for identical objects', () => {
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { name: 'John', age: 30 };
      expect(hasObjectChanged(obj1, obj2)).toBe(false);
    });

    it('should return true when values differ', () => {
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { name: 'Jane', age: 30 };
      expect(hasObjectChanged(obj1, obj2)).toBe(true);
    });

    it('should return false for deeply nested identical objects', () => {
      const obj1 = { user: { name: 'John', address: { city: 'NYC' } } };
      const obj2 = { user: { name: 'John', address: { city: 'NYC' } } };
      expect(hasObjectChanged(obj1, obj2)).toBe(false);
    });

    it('should return true for deeply nested different objects', () => {
      const obj1 = { user: { name: 'John', address: { city: 'NYC' } } };
      const obj2 = { user: { name: 'John', address: { city: 'LA' } } };
      expect(hasObjectChanged(obj1, obj2)).toBe(true);
    });

    it('should handle empty objects', () => {
      expect(hasObjectChanged({}, {})).toBe(false);
    });

    it('should detect new properties', () => {
      const obj1 = { name: 'John' };
      const obj2 = { name: 'John', age: 30 };
      expect(hasObjectChanged(obj1, obj2)).toBe(true);
    });

    it('should detect removed properties', () => {
      const obj1 = { name: 'John', age: 30 };
      const obj2 = { name: 'John' };
      expect(hasObjectChanged(obj1, obj2)).toBe(true);
    });
  });

  describe('hasFormDataChanged', () => {
    it('should return false when no fields changed', () => {
      const original = { title: 'Movie', year: '2024', rating: '8.5' };
      const current = { title: 'Movie', year: '2024', rating: '8.5' };
      expect(hasFormDataChanged(original, current)).toBe(false);
    });

    it('should return true when one field changed', () => {
      const original = { title: 'Movie', year: '2024', rating: '8.5' };
      const current = { title: 'Updated Movie', year: '2024', rating: '8.5' };
      expect(hasFormDataChanged(original, current)).toBe(true);
    });

    it('should return true when multiple fields changed', () => {
      const original = { title: 'Movie', year: '2024', rating: '8.5' };
      const current = { title: 'Updated', year: '2025', rating: '9.0' };
      expect(hasFormDataChanged(original, current)).toBe(true);
    });

    it('should detect empty string changes', () => {
      const original = { title: 'Movie', description: '' };
      const current = { title: 'Movie', description: 'New description' };
      expect(hasFormDataChanged(original, current)).toBe(true);
    });

    it('should detect number changes', () => {
      const original = { count: 5 };
      const current = { count: 10 };
      expect(hasFormDataChanged(original, current)).toBe(true);
    });

    it('should handle empty objects', () => {
      expect(hasFormDataChanged({}, {})).toBe(false);
    });
  });

  describe('hasAnyChanged', () => {
    it('should return false when all comparisons are false', () => {
      expect(hasAnyChanged([false, false, false])).toBe(false);
    });

    it('should return true when one comparison is true', () => {
      expect(hasAnyChanged([false, true, false])).toBe(true);
    });

    it('should return true when all comparisons are true', () => {
      expect(hasAnyChanged([true, true, true])).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(hasAnyChanged([])).toBe(false);
    });

    it('should handle single comparison', () => {
      expect(hasAnyChanged([true])).toBe(true);
      expect(hasAnyChanged([false])).toBe(false);
    });
  });

  describe('hasArrayChanged', () => {
    it('should return false for identical arrays', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      expect(hasArrayChanged(arr1, arr2)).toBe(false);
    });

    it('should return true when values differ', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 4];
      expect(hasArrayChanged(arr1, arr2)).toBe(true);
    });

    it('should return true when order differs', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [3, 2, 1];
      expect(hasArrayChanged(arr1, arr2)).toBe(true);
    });

    it('should return true when lengths differ', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2];
      expect(hasArrayChanged(arr1, arr2)).toBe(true);
    });

    it('should handle empty arrays', () => {
      expect(hasArrayChanged([], [])).toBe(false);
    });

    it('should handle arrays of objects', () => {
      const arr1 = [{ id: 1, name: 'John' }];
      const arr2 = [{ id: 1, name: 'John' }];
      expect(hasArrayChanged(arr1, arr2)).toBe(false);
    });

    it('should detect object changes in arrays', () => {
      const arr1 = [{ id: 1, name: 'John' }];
      const arr2 = [{ id: 1, name: 'Jane' }];
      expect(hasArrayChanged(arr1, arr2)).toBe(true);
    });

    it('should handle nested arrays', () => {
      const arr1 = [[1, 2], [3, 4]];
      const arr2 = [[1, 2], [3, 4]];
      expect(hasArrayChanged(arr1, arr2)).toBe(false);
    });
  });

  describe('normalizeValue', () => {
    it('should convert null to empty string', () => {
      expect(normalizeValue(null)).toBe('');
    });

    it('should convert undefined to empty string', () => {
      expect(normalizeValue(undefined)).toBe('');
    });

    it('should keep empty string as empty string', () => {
      expect(normalizeValue('')).toBe('');
    });

    it('should keep non-empty string unchanged', () => {
      expect(normalizeValue('Hello')).toBe('Hello');
    });

    it('should handle whitespace strings', () => {
      expect(normalizeValue('   ')).toBe('   ');
    });
  });

  describe('hasStringChanged', () => {
    it('should return false for identical strings', () => {
      expect(hasStringChanged('Hello', 'Hello')).toBe(false);
    });

    it('should return true for different strings', () => {
      expect(hasStringChanged('Hello', 'World')).toBe(true);
    });

    it('should treat null and empty string as same', () => {
      expect(hasStringChanged(null, '')).toBe(false);
      expect(hasStringChanged('', null)).toBe(false);
    });

    it('should treat undefined and empty string as same', () => {
      expect(hasStringChanged(undefined, '')).toBe(false);
      expect(hasStringChanged('', undefined)).toBe(false);
    });

    it('should treat null and undefined as same', () => {
      expect(hasStringChanged(null, undefined)).toBe(false);
    });

    it('should return true when comparing empty to non-empty', () => {
      expect(hasStringChanged('', 'Hello')).toBe(true);
      expect(hasStringChanged(null, 'Hello')).toBe(true);
      expect(hasStringChanged(undefined, 'Hello')).toBe(true);
    });

    it('should return true when comparing non-empty to empty', () => {
      expect(hasStringChanged('Hello', '')).toBe(true);
      expect(hasStringChanged('Hello', null)).toBe(true);
      expect(hasStringChanged('Hello', undefined)).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    it('should detect form changes in edit person scenario', () => {
      const original = {
        nameEn: 'John Doe',
        nameLo: 'ຈອນ ໂດ',
        birthday: '1990-01-01',
        placeOfBirth: 'Vientiane',
      };

      const current = {
        nameEn: 'Jane Doe',
        nameLo: 'ຈອນ ໂດ',
        birthday: '1990-01-01',
        placeOfBirth: 'Vientiane',
      };

      expect(hasFormDataChanged(original, current)).toBe(true);
    });

    it('should detect no changes when form is reverted', () => {
      const original = { title: 'Movie', rating: '8.5' };
      const modified = { title: 'Updated', rating: '8.5' };
      const reverted = { title: 'Movie', rating: '8.5' };

      expect(hasFormDataChanged(original, modified)).toBe(true);
      expect(hasFormDataChanged(original, reverted)).toBe(false);
    });

    it('should handle multiple state comparisons', () => {
      const originalForm = { title: 'Movie' };
      const currentForm = { title: 'Movie' };
      
      const originalCast = [{ id: 1, name: 'Actor' }];
      const currentCast = [{ id: 1, name: 'Actor' }];
      
      const originalPlatforms = ['netflix'];
      const currentPlatforms = ['netflix', 'prime'];

      const hasChanges = hasAnyChanged([
        hasFormDataChanged(originalForm, currentForm),
        hasArrayChanged(originalCast, currentCast),
        hasArrayChanged(originalPlatforms, currentPlatforms),
      ]);

      expect(hasChanges).toBe(true);
    });

    it('should detect cast translation changes', () => {
      const original = {
        '1': { character_en: 'Hero', character_lo: '' },
        '2': { character_en: 'Villain', character_lo: '' },
      };

      const current = {
        '1': { character_en: 'Hero', character_lo: 'ພະເອກ' },
        '2': { character_en: 'Villain', character_lo: '' },
      };

      expect(hasObjectChanged(original, current)).toBe(true);
    });
  });
});
