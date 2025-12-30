/**
 * Tests for Anonymous ID utilities
 */

import { describe, it, expect } from 'vitest';
import {
  generateAnonymousId,
  verifyAnonymousId,
  extractAnonymousId,
  isValidAnonymousId,
} from '../anonymous-id.js';

describe('Anonymous ID', () => {
  describe('generateAnonymousId', () => {
    it('should generate a valid signed anonymous ID', () => {
      const signedId = generateAnonymousId();
      
      expect(signedId).toBeDefined();
      expect(typeof signedId).toBe('string');
      expect(signedId.split('.')).toHaveLength(2);
    });
    
    it('should generate unique IDs', () => {
      const id1 = generateAnonymousId();
      const id2 = generateAnonymousId();
      
      expect(id1).not.toBe(id2);
    });
    
    it('should generate IDs that can be verified', () => {
      const signedId = generateAnonymousId();
      
      expect(() => verifyAnonymousId(signedId)).not.toThrow();
    });
  });
  
  describe('verifyAnonymousId', () => {
    it('should verify a valid anonymous ID', () => {
      const signedId = generateAnonymousId();
      const payload = verifyAnonymousId(signedId);
      
      expect(payload).toBeDefined();
      expect(payload.id).toBeDefined();
      expect(payload.createdAt).toBeDefined();
      expect(payload.expiresAt).toBeDefined();
      expect(payload.expiresAt).toBeGreaterThan(payload.createdAt);
    });
    
    it('should reject invalid format', () => {
      expect(() => verifyAnonymousId('invalid')).toThrow('Invalid anonymous ID format');
    });
    
    it('should reject tampered signature', () => {
      const signedId = generateAnonymousId();
      const [payload] = signedId.split('.');
      const tamperedId = `${payload}.tampered_signature`;
      
      expect(() => verifyAnonymousId(tamperedId)).toThrow('Invalid anonymous ID signature');
    });
    
    it('should reject tampered payload', () => {
      const signedId = generateAnonymousId();
      const [, signature] = signedId.split('.');
      const tamperedId = `tampered_payload.${signature}`;
      
      expect(() => verifyAnonymousId(tamperedId)).toThrow();
    });
    
    it('should set expiration to 90 days', () => {
      const signedId = generateAnonymousId();
      const payload = verifyAnonymousId(signedId);
      
      const expiresInSeconds = payload.expiresAt - payload.createdAt;
      const expiresInDays = expiresInSeconds / (24 * 60 * 60);
      
      expect(expiresInDays).toBe(90);
    });
  });
  
  describe('extractAnonymousId', () => {
    it('should extract the UUID from signed ID', () => {
      const signedId = generateAnonymousId();
      const uuid = extractAnonymousId(signedId);
      
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      // UUID format: 8-4-4-4-12 hex digits
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
    
    it('should throw on invalid signed ID', () => {
      expect(() => extractAnonymousId('invalid')).toThrow();
    });
    
    it('should extract consistent UUID', () => {
      const signedId = generateAnonymousId();
      const uuid1 = extractAnonymousId(signedId);
      const uuid2 = extractAnonymousId(signedId);
      
      expect(uuid1).toBe(uuid2);
    });
  });
  
  describe('isValidAnonymousId', () => {
    it('should return true for valid signed ID', () => {
      const signedId = generateAnonymousId();
      
      expect(isValidAnonymousId(signedId)).toBe(true);
    });
    
    it('should return false for invalid format', () => {
      expect(isValidAnonymousId('invalid')).toBe(false);
    });
    
    it('should return false for tampered signature', () => {
      const signedId = generateAnonymousId();
      const [payload] = signedId.split('.');
      const tamperedId = `${payload}.tampered`;
      
      expect(isValidAnonymousId(tamperedId)).toBe(false);
    });
    
    it('should return false for empty string', () => {
      expect(isValidAnonymousId('')).toBe(false);
    });
  });
  
  describe('Security', () => {
    it('should not allow signature reuse with different payload', () => {
      const signedId1 = generateAnonymousId();
      const signedId2 = generateAnonymousId();
      
      const [payload1] = signedId1.split('.');
      const [, signature2] = signedId2.split('.');
      
      // Try to use signature from ID2 with payload from ID1
      const frankenId = `${payload1}.${signature2}`;
      
      expect(isValidAnonymousId(frankenId)).toBe(false);
    });
    
    it('should include cryptographic randomness', () => {
      const id1 = generateAnonymousId();
      const id2 = generateAnonymousId();
      
      const uuid1 = extractAnonymousId(id1);
      const uuid2 = extractAnonymousId(id2);
      
      // UUIDs should be different due to randomness
      expect(uuid1).not.toBe(uuid2);
    });
  });
});
