// Tests for auth-service.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import {
  createUser,
  createOAuthUser,
  findUserByEmail,
  findUserById,
  updateUser,
  updateUserPassword,
  updateLastLogin,
  deleteUser,
  authenticateUser,
  createSession,
  findSessionByToken,
  deleteSession,
  deleteAllUserSessions,
  linkOAuthAccount,
  findOAuthAccount,
  updateOAuthTokens,
  unlinkOAuthAccount,
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  createEmailVerificationToken,
  findValidEmailVerificationToken,
  verifyUserEmail,
} from './auth-service.js';
import { verifyPassword } from './auth-utils.js';

describe('Auth Service', () => {
  beforeEach(async () => {
    // Clean up in correct order (respecting foreign keys)
    await db.delete(schema.emailVerificationTokens);
    await db.delete(schema.passwordResetTokens);
    await db.delete(schema.oauthAccounts);
    await db.delete(schema.userSessions);
    await db.delete(schema.users);
  });

  describe('User Management', () => {
    describe('createUser', () => {
      it('should create a user with email and password', async () => {
        const user = await createUser({
          email: 'test@example.com',
          password: 'securepassword123',
          displayName: 'Test User',
        });

        expect(user.id).toBeDefined();
        expect(user.email).toBe('test@example.com');
        expect(user.displayName).toBe('Test User');
        expect(user.role).toBe('user');
        expect(user.emailVerified).toBe(false);
        expect(user.passwordHash).toBeDefined();
      });

      it('should lowercase email', async () => {
        const user = await createUser({
          email: 'TEST@EXAMPLE.COM',
          password: 'password123',
        });

        expect(user.email).toBe('test@example.com');
      });

      it('should hash the password', async () => {
        const user = await createUser({
          email: 'test@example.com',
          password: 'mypassword',
        });

        expect(user.passwordHash).not.toBe('mypassword');
        const isValid = await verifyPassword('mypassword', user.passwordHash!);
        expect(isValid).toBe(true);
      });
    });

    describe('createOAuthUser', () => {
      it('should create a user without password', async () => {
        const user = await createOAuthUser({
          email: 'oauth@example.com',
          displayName: 'OAuth User',
          profileImageUrl: 'https://example.com/avatar.jpg',
        });

        expect(user.id).toBeDefined();
        expect(user.email).toBe('oauth@example.com');
        expect(user.passwordHash).toBeNull();
        expect(user.emailVerified).toBe(true); // OAuth emails are pre-verified
      });
    });

    describe('findUserByEmail', () => {
      it('should find existing user', async () => {
        await createUser({
          email: 'findme@example.com',
          password: 'password123',
        });

        const user = await findUserByEmail('findme@example.com');
        expect(user).not.toBeNull();
        expect(user!.email).toBe('findme@example.com');
      });

      it('should return null for non-existent user', async () => {
        const user = await findUserByEmail('nonexistent@example.com');
        expect(user).toBeNull();
      });

      it('should be case-insensitive', async () => {
        await createUser({
          email: 'mixedcase@example.com',
          password: 'password123',
        });

        const user = await findUserByEmail('MIXEDCASE@EXAMPLE.COM');
        expect(user).not.toBeNull();
      });
    });

    describe('findUserById', () => {
      it('should find existing user by ID', async () => {
        const created = await createUser({
          email: 'test@example.com',
          password: 'password123',
        });

        const user = await findUserById(created.id);
        expect(user).not.toBeNull();
        expect(user!.id).toBe(created.id);
      });

      it('should return null for non-existent ID', async () => {
        const user = await findUserById('00000000-0000-0000-0000-000000000000');
        expect(user).toBeNull();
      });
    });

    describe('updateUser', () => {
      it('should update user profile', async () => {
        const user = await createUser({
          email: 'test@example.com',
          password: 'password123',
        });

        const updated = await updateUser(user.id, {
          displayName: 'New Name',
          profileImageUrl: 'https://example.com/new-avatar.jpg',
          timezone: 'Asia/Vientiane',
        });

        expect(updated.displayName).toBe('New Name');
        expect(updated.profileImageUrl).toBe('https://example.com/new-avatar.jpg');
        expect(updated.timezone).toBe('Asia/Vientiane');
      });
    });

    describe('updateUserPassword', () => {
      it('should update user password', async () => {
        const user = await createUser({
          email: 'test@example.com',
          password: 'oldpassword',
        });

        await updateUserPassword(user.id, 'newpassword');

        const updatedUser = await findUserById(user.id);
        const isValid = await verifyPassword('newpassword', updatedUser!.passwordHash!);
        expect(isValid).toBe(true);
      });
    });

    describe('updateLastLogin', () => {
      it('should update lastLoginAt timestamp', async () => {
        const user = await createUser({
          email: 'test@example.com',
          password: 'password123',
        });

        const beforeUpdate = user.lastLoginAt;
        await updateLastLogin(user.id);

        const updatedUser = await findUserById(user.id);
        expect(updatedUser!.lastLoginAt).not.toEqual(beforeUpdate);
      });
    });

    describe('deleteUser', () => {
      it('should soft-delete a user (anonymize PII)', async () => {
        const user = await createUser({
          email: 'delete@example.com',
          password: 'password123',
          displayName: 'Test User',
        });

        await deleteUser(user.id);

        // User record should still exist but be anonymized
        const deleted = await findUserById(user.id);
        expect(deleted).not.toBeNull();
        expect(deleted!.deletedAt).not.toBeNull();
        expect(deleted!.email).toMatch(/^deleted_[a-f0-9]+@deleted\.local$/);
        expect(deleted!.displayName).toBe('Deleted User');
        expect(deleted!.passwordHash).toBeNull();
      });

      it('should prevent authentication for soft-deleted users', async () => {
        const user = await createUser({
          email: 'deleted-auth@example.com',
          password: 'password123',
        });

        await deleteUser(user.id);

        // Should not be able to authenticate
        const authenticated = await authenticateUser('deleted-auth@example.com', 'password123');
        expect(authenticated).toBeNull();
      });
    });
  });

  describe('Authentication', () => {
    describe('authenticateUser', () => {
      it('should authenticate with valid credentials', async () => {
        await createUser({
          email: 'auth@example.com',
          password: 'correctpassword',
        });

        const user = await authenticateUser('auth@example.com', 'correctpassword');
        expect(user).not.toBeNull();
        expect(user!.email).toBe('auth@example.com');
      });

      it('should return null for wrong password', async () => {
        await createUser({
          email: 'auth@example.com',
          password: 'correctpassword',
        });

        const user = await authenticateUser('auth@example.com', 'wrongpassword');
        expect(user).toBeNull();
      });

      it('should return null for non-existent user', async () => {
        const user = await authenticateUser('nonexistent@example.com', 'password');
        expect(user).toBeNull();
      });

      it('should return null for OAuth user (no password)', async () => {
        await createOAuthUser({
          email: 'oauth@example.com',
        });

        const user = await authenticateUser('oauth@example.com', 'anypassword');
        expect(user).toBeNull();
      });

      it('should update lastLoginAt on successful auth', async () => {
        const created = await createUser({
          email: 'auth@example.com',
          password: 'password123',
        });

        const beforeAuth = created.lastLoginAt;
        await authenticateUser('auth@example.com', 'password123');

        const afterAuth = await findUserById(created.id);
        expect(afterAuth!.lastLoginAt).not.toEqual(beforeAuth);
      });
    });
  });

  describe('Session Management', () => {
    describe('createSession', () => {
      it('should create a session with token', async () => {
        const user = await createUser({
          email: 'session@example.com',
          password: 'password123',
        });

        const session = await createSession(user.id, '127.0.0.1', 'Test User Agent');

        expect(session.id).toBeDefined();
        expect(session.userId).toBe(user.id);
        expect(session.token).toBeDefined();
        expect(session.expiresAt).toBeDefined();
        expect(session.ipAddress).toBe('127.0.0.1');
        expect(session.userAgent).toBe('Test User Agent');
      });
    });

    describe('findSessionByToken', () => {
      it('should find valid session with user', async () => {
        const user = await createUser({
          email: 'session@example.com',
          password: 'password123',
        });
        const session = await createSession(user.id);

        const found = await findSessionByToken(session.token);

        expect(found).not.toBeNull();
        expect(found!.token).toBe(session.token);
        expect(found!.user.email).toBe('session@example.com');
      });

      it('should return null for non-existent token', async () => {
        const found = await findSessionByToken('nonexistent-token');
        expect(found).toBeNull();
      });

      it('should return null and delete expired session', async () => {
        const user = await createUser({
          email: 'session@example.com',
          password: 'password123',
        });

        // Create session and manually expire it
        const session = await createSession(user.id);
        await db.update(schema.userSessions)
          .set({ expiresAt: new Date(Date.now() - 1000) })
          .where(eq(schema.userSessions.id, session.id));

        const found = await findSessionByToken(session.token);
        expect(found).toBeNull();
      });
    });

    describe('deleteSession', () => {
      it('should delete a session', async () => {
        const user = await createUser({
          email: 'session@example.com',
          password: 'password123',
        });
        const session = await createSession(user.id);

        await deleteSession(session.token);

        const found = await findSessionByToken(session.token);
        expect(found).toBeNull();
      });
    });

    describe('deleteAllUserSessions', () => {
      it('should delete all sessions for a user', async () => {
        const user = await createUser({
          email: 'session@example.com',
          password: 'password123',
        });

        const session1 = await createSession(user.id);
        const session2 = await createSession(user.id);

        await deleteAllUserSessions(user.id);

        const found1 = await findSessionByToken(session1.token);
        const found2 = await findSessionByToken(session2.token);
        expect(found1).toBeNull();
        expect(found2).toBeNull();
      });
    });
  });

  describe('OAuth Account Linking', () => {
    describe('linkOAuthAccount', () => {
      it('should link OAuth account to user', async () => {
        const user = await createUser({
          email: 'oauth@example.com',
          password: 'password123',
        });

        const account = await linkOAuthAccount({
          userId: user.id,
          provider: 'google',
          providerAccountId: 'google-123',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        });

        expect(account.id).toBeDefined();
        expect(account.userId).toBe(user.id);
        expect(account.provider).toBe('google');
        expect(account.providerAccountId).toBe('google-123');
      });
    });

    describe('findOAuthAccount', () => {
      it('should find OAuth account with user', async () => {
        const user = await createUser({
          email: 'oauth@example.com',
          password: 'password123',
        });
        await linkOAuthAccount({
          userId: user.id,
          provider: 'google',
          providerAccountId: 'google-123',
        });

        const found = await findOAuthAccount('google', 'google-123');

        expect(found).not.toBeNull();
        expect(found!.provider).toBe('google');
        expect(found!.user.email).toBe('oauth@example.com');
      });

      it('should return null for non-existent account', async () => {
        const found = await findOAuthAccount('google', 'nonexistent');
        expect(found).toBeNull();
      });
    });

    describe('updateOAuthTokens', () => {
      it('should update OAuth tokens', async () => {
        const user = await createUser({
          email: 'oauth@example.com',
          password: 'password123',
        });
        const account = await linkOAuthAccount({
          userId: user.id,
          provider: 'google',
          providerAccountId: 'google-123',
          accessToken: 'old-access-token',
        });

        await updateOAuthTokens(account.id, 'new-access-token', 'new-refresh-token');

        const found = await findOAuthAccount('google', 'google-123');
        expect(found!.accessToken).toBe('new-access-token');
        expect(found!.refreshToken).toBe('new-refresh-token');
      });
    });

    describe('unlinkOAuthAccount', () => {
      it('should unlink OAuth account', async () => {
        const user = await createUser({
          email: 'oauth@example.com',
          password: 'password123',
        });
        const account = await linkOAuthAccount({
          userId: user.id,
          provider: 'google',
          providerAccountId: 'google-123',
        });

        await unlinkOAuthAccount(account.id);

        const found = await findOAuthAccount('google', 'google-123');
        expect(found).toBeNull();
      });
    });
  });

  describe('Password Reset', () => {
    describe('createPasswordResetToken', () => {
      it('should create a password reset token', async () => {
        const user = await createUser({
          email: 'reset@example.com',
          password: 'password123',
        });

        const resetToken = await createPasswordResetToken(user.id);

        expect(resetToken.id).toBeDefined();
        expect(resetToken.userId).toBe(user.id);
        expect(resetToken.token).toBeDefined();
        expect(resetToken.expiresAt).toBeDefined();
        expect(resetToken.usedAt).toBeNull();
      });

      it('should delete existing tokens for user', async () => {
        const user = await createUser({
          email: 'reset@example.com',
          password: 'password123',
        });

        const firstToken = await createPasswordResetToken(user.id);
        const secondToken = await createPasswordResetToken(user.id);

        // First token should be invalidated
        const foundFirst = await findValidPasswordResetToken(firstToken.token);
        expect(foundFirst).toBeNull();

        // Second token should be valid
        const foundSecond = await findValidPasswordResetToken(secondToken.token);
        expect(foundSecond).not.toBeNull();
      });
    });

    describe('findValidPasswordResetToken', () => {
      it('should find valid token with user', async () => {
        const user = await createUser({
          email: 'reset@example.com',
          password: 'password123',
        });
        const resetToken = await createPasswordResetToken(user.id);

        const found = await findValidPasswordResetToken(resetToken.token);

        expect(found).not.toBeNull();
        expect(found!.token).toBe(resetToken.token);
        expect(found!.user.email).toBe('reset@example.com');
      });

      it('should return null for expired token', async () => {
        const user = await createUser({
          email: 'reset@example.com',
          password: 'password123',
        });
        const resetToken = await createPasswordResetToken(user.id);

        // Manually expire the token
        await db.update(schema.passwordResetTokens)
          .set({ expiresAt: new Date(Date.now() - 1000) })
          .where(eq(schema.passwordResetTokens.id, resetToken.id));

        const found = await findValidPasswordResetToken(resetToken.token);
        expect(found).toBeNull();
      });

      it('should return null for used token', async () => {
        const user = await createUser({
          email: 'reset@example.com',
          password: 'password123',
        });
        const resetToken = await createPasswordResetToken(user.id);

        await markPasswordResetTokenUsed(resetToken.id);

        const found = await findValidPasswordResetToken(resetToken.token);
        expect(found).toBeNull();
      });
    });

    describe('markPasswordResetTokenUsed', () => {
      it('should mark token as used', async () => {
        const user = await createUser({
          email: 'reset@example.com',
          password: 'password123',
        });
        const resetToken = await createPasswordResetToken(user.id);

        await markPasswordResetTokenUsed(resetToken.id);

        const found = await findValidPasswordResetToken(resetToken.token);
        expect(found).toBeNull();
      });
    });
  });

  describe('Email Verification', () => {
    describe('createEmailVerificationToken', () => {
      it('should create an email verification token', async () => {
        const user = await createUser({
          email: 'verify@example.com',
          password: 'password123',
        });

        const verificationToken = await createEmailVerificationToken(user.id);

        expect(verificationToken.id).toBeDefined();
        expect(verificationToken.userId).toBe(user.id);
        expect(verificationToken.token).toBeDefined();
        expect(verificationToken.expiresAt).toBeDefined();
      });
    });

    describe('findValidEmailVerificationToken', () => {
      it('should find valid token with user', async () => {
        const user = await createUser({
          email: 'verify@example.com',
          password: 'password123',
        });
        const verificationToken = await createEmailVerificationToken(user.id);

        const found = await findValidEmailVerificationToken(verificationToken.token);

        expect(found).not.toBeNull();
        expect(found!.token.token).toBe(verificationToken.token);
        expect(found!.user.email).toBe('verify@example.com');
      });

      it('should return null for expired token', async () => {
        const user = await createUser({
          email: 'verify@example.com',
          password: 'password123',
        });
        const verificationToken = await createEmailVerificationToken(user.id);

        // Manually expire the token
        await db.update(schema.emailVerificationTokens)
          .set({ expiresAt: new Date(Date.now() - 1000) })
          .where(eq(schema.emailVerificationTokens.id, verificationToken.id));

        const found = await findValidEmailVerificationToken(verificationToken.token);
        expect(found).toBeNull();
      });
    });

    describe('verifyUserEmail', () => {
      it('should verify user email and mark token used', async () => {
        const user = await createUser({
          email: 'verify@example.com',
          password: 'password123',
        });
        expect(user.emailVerified).toBe(false);

        const verificationToken = await createEmailVerificationToken(user.id);
        const verifiedUser = await verifyUserEmail(verificationToken.id, user.id);

        expect(verifiedUser.emailVerified).toBe(true);

        // Token should be used
        const found = await findValidEmailVerificationToken(verificationToken.token);
        expect(found).toBeNull();
      });
    });
  });
});
