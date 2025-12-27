# Authentication Security

## Overview

The authentication system implements multiple security layers to protect user accounts and prevent abuse.

## Security Features

### 1. Password Security

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Storage:**
- Passwords hashed with scrypt (Node.js built-in)
- Never stored in plaintext
- Password hashes never returned in API responses

**Implementation:** `/api/src/lib/auth-utils.ts`

### 2. Rate Limiting

**Login Attempts:**
- Maximum **5 failed attempts** per IP address
- **15 minute lockout** after exceeding limit
- Counter resets on successful login
- Prevents brute-force password attacks

**Forgot Password:**
- Maximum **3 requests** per IP address
- **15 minute cooldown** between requests
- Prevents email enumeration attacks
- Prevents spam/abuse of email system

**Implementation:** `/api/src/lib/rate-limiter.ts`

### 3. Session Management

**Session Tokens:**
- Cryptographically secure random tokens (32 bytes)
- 30-day expiration by default
- Stored in database with user association
- Invalidated on logout

**Security Practices:**
- Token transmitted via `Authorization: Bearer <token>` header
- HTTPS required in production
- Automatic cleanup of expired sessions
- "Logout all devices" functionality available

### 4. Password Reset Flow

**Token Generation:**
- Secure random token (32 bytes)
- 1-hour expiration
- Single-use only (marked as used after redemption)
- Invalidates all previous reset tokens for user

**Security Measures:**
- Email enumeration prevention (always returns success)
- Token validation before password reset form
- All sessions invalidated after password reset
- OAuth-only accounts cannot reset password

**Endpoints:**
- `POST /api/auth/forgot-password` - Request reset email
- `GET /api/auth/verify-reset-token` - Validate token
- `POST /api/auth/reset-password` - Complete reset

### 5. Email Verification

**Token Generation:**
- Secure random token (32 bytes)
- 24-hour expiration
- Single-use only
- Invalidates previous verification tokens

**Flow:**
1. User registers or changes email
2. Verification email sent with token link
3. User clicks link to verify email
4. Token marked as used, email marked as verified

**Endpoints:**
- `POST /api/auth/send-verification-email` - Send verification
- `GET /api/auth/verify-email-token` - Validate token
- `POST /api/auth/verify-email` - Complete verification

### 6. OAuth Security (Future)

**Planned Providers:**
- Google OAuth 2.0
- Apple Sign In

**Security Features:**
- OAuth tokens stored encrypted
- Refresh token rotation
- Account linking validation
- Email verification via OAuth provider

## Rate Limiting Details

### Implementation

The rate limiter uses **in-memory storage** with automatic cleanup. For production deployments with multiple API servers, consider using Redis for distributed rate limiting.

**Storage Structure:**
```typescript
{
  "login:192.168.1.1": {
    attempts: 3,
    expiresAt: Date
  },
  "forgot-password:192.168.1.1": {
    attempts: 1,
    expiresAt: Date
  }
}
```

**Cleanup:**
- Expired entries removed every 5 minutes
- Prevents memory leaks in long-running processes

### Configuration

**Login Rate Limit:**
```typescript
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15
```

**Forgot Password Rate Limit:**
```typescript
MAX_FORGOT_PASSWORD_ATTEMPTS = 3
FORGOT_PASSWORD_COOLDOWN_MINUTES = 15
```

### Error Responses

**Login Lockout:**
```json
{
  "error": "Too many login attempts. Please try again in 15 minutes.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": "2024-12-28T10:30:00.000Z"
}
```

**Forgot Password Cooldown:**
```json
{
  "error": "Too many password reset requests. Please try again in 15 minutes.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": "2024-12-28T10:30:00.000Z"
}
```

## Attack Prevention

### 1. Brute Force Attacks

**Protection:**
- Rate limiting on login endpoint
- Account lockout after multiple failures
- Secure password requirements

**Future Enhancements:**
- CAPTCHA after 3 failed attempts
- Device fingerprinting
- Suspicious activity alerts

### 2. Email Enumeration

