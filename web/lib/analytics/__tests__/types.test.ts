import { describe, it, expect } from '@jest/globals';
import {
  PROGRESS_INTERVAL_MS,
  COMPLETION_THRESHOLD,
} from '../types';

describe('Analytics Types and Constants', () => {
  describe('PROGRESS_INTERVAL_MS', () => {
    it('should be 30 seconds in milliseconds', () => {
      expect(PROGRESS_INTERVAL_MS).toBe(30000);
    });
  });

  describe('COMPLETION_THRESHOLD', () => {
    it('should be 90%', () => {
      expect(COMPLETION_THRESHOLD).toBe(0.9);
    });
  });
});
