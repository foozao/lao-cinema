# Password Protection Guide

This document covers how to password-protect your Lao Cinema deployment on GCP Cloud Run.

---

## Current Implementation: Role-Based HTTP Basic Auth

The web app uses **HTTP Basic Auth** with **role-based access control** via Next.js middleware.

### How It Works

1. **Middleware** (`/web/middleware.ts`) intercepts all requests
2. Checks for `AUTH_USERS` environment variable
3. Authenticates users and checks their role
4. **Admin role**: Full access to all pages including `/admin`
5. **Viewer role**: Access to all pages except `/admin`
6. If not configured (local dev), allows access without auth

### Configuration

Set the `AUTH_USERS` environment variable in Cloud Run:

```bash
AUTH_USERS="username:password:role,username2:password2:role2"
```

**Format**: `username:password:role` separated by commas for multiple users

**Roles**:
- `admin` - Full access (including admin pages)
- `viewer` - Regular access (no admin pages)

**Example**:
```bash
AUTH_USERS="admin:SecurePass123:admin,test:TestPass456:viewer"
```

This creates:
- User `admin` with password `SecurePass123` (admin role)
- User `test` with password `TestPass456` (viewer role)

**Important**: Change the passwords before deploying!

### Deployment

The users are configured in `/scripts/deploy.sh` at line 186:

```bash
--set-env-vars="NEXT_PUBLIC_API_URL=$API_URL,AUTH_USERS=admin:YourAdminPassword123:admin,test:YourTestPassword456:viewer"
```

**Before deploying**, update the passwords in `deploy.sh`.

### Testing Locally

```bash
# Without authentication (default)
cd web
npm run dev

# With authentication
export AUTH_USERS="admin:test123:admin,test:test456:viewer"
npm run dev
```

Then visit `http://localhost:3000` and login with:
- Username: `admin`, Password: `test123` (can access admin pages)
- Username: `test`, Password: `test456` (cannot access admin pages)

### Updating Users on Existing Deployment

```bash
# Update all users
gcloud run services update lao-cinema-web \
  --region=asia-southeast1 \
  --set-env-vars="AUTH_USERS=admin:NewPass123:admin,test:NewPass456:viewer"

# Add a new user (must include existing users too)
gcloud run services update lao-cinema-web \
  --region=asia-southeast1 \
  --set-env-vars="AUTH_USERS=admin:Pass1:admin,test:Pass2:viewer,newuser:Pass3:viewer"
```

---

## Alternative Approaches

### Option 2: GCP IAM Authentication (More Secure)

Remove `--allow-unauthenticated` and use GCP's built-in auth:

```bash
# Deploy with authentication required
gcloud run deploy lao-cinema-web \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest \
  --region=$REGION \
  --no-allow-unauthenticated

# Grant access to specific users
gcloud run services add-iam-policy-binding lao-cinema-web \
  --region=$REGION \
  --member="user:someone@example.com" \
  --role="roles/run.invoker"
```

**Pros**: 
- More secure (uses Google accounts)
- Granular access control
- Audit logs

**Cons**:
- Requires Google account
- More complex for sharing

### Option 3: Identity-Aware Proxy (IAP) (Enterprise)

For production with multiple users and SSO:

1. Set up **Cloud Load Balancer** in front of Cloud Run
2. Enable **Identity-Aware Proxy**
3. Configure OAuth consent screen
4. Add authorized users

See: https://cloud.google.com/iap/docs/enabling-cloud-run

**Pros**:
- Enterprise-grade security
- SSO integration
- Advanced access policies

**Cons**:
- More expensive (Load Balancer costs)
- Complex setup
- Overkill for simple demos

---

## Security Best Practices

### 1. Use Strong Passwords

```bash
# Generate a secure password
openssl rand -base64 32
```

### 2. Don't Commit Passwords

Add to `.gitignore`:
```
deploy-config.sh
.env.production
```

Store passwords in:
- **GCP Secret Manager** (recommended)
- Environment variables
- Secure password manager

### 3. Rotate Passwords Regularly

```bash
# Update password
gcloud run services update lao-cinema-web \
  --region=$REGION \
  --set-env-vars="BASIC_AUTH_PASSWORD=$(openssl rand -base64 32)"
```

### 4. Use HTTPS Only

Cloud Run provides HTTPS by default. Never use HTTP for authenticated services.

---

## Using GCP Secret Manager (Recommended)

Instead of hardcoding passwords in `deploy.sh`:

### 1. Create Secret

```bash
# Create secret
echo -n "YourSecurePassword123" | gcloud secrets create basic-auth-password --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding basic-auth-password \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. Update Deployment

```bash
gcloud run deploy lao-cinema-web \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/lao-cinema/web:latest \
  --region=$REGION \
  --set-secrets="BASIC_AUTH_PASSWORD=basic-auth-password:latest"
```

### 3. Update Secret

```bash
# Add new version
echo -n "admin:Pass123:admin,test:Pass456:viewer" | gcloud secrets versions add auth-users --data-file=-

# Cloud Run will automatically use the latest version
```

### 4. Add More Users

```bash
# Get current users from secret
CURRENT_USERS=$(gcloud secrets versions access latest --secret=auth-users)

# Add new user
NEW_USERS="$CURRENT_USERS,newuser:NewPass789:viewer"
echo -n "$NEW_USERS" | gcloud secrets versions add auth-users --data-file=-
```

---

## Troubleshooting

### Password Not Working

1. Check environment variables are set:
   ```bash
   gcloud run services describe lao-cinema-web \
     --region=$REGION \
     --format="value(spec.template.spec.containers[0].env)"
   ```

2. Verify middleware is deployed:
   ```bash
   # Check logs for auth attempts
   gcloud run services logs read lao-cinema-web --region=$REGION --limit=50
   ```

3. Clear browser cache and try again

### Browser Keeps Asking for Password

This is normal behavior for HTTP Basic Auth. The browser caches credentials per session.

To "logout": Close all browser windows or use incognito mode.

### API Still Accessible

The current setup only protects the **web app**. To protect the API:

1. Remove `--allow-unauthenticated` from API deployment
2. Add API key authentication in Fastify
3. Or use GCP IAM for service-to-service auth

---

## Next Steps

- [ ] Change default password in `deploy.sh`
- [ ] Deploy with new password
- [ ] Test authentication works
- [ ] Consider migrating to Secret Manager
- [ ] Document password for team members (securely!)

---

## Quick Commands

```bash
# Deploy with password protection
cd /Users/brandon/home/Workspace/lao-cinema
./scripts/deploy.sh

# Update users/passwords
gcloud run services update lao-cinema-web \
  --region=asia-southeast1 \
  --set-env-vars="AUTH_USERS=admin:NewPass1:admin,test:NewPass2:viewer"

# Add a new viewer user
gcloud run services update lao-cinema-web \
  --region=asia-southeast1 \
  --set-env-vars="AUTH_USERS=admin:Pass1:admin,test:Pass2:viewer,guest:Pass3:viewer"

# Remove password protection (allow public access)
gcloud run services update lao-cinema-web \
  --region=asia-southeast1 \
  --remove-env-vars="AUTH_USERS"

# View current environment variables
gcloud run services describe lao-cinema-web \
  --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)"
```

## Access Control Summary

| User Role | Can Access | Cannot Access |
|-----------|-----------|---------------|
| **admin** | All pages including `/admin` | Nothing restricted |
| **viewer** | All public pages | `/admin` pages (403 error) |
| **No auth** (local dev) | Everything | Nothing |
