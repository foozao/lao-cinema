# Environment Variables Reference

Complete reference for all environment variables across the Lao Cinema platform.

---

## Quick Setup

```bash
# Copy example files
cp web/.env.example web/.env
cp api/.env.example api/.env
cp db/.env.example db/.env

# Edit each file with your actual values
```

---

## Web App (`/web`)

**File**: `.env.local`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TMDB_API_KEY` | Yes | - | TMDB API key for movie imports. Get from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3001/api` | Backend API base URL |
| `NEXT_PUBLIC_SITE_URL` | No | `https://laocinema.com` | Site URL for SEO, emails, OAuth callbacks |
| `NEXT_PUBLIC_TMDB_API_KEY` | No | - | Client-side TMDB key (less secure, avoid if possible) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | - | Sentry error monitoring DSN (client-side) |
| `SENTRY_ORG` | CI/CD | - | Sentry organization for source map uploads |
| `SENTRY_PROJECT` | CI/CD | - | Sentry project name |
| `SENTRY_AUTH_TOKEN` | CI/CD | - | Sentry auth token for CI/CD |

### Production (Cloud Run)

Additional variables for GCP deployment:

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_USERS` | Yes | HTTP Basic Auth users. Format: `username:password:role,user2:pass2:role2` |

Roles: `admin` (full access) or `viewer` (no admin pages)

---

## Backend API (`/api`)

**File**: `.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `TEST_DATABASE_URL` | For tests | - | Test database connection (must contain `_test`) |
| `PORT` | No | `3001` | API server port |
| `HOST` | No | `0.0.0.0` | API server host |
| `LOG_LEVEL` | No | `info` | Logging level (`debug`, `info`, `warn`, `error`) |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `VIDEO_BASE_URL` | Yes | - | Base URL for video files (see below) |
| `VIDEO_TOKEN_SECRET` | Yes | - | Secret for signing video access tokens (32+ chars) |
| `VIDEO_SERVER_URL` | Yes | - | Video server URL for generating signed URLs |
| `FRONTEND_URL` | Yes | `http://localhost:3000` | Frontend URL for email links |
| `BREVO_API_KEY` | For email | - | Brevo (Sendinblue) API key for transactional emails |
| `BREVO_SENDER_EMAIL` | For email | - | Email sender address (e.g., `noreply@mail.laocinema.com`) |
| `BREVO_SENDER_NAME` | For email | `Lao Cinema` | Email sender display name |
| `MAX_RENTALS_PER_MOVIE` | No | `50` | Pre-alpha rental limit per movie (0 to disable) |
| `SENTRY_DSN` | No | - | Sentry error monitoring DSN |

### Video URL Configuration

```bash
# Local development (video-server)
VIDEO_BASE_URL=http://localhost:3002/videos/hls

# Local development (Next.js public)
VIDEO_BASE_URL=http://localhost:3000/videos/hls

# Production (Google Cloud Storage)
VIDEO_BASE_URL=https://storage.googleapis.com/lao-cinema-videos/hls
```

### Database URL Format

```bash
# Standard format
DATABASE_URL=postgresql://username:password@host:port/database

# Local development example
DATABASE_URL=postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema

# Test database
TEST_DATABASE_URL=postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema_test
```

---

## Database (`/db`)

**File**: `.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (same as API) |

---

## Docker Compose

**File**: `docker-compose.yml` (root)

Environment variables are defined inline:

```yaml
services:
  postgres:
    environment:
      POSTGRES_USER: laocinema
      POSTGRES_PASSWORD: laocinema_dev
      POSTGRES_DB: lao_cinema
```

---

## Video Server (`/video-server`)

No environment variables - uses hardcoded port 3002.

---

## Scripts (`/scripts`)

### Cloud Run Deployment

**File**: `.env.web.yaml`

```yaml
# Copy from .env.web.yaml.example
AUTH_USERS: "admin:YourAdminPassword:admin,viewer:ViewerPassword:viewer"
```

---

## Variable Hierarchy

Some variables need to match across packages:

```
DATABASE_URL
├── api/.env          # Backend reads this
├── db/.env           # Migrations use this
└── (must be identical)

VIDEO_BASE_URL
├── api/.env          # Used in movie responses
└── (frontend uses URLs from API responses)
```

---

## Security Notes

### DO ✅
- Use `.env.local` for web (gitignored)
- Use server-side `TMDB_API_KEY` (not exposed to browser)
- Use strong passwords for `AUTH_USERS`
- Use separate test database with `_test` suffix

### DON'T ❌
- Commit `.env` files to git
- Use `NEXT_PUBLIC_` prefix for sensitive keys
- Share database credentials
- Use production database for tests

---

## Example Configurations

### Local Development

```bash
# web/.env.local
TMDB_API_KEY=your_tmdb_api_key
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# api/.env
DATABASE_URL=postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema
TEST_DATABASE_URL=postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema_test
PORT=3001
CORS_ORIGIN=http://localhost:3000
VIDEO_BASE_URL=http://localhost:3002/videos/hls

# db/.env
DATABASE_URL=postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema
```

### Production (GCP Cloud Run)

```bash
# web/.env.local (build time)
TMDB_API_KEY=your_tmdb_api_key
NEXT_PUBLIC_API_URL=https://api.laocinema.com/api  # Production
# NEXT_PUBLIC_API_URL=https://api.preview.laocinema.com/api  # Preview
NEXT_PUBLIC_SITE_URL=https://laocinema.com

# Cloud Run environment variables (runtime)
AUTH_USERS=admin:SecurePassword123:admin
NODE_ENV=production

# api/.env
DATABASE_URL=postgresql://user:pass@/lao_cinema?host=/cloudsql/project:region:instance
VIDEO_BASE_URL=https://storage.googleapis.com/lao-cinema-videos/hls
VIDEO_SERVER_URL=https://stream.laocinema.com  # Production
# VIDEO_SERVER_URL=https://stream.preview.laocinema.com  # Preview
CORS_ORIGIN=https://laocinema.com
```

---

## Troubleshooting

### "TMDB_API_KEY not set"
- Ensure `web/.env.local` exists (not `.env`)
- Restart dev server after adding variables

### "DATABASE_URL required"
- Create `api/.env` with valid PostgreSQL connection
- Verify PostgreSQL is running (`docker-compose up -d`)

### "TEST_DATABASE_URL must point to test database"
- Test URL must contain `_test` in database name
- Create test database: `createdb lao_cinema_test`

### Videos not loading
- Check `VIDEO_BASE_URL` points to accessible server
- For local dev, ensure video-server is running on port 3002
- Verify HLS files exist at expected paths
