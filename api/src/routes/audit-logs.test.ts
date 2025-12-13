/**
 * Audit Logs Tests
 * 
 * Tests the createChangesObject helper function for change tracking.
 * Route tests are skipped due to test infrastructure limitations with schema re-exports.
 */

import { describe, it, expect } from 'vitest';
import { createChangesObject } from '../lib/audit-service.js';

// =============================================================================
// UNIT TESTS FOR createChangesObject
// =============================================================================

describe('createChangesObject', () => {
  it('should detect changed fields', () => {
    const before = { name: 'Old', age: 30 };
    const after = { name: 'New', age: 30 };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({
      name: { before: 'Old', after: 'New' },
    });
  });

  it('should detect added fields', () => {
    const before = { name: 'Test' };
    const after = { name: 'Test', description: 'New description' };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({
      description: { before: undefined, after: 'New description' },
    });
  });

  it('should detect removed fields', () => {
    const before = { name: 'Test', description: 'Old description' };
    const after = { name: 'Test' };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({
      description: { before: 'Old description', after: undefined },
    });
  });

  it('should return empty object when nothing changed', () => {
    const before = { name: 'Test', age: 30 };
    const after = { name: 'Test', age: 30 };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({});
  });

  it('should handle null values', () => {
    const before = { name: 'Test', bio: null };
    const after = { name: 'Test', bio: 'New bio' };
    
    const changes = createChangesObject(before, after);
    
    expect(changes).toEqual({
      bio: { before: null, after: 'New bio' },
    });
  });

  it('should handle multiple changes', () => {
    const before = { 
      title_en: 'Old Title',
      title_lo: 'ຊື່ເກົ່າ',
      runtime: 90,
      adult: false,
    };
    const after = {
      title_en: 'New Title',
      title_lo: 'ຊື່ໃໝ່',
      runtime: 120,
      adult: false,
    };
    
    const changes = createChangesObject(before, after);
    
    expect(Object.keys(changes).length).toBe(3);
    expect(changes.title_en).toEqual({ before: 'Old Title', after: 'New Title' });
    expect(changes.title_lo).toEqual({ before: 'ຊື່ເກົ່າ', after: 'ຊື່ໃໝ່' });
    expect(changes.runtime).toEqual({ before: 90, after: 120 });
    expect(changes.adult).toBeUndefined(); // No change
  });
});
