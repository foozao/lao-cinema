# Authentication Flow Examples

Visual examples of how the role-based HTTP Basic Auth works.

---

## User Access Matrix

| User | Username | Password | Role | Can Access Home? | Can Access Movies? | Can Access Admin? |
|------|----------|----------|------|------------------|-------------------|-------------------|
| Admin User | `admin` | `YourAdminPassword123` | `admin` | ✅ Yes | ✅ Yes | ✅ Yes |
| Test User | `test` | `YourTestPassword456` | `viewer` | ✅ Yes | ✅ Yes | ❌ No (403) |
| Unauthenticated | - | - | - | ❌ No (401) | ❌ No (401) | ❌ No (401) |

---

## Example Scenarios

### Scenario 1: Admin User Visits Admin Page

```
1. User visits: https://your-site.run.app/en/admin
2. Browser prompts for credentials
3. User enters: username=admin, password=YourAdminPassword123
4. Middleware checks:
   - ✅ User exists
   - ✅ Password matches
   - ✅ Role is 'admin'
   - ✅ Admin can access /admin paths
5. Result: Access granted → Admin page loads
```

### Scenario 2: Test User Visits Admin Page

```
1. User visits: https://your-site.run.app/en/admin
2. Browser prompts for credentials
3. User enters: username=test, password=YourTestPassword456
4. Middleware checks:
   - ✅ User exists
   - ✅ Password matches
   - ✅ Role is 'viewer'
   - ❌ Viewer cannot access /admin paths
5. Result: Access denied → 403 Forbidden error
```

### Scenario 3: Test User Visits Movie Page

```
1. User visits: https://your-site.run.app/en/movies/123
2. Browser prompts for credentials
3. User enters: username=test, password=YourTestPassword456
4. Middleware checks:
   - ✅ User exists
   - ✅ Password matches
   - ✅ Role is 'viewer'
   - ✅ Path is not /admin
5. Result: Access granted → Movie page loads
```

### Scenario 4: Wrong Password

```
1. User visits: https://your-site.run.app/en
2. Browser prompts for credentials
3. User enters: username=admin, password=WrongPassword
4. Middleware checks:
   - ❌ Password does not match
5. Result: 401 Unauthorized → Browser prompts again
```

---

## Configuration Examples

### Example 1: Single Admin User

```bash
AUTH_USERS="admin:SecurePassword123:admin"
```

- Only one user
- Full admin access
- Good for: Solo developer, personal projects

### Example 2: Admin + Test User

```bash
AUTH_USERS="admin:AdminPass123:admin,test:TestPass456:viewer"
```

- Two users with different roles
- Admin has full access
- Test user can view but not edit
- Good for: Demos, client previews

### Example 3: Multiple Viewers

```bash
AUTH_USERS="admin:AdminPass:admin,client1:Pass1:viewer,client2:Pass2:viewer,client3:Pass3:viewer"
```

- One admin, three viewers
- Each viewer has unique credentials
- Good for: Multiple stakeholders reviewing

### Example 4: Team Setup

```bash
AUTH_USERS="brandon:BrandonPass:admin,designer:DesignPass:viewer,pm:PMPass:viewer"
```

- Named users for accountability
- Different passwords per person
- Good for: Small team collaboration

---

## Local Development

### Without Authentication (Default)

```bash
cd web
npm run dev
```

No password required. Good for rapid development.

### With Authentication (Testing)

```bash
export AUTH_USERS="admin:test123:admin,test:test456:viewer"
cd web
npm run dev
```

Now requires login. Test the auth flow locally.

### Testing Different Users

**Terminal 1 - Admin user:**
```bash
curl -u admin:test123 http://localhost:3000/en/admin
# Should work
```

**Terminal 2 - Test user:**
```bash
curl -u test:test456 http://localhost:3000/en/admin
# Should return 403 Forbidden
```

**Terminal 3 - Test user on public page:**
```bash
curl -u test:test456 http://localhost:3000/en/movies
# Should work
```

---

## Browser Behavior

### First Visit
1. Browser shows login dialog
2. Enter username and password
3. Browser caches credentials for the session
4. No need to re-enter on subsequent pages

### Switching Users
To login as a different user:
1. **Chrome/Edge**: Close all browser windows, reopen
2. **Firefox**: Settings → Privacy → Clear Recent History → Active Logins
3. **Safari**: Safari → Clear History → All History
4. **Any browser**: Use Incognito/Private mode

### Logout
HTTP Basic Auth has no "logout" button. To logout:
- Close all browser windows
- Or use incognito mode for temporary access

---

## Security Notes

### ✅ Good Practices

- Use strong, unique passwords for each user
- Rotate passwords regularly
- Use different passwords for production vs staging
- Store passwords in GCP Secret Manager (not in code)
- Use HTTPS only (Cloud Run provides this by default)

### ❌ Bad Practices

- Don't use simple passwords like "password123"
- Don't share passwords between users
- Don't commit passwords to git
- Don't reuse production passwords in development
- Don't send passwords via unencrypted channels

---

## Troubleshooting

### "Browser keeps asking for password"

This is normal! HTTP Basic Auth prompts on every new session. The browser caches credentials until you close it.

### "Test user can access admin pages"

Check your `AUTH_USERS` format:
```bash
# ❌ Wrong - missing role
AUTH_USERS="admin:pass:admin,test:pass"

# ✅ Correct - role specified
AUTH_USERS="admin:pass:admin,test:pass:viewer"
```

### "No one can login"

Check environment variable is set:
```bash
gcloud run services describe lao-cinema-web \
  --region=asia-southeast1 \
  --format="get(spec.template.spec.containers[0].env)"
```

Should show: `AUTH_USERS=...`

### "403 error on admin page"

If you're logged in as a viewer, this is expected! Admin pages require the `admin` role.

---

## Migration from Old System

If you previously used `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD`:

### Old Format (Single User)
```bash
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=MyPassword123
```

### New Format (Multi-User)
```bash
AUTH_USERS="admin:MyPassword123:admin"
```

### Migration Steps

1. Update middleware (already done)
2. Update `deploy.sh` with new `AUTH_USERS` format
3. Deploy with new environment variable
4. Remove old `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` env vars:
   ```bash
   gcloud run services update lao-cinema-web \
     --region=asia-southeast1 \
     --remove-env-vars="BASIC_AUTH_USER,BASIC_AUTH_PASSWORD"
   ```
