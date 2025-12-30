/**
 * Authentication Service
 * 
 * Handles user registration, login, session management, and OAuth account linking.
 * Designed to support both email/password and OAuth authentication.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, userSessions, oauthAccounts, passwordResetTokens, emailVerificationTokens } from '../db/schema.js';
import type { User, NewUser, UserSession, NewUserSession, OAuthAccount, NewOAuthAccount, PasswordResetToken, EmailVerificationToken } from '../db/schema.js';
import { hashPassword, verifyPassword, generateSessionToken, getSessionExpiration } from './auth-utils.js';

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Create a new user with email/password
 */
export async function createUser(data: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<User> {
  const passwordHash = await hashPassword(data.password);
  
  const [user] = await db.insert(users).values({
    email: data.email.toLowerCase(),
    passwordHash,
    displayName: data.displayName,
    role: 'user',
    emailVerified: false,
  }).returning();
  
  return user;
}

/**
 * Create a user from OAuth (no password)
 */
export async function createOAuthUser(data: {
  email: string;
  displayName?: string;
  profileImageUrl?: string;
}): Promise<User> {
  const [user] = await db.insert(users).values({
    email: data.email.toLowerCase(),
    passwordHash: null, // OAuth users don't have passwords
    displayName: data.displayName,
    profileImageUrl: data.profileImageUrl,
    role: 'user',
    emailVerified: true, // OAuth emails are pre-verified
  }).returning();
  
  return user;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  
  return user || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  
  return user || null;
}

/**
 * Update user profile
 */
export async function updateUser(userId: string, data: {
  displayName?: string;
  profileImageUrl?: string;
  timezone?: string;
  preferredSubtitleLanguage?: string | null;
  alwaysShowSubtitles?: boolean;
}): Promise<User> {
  const [user] = await db.update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  
  return user;
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  
  await db.update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Update user email
 * Resets emailVerified to false since the new email needs verification
 */
export async function updateUserEmail(userId: string, newEmail: string): Promise<User> {
  const [user] = await db.update(users)
    .set({
      email: newEmail.toLowerCase(),
      emailVerified: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  
  return user;
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await db.update(users)
    .set({
      lastLoginAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Soft-delete user account
 * 
 * Instead of hard deleting, this function:
 * 1. Anonymizes all PII (email, displayName, profileImageUrl)
 * 2. Clears password hash
 * 3. Sets deletedAt timestamp
 * 4. Deletes all sessions (logs user out everywhere)
 * 
 * This preserves audit log integrity while complying with privacy requirements.
 * The userId remains intact for foreign key references in audit_logs, rentals, etc.
 */
export async function deleteUser(userId: string): Promise<void> {
  // Generate a unique anonymized email using the userId
  // Format: deleted_<first8chars>@deleted.local
  const anonymizedEmail = `deleted_${userId.substring(0, 8)}@deleted.local`;
  
  // Anonymize PII and mark as deleted
  await db.update(users)
    .set({
      email: anonymizedEmail,
      passwordHash: null,
      displayName: 'Deleted User',
      profileImageUrl: null,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  
  // Delete all sessions (log out everywhere)
  await db.delete(userSessions).where(eq(userSessions.userId, userId));
  
  // Delete OAuth accounts (these contain provider IDs which could be PII-adjacent)
  await db.delete(oauthAccounts).where(eq(oauthAccounts.userId, userId));
  
  // Delete password reset tokens
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  
  // Delete email verification tokens
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
}

/**
 * Check if a user is soft-deleted
 */
export async function isUserDeleted(userId: string): Promise<boolean> {
  const [user] = await db.select({ deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return user?.deletedAt !== null;
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Authenticate user with email/password
 * Returns null if user doesn't exist, password is wrong, or user is soft-deleted
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  
  if (!user || !user.passwordHash) {
    return null;
  }
  
  // Check if user is soft-deleted
  if (user.deletedAt) {
    return null;
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    return null;
  }
  
  // Update last login
  await updateLastLogin(user.id);
  
  return user;
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<UserSession> {
  const token = generateSessionToken();
  const expiresAt = getSessionExpiration();
  
  const [session] = await db.insert(userSessions).values({
    userId,
    token,
    expiresAt,
    ipAddress,
    userAgent,
  }).returning();
  
  return session;
}

/**
 * Find session by token
 */
export async function findSessionByToken(token: string): Promise<(UserSession & { user: User }) | null> {
  const [result] = await db.select()
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(eq(userSessions.token, token))
    .limit(1);
  
  if (!result) {
    return null;
  }
  
  // Check if session is expired
  if (new Date() > result.user_sessions.expiresAt) {
    await deleteSession(token);
    return null;
  }
  
  return {
    ...result.user_sessions,
    user: result.users,
  };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.token, token));
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.userId, userId));
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.expiresAt, new Date()));
}

// =============================================================================
// OAUTH ACCOUNT LINKING
// =============================================================================

/**
 * Link an OAuth account to a user
 */
export async function linkOAuthAccount(data: {
  userId: string;
  provider: 'google' | 'apple';
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}): Promise<OAuthAccount> {
  const [account] = await db.insert(oauthAccounts).values({
    userId: data.userId,
    provider: data.provider,
    providerAccountId: data.providerAccountId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
  }).returning();
  
  return account;
}

/**
 * Find OAuth account by provider and provider account ID
 */
export async function findOAuthAccount(
  provider: 'google' | 'apple',
  providerAccountId: string
): Promise<(OAuthAccount & { user: User }) | null> {
  const [result] = await db.select()
    .from(oauthAccounts)
    .innerJoin(users, eq(oauthAccounts.userId, users.id))
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, providerAccountId)
      )
    )
    .limit(1);
  
  if (!result) {
    return null;
  }
  
  return {
    ...result.oauth_accounts,
    user: result.users,
  };
}

/**
 * Update OAuth account tokens
 */
export async function updateOAuthTokens(
  accountId: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<void> {
  await db.update(oauthAccounts)
    .set({
      accessToken,
      refreshToken,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(oauthAccounts.id, accountId));
}

/**
 * Unlink OAuth account
 */
export async function unlinkOAuthAccount(accountId: string): Promise<void> {
  await db.delete(oauthAccounts).where(eq(oauthAccounts.id, accountId));
}

// =============================================================================
// PASSWORD RESET TOKENS
// =============================================================================

/**
 * Create a password reset token for a user
 * Token expires in 1 hour
 */
export async function createPasswordResetToken(userId: string): Promise<PasswordResetToken> {
  // Delete any existing unused tokens for this user
  await db.delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));
  
  const token = generateSessionToken(); // Reuse secure token generator
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  const [resetToken] = await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  }).returning();
  
  return resetToken;
}

/**
 * Find a valid password reset token
 * Returns null if token is expired, already used, or doesn't exist
 */
export async function findValidPasswordResetToken(token: string): Promise<(PasswordResetToken & { user: User }) | null> {
  const [result] = await db.select()
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.userId, users.id))
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  
  if (!result) {
    return null;
  }
  
  const resetToken = result.password_reset_tokens;
  
  // Check if token is expired
  if (new Date() > resetToken.expiresAt) {
    return null;
  }
  
  // Check if token was already used
  if (resetToken.usedAt) {
    return null;
  }
  
  return {
    ...resetToken,
    user: result.users,
  };
}

