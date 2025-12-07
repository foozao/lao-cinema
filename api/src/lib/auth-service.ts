/**
 * Authentication Service
 * 
 * Handles user registration, login, session management, and OAuth account linking.
 * Designed to support both email/password and OAuth authentication.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, userSessions, oauthAccounts } from '../db/schema.js';
import type { User, NewUser, UserSession, NewUserSession, OAuthAccount, NewOAuthAccount } from '../db/schema.js';
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
 * Delete user account
 */
export async function deleteUser(userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Authenticate user with email/password
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  
  if (!user || !user.passwordHash) {
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