**Protection:**
- Forgot password always returns success (even if email doesn't exist)
- Registration returns generic error for existing emails
- No timing differences in responses

### 3. Session Hijacking

**Protection:**
- Secure token generation
- HTTPS-only in production
- IP address and user agent tracking
- Ability to invalidate all sessions

**Future Enhancements:**
- IP address validation
- Device fingerprinting
- Suspicious session detection

### 4. Password Reset Abuse

**Protection:**
- Rate limiting (3 requests per 15 min)
- Token expiration (1 hour)
- Single-use tokens
- Email enumeration prevention

## Testing

### Manual Testing

**Login Rate Limiting:**
1. Attempt login with wrong password 5 times
2. 6th attempt should return rate limit error
3. Wait 15 minutes
4. Login should work again

**Forgot Password Rate Limiting:**
1. Request password reset 3 times
2. 4th attempt should return rate limit error
3. Wait 15 minutes
4. Request should work again

### Unit Tests

Location: `/api/src/lib/rate-limiter.test.ts`

Tests cover:
- ✓ Successful attempts within limit
- ✓ Rate limit exceeded
- ✓ Automatic expiration and reset
- ✓ Different keys don't interfere
- ✓ Cleanup of expired entries

## Monitoring

### Recommended Metrics

1. **Failed login attempts per hour**
   - Alert if > 100 per hour from single IP
   
2. **Rate limit hits per hour**
   - Track how often limits are reached
   - Adjust thresholds if legitimate users affected

3. **Password reset requests per hour**
   - Alert if abnormal spike
   - May indicate attack or system issue

4. **Session creation rate**
   - Monitor for credential stuffing attacks

### Logging

All authentication events are logged with:
- IP address
- User agent
- Timestamp
- Success/failure
- Reason for failure

**Log Locations:**
- Successful logins: INFO level
- Failed logins: WARN level
- Rate limit hits: WARN level
- Security events: ERROR level

## Configuration

### Environment Variables

**Production:**
```bash
# Required for session tokens and password reset tokens
AUTH_SECRET=your-secure-random-string-here

# Email service for password reset and verification
EMAIL_SERVICE=sendgrid
EMAIL_FROM=noreply@laocinema.com
SENDGRID_API_KEY=your-api-key

# Frontend URL for email links
FRONTEND_URL=https://laocinema.com
```

**Development:**
```bash
AUTH_SECRET=dev-secret-key
EMAIL_SERVICE=console
FRONTEND_URL=http://localhost:3000
```

### Rate Limit Tuning

If legitimate users are hitting rate limits, adjust in `/api/src/lib/rate-limiter.ts`:

```typescript
// More lenient for development
MAX_LOGIN_ATTEMPTS = 10
LOGIN_LOCKOUT_MINUTES = 5

// Stricter for production
MAX_LOGIN_ATTEMPTS = 3
LOGIN_LOCKOUT_MINUTES = 30
```

## Best Practices

### 1. Always Use HTTPS in Production
- Prevents token interception
- Protects password transmission
- Required for OAuth providers

### 2. Implement Security Headers
```typescript
// Add to Fastify server
fastify.register(helmet, {
  contentSecurityPolicy: false, // Configure as needed
});
```

### 3. Monitor Authentication Logs
- Set up alerts for suspicious patterns
- Review failed login attempts regularly
- Track rate limit hits

### 4. Regular Security Audits
- Review password policies annually
- Update dependencies regularly
- Penetration testing before launch

### 5. User Education
- Encourage strong unique passwords
- Provide password manager recommendations
- Alert users of suspicious activity

## Future Enhancements

### Planned Features

- [ ] Two-factor authentication (TOTP)
- [ ] WebAuthn/Passkey support
- [ ] SMS-based authentication
- [ ] Biometric authentication (mobile app)
- [ ] Suspicious login alerts via email
- [ ] Login history and device management
- [ ] Geographic login restrictions
- [ ] Role-based access control (RBAC) expansion

### Security Infrastructure

**HSTS Headers:** ✅ **Implemented**
- Strict-Transport-Security headers via `@fastify/helmet`
- Production only (disabled in development for localhost)
- 1 year max-age with includeSubDomains and preload
- Additional headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy

**HttpOnly Cookies (On Hold):**
- Current: Session tokens in localStorage + Bearer auth
- Future: HttpOnly cookies with Secure and SameSite flags
- Benefits: XSS protection, automatic CSRF prevention
- Requires: Same domain/subdomain for API + web app
- Migration: Refactor frontend auth client

### Under Consideration

- [ ] CAPTCHA on repeated failures
- [ ] Progressive delays on login attempts
- [ ] Device fingerprinting
- [ ] Risk-based authentication
- [ ] Account recovery options (security questions)
- [ ] Trusted device management

## Related Documentation

- `/docs/features/VIDEO_SECURITY.md` - Video access security
- `/docs/features/USER_ACCOUNTS.md` - Account system overview
- `/docs/architecture/API_REFERENCE.md` - Auth API endpoints

## Troubleshooting

### "Too many login attempts"

**Cause:** IP exceeded 5 failed login attempts within 15 minutes

**Solution:**
1. Wait 15 minutes for automatic reset
2. Verify correct email and password
3. Use "Forgot Password" if password unknown
4. Contact support if legitimate user locked out

### "Too many password reset requests"

**Cause:** IP exceeded 3 reset requests within 15 minutes

**Solution:**
1. Wait 15 minutes for cooldown
2. Check spam folder for previous emails
3. Verify email address is correct

### Rate limiter not working in development

**Cause:** May be using different IP addresses (localhost vs 127.0.0.1)

**Solution:**
1. Check logs to see which IP is being used
2. Use consistent localhost or 127.0.0.1
3. Clear rate limiter manually if needed

### Production: Users from same office hitting rate limit

**Cause:** Multiple users behind same NAT/proxy share IP

**Solution:**
1. Consider fingerprinting or user-based limits
2. Increase rate limits slightly
3. Implement per-user limits instead of per-IP
4. Use distributed rate limiting with Redis