/**
 * Mark a password reset token as used
 */
export async function markPasswordResetTokenUsed(tokenId: string): Promise<void> {
  await db.update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

/**
 * Delete expired password reset tokens (cleanup)
 */
export async function cleanupExpiredPasswordResetTokens(): Promise<void> {
  await db.delete(passwordResetTokens)
    .where(eq(passwordResetTokens.expiresAt, new Date()));
}

// =============================================================================
// EMAIL VERIFICATION
// =============================================================================

/**
 * Create an email verification token for a user
 */
export async function createEmailVerificationToken(userId: string): Promise<EmailVerificationToken> {
  // Invalidate any existing tokens for this user
  await db.delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));
  
  const token = generateSessionToken(); // Reuse secure token generation
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  const [verificationToken] = await db.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  }).returning();
  
  return verificationToken;
}

/**
 * Find a valid email verification token and its associated user
 */
export async function findValidEmailVerificationToken(token: string): Promise<{ token: EmailVerificationToken; user: User } | null> {
  const result = await db.select()
    .from(emailVerificationTokens)
    .innerJoin(users, eq(emailVerificationTokens.userId, users.id))
    .where(eq(emailVerificationTokens.token, token))
    .limit(1)
    .then(rows => rows[0]);
  
  if (!result) {
    return null;
  }
  
  const verificationToken = result.email_verification_tokens;
  
  // Check if token is expired
  if (new Date() > verificationToken.expiresAt) {
    return null;
  }
  
  // Check if token was already used
  if (verificationToken.usedAt) {
    return null;
  }
  
  return {
    token: verificationToken,
    user: result.users,
  };
}

/**
 * Mark email as verified and token as used
 */
export async function verifyUserEmail(tokenId: string, userId: string): Promise<User> {
  // Mark token as used
  await db.update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, tokenId));
  
  // Update user's emailVerified status
  const [user] = await db.update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  
  return user;
}
