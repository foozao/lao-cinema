/**
 * Authentication Routes Tests
 * 
 * Tests user registration, login, logout, profile management, and session handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { build } from '../test/app.js';
import { db } from '../db/index.js';
import { users, userSessions } from '../../../db/src/schema.js';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build({ includeAuth: true });
    // Clean up test data
    await db.delete(userSessions);
    await db.delete(users);
  });
  
  // =============================================================================
  // REGISTRATION
  // =============================================================================
  
  describe('POST /api/auth/register', () => {
    it('should register a new user with email and password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test User',
        },
      });
      
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.displayName).toBe('Test User');
      expect(body.user.role).toBe('user');
      expect(body.user.passwordHash).toBeUndefined(); // Should not expose hash
      expect(body.session).toBeDefined();
      expect(body.session.token).toBeDefined();
    });
    
    it('should register without display name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test2@example.com',
          password: 'password123',
        },
      });
      
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe('test2@example.com');
      expect(body.user.displayName).toBeNull();
    });
    
    it('should reject duplicate email', async () => {
      // Register first user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'password123',
        },
      });
      
      // Try to register with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'duplicate@example.com',
          password: 'different123',
        },
      });
      
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('already exists');
    });
    
    it('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'password123',
        },
      });
      
      expect(response.statusCode).toBe(400);
    });
    
    it('should reject short password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'short',
        },
      });
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid password');
    });
  });
  
  // =============================================================================
  // LOGIN
  // =============================================================================
  
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'login@example.com',
          password: 'password123',
          displayName: 'Login User',
        },
      });
    });
    
    it('should login with correct credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'password123',
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe('login@example.com');
      expect(body.session).toBeDefined();
      expect(body.session.token).toBeDefined();
    });
    
    it('should reject incorrect password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'wrongpassword',
        },
      });
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid');
    });
    
    it('should reject non-existent email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });
      
      expect(response.statusCode).toBe(401);
    });
  });
  
  // =============================================================================
  // GET CURRENT USER
  // =============================================================================
  
  describe('GET /api/auth/me', () => {
    let sessionToken: string;
    
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'me@example.com',
          password: 'password123',
          displayName: 'Me User',
        },
      });
      sessionToken = JSON.parse(response.body).session.token;
    });
    
    it('should return current user with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.email).toBe('me@example.com');
      expect(body.user.displayName).toBe('Me User');
    });
    
    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });
      
      expect(response.statusCode).toBe(401);
    });
    
    it('should reject invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid_token_12345',
        },
      });
      
      expect(response.statusCode).toBe(401);
    });
  });
  
  // =============================================================================
  // UPDATE PROFILE
  // =============================================================================
  
  describe('PATCH /api/auth/me', () => {
    let sessionToken: string;
    
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'update@example.com',
          password: 'password123',
          displayName: 'Original Name',
        },
      });
      sessionToken = JSON.parse(response.body).session.token;
    });
    
    it('should update display name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          displayName: 'Updated Name',
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.displayName).toBe('Updated Name');
    });
    
    it('should update profile image URL', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          profileImageUrl: 'https://example.com/avatar.jpg',
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.profileImageUrl).toBe('https://example.com/avatar.jpg');
    });
    
    it('should update multiple fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          displayName: 'New Name',
          profileImageUrl: 'https://example.com/new.jpg',
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.displayName).toBe('New Name');
      expect(body.user.profileImageUrl).toBe('https://example.com/new.jpg');
    });
  });
  
  // =============================================================================
  // CHANGE PASSWORD
  // =============================================================================
  
  describe('PATCH /api/auth/me/password', () => {
    let sessionToken: string;
    
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'password@example.com',
          password: 'oldpassword123',
        },
      });
      sessionToken = JSON.parse(response.body).session.token;
    });
    
    it('should change password with correct current password', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me/password',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword456',
        },
      });
      
      expect(response.statusCode).toBe(200);
      
      // Verify can login with new password
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'password@example.com',
          password: 'newpassword456',
        },
      });
      expect(loginResponse.statusCode).toBe(200);
    });
    
    it('should reject incorrect current password', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me/password',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword456',
        },
      });
      
      expect(response.statusCode).toBe(401);
    });
    
    it('should reject short new password', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me/password',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          currentPassword: 'oldpassword123',
          newPassword: 'short',
        },
      });
      
      expect(response.statusCode).toBe(400);
    });
  });
  
  // =============================================================================
  // LOGOUT
  // =============================================================================
  
  describe('POST /api/auth/logout', () => {
    let sessionToken: string;
    
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'logout@example.com',
          password: 'password123',
        },
      });
      sessionToken = JSON.parse(response.body).session.token;
    });
    
    it('should logout and invalidate session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      
      expect(response.statusCode).toBe(200);
      
      // Verify token no longer works
      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      expect(meResponse.statusCode).toBe(401);
    });
  });
  
  // =============================================================================
  // LOGOUT ALL
  // =============================================================================
  
  describe('POST /api/auth/logout-all', () => {
    let token1: string;
    let token2: string;
    
    beforeEach(async () => {
      // Register and get first token
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'logoutall@example.com',
          password: 'password123',
        },
      });
      token1 = JSON.parse(response1.body).session.token;
      
      // Login again to get second token
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'logoutall@example.com',
          password: 'password123',
        },
      });
      token2 = JSON.parse(response2.body).session.token;
    });
    
    it('should invalidate all sessions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout-all',
        headers: {
          authorization: `Bearer ${token1}`,
        },
      });
      
      expect(response.statusCode).toBe(200);
      
      // Verify both tokens no longer work
      const me1 = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token1}` },
      });
      expect(me1.statusCode).toBe(401);
      
      const me2 = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(me2.statusCode).toBe(401);
    });
  });
  
  // =============================================================================
  // DELETE ACCOUNT
  // =============================================================================
  
  describe('DELETE /api/auth/me', () => {
    let sessionToken: string;
    let userId: string;
    
    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'delete@example.com',
          password: 'password123',
        },
      });
      const body = JSON.parse(response.body);
      sessionToken = body.session.token;
      userId = body.user.id;
    });
    
    it('should delete account with correct password', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          password: 'password123',
        },
      });
      
      expect(response.statusCode).toBe(200);
      
      // Verify user is deleted
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      expect(user).toBeUndefined();
      
      // Verify cannot login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'delete@example.com',
          password: 'password123',
        },
      });
      expect(loginResponse.statusCode).toBe(401);
    });
    
    it('should reject incorrect password', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
        payload: {
          password: 'wrongpassword',
        },
      });
      
      expect(response.statusCode).toBe(401);
      
      // Verify user still exists
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      expect(user).toBeDefined();
    });
  });
});
