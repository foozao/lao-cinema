# Backend Setup Guide

Complete guide to set up the Lao Cinema backend API.

## Prerequisites

- Node.js 20.9.0+
- PostgreSQL 14+ (or Docker)
- npm or pnpm

## Quick Start

### 1. Install Backend Dependencies

```bash
cd api
npm install
```

### 2. Set Up PostgreSQL Database

Choose one of these options:

#### Option A: Docker Compose (Recommended for Development)

From the project root:

```bash
# Start PostgreSQL in the background
docker-compose up -d

# Verify it's running
docker-compose ps
```

You should see `lao-cinema-db` with status "Up".

**Connection details:**
- Host: localhost
- Port: 5432
- Database: lao_cinema
- User: laocinema
- Password: laocinema_dev
- DATABASE_URL: `postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema`

**Common commands:**
```bash
# Start database
docker-compose up -d

# Stop database
docker-compose stop

# View logs
docker-compose logs -f postgres

# Restart database
docker-compose restart postgres

# Stop and remove (keeps data)
docker-compose down

# Stop and remove everything (deletes data)
docker-compose down -v
```

#### Option B: Local PostgreSQL (macOS)

```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create database
createdb lao_cinema

# Your DATABASE_URL will be:
# postgresql://your_username@localhost:5432/lao_cinema
```

#### Option C: Docker (Manual)

```bash
# Run PostgreSQL in Docker
docker run --name lao-cinema-db \
  -e POSTGRES_USER=laocinema \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=lao_cinema \
  -p 5432:5432 \
  -d postgres:16

# Your DATABASE_URL will be:
# postgresql://laocinema:password@localhost:5432/lao_cinema
```

#### Option D: Cloud Database (Recommended for Production)

**Neon (Free tier available)**
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string

**Supabase (Free tier available)**
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (use "Connection pooling" for production)

### 3. Configure Environment

```bash
cd api
cp .env.example .env

# Edit .env with your database URL
nano .env
```

Add your database URL:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/lao_cinema
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### 4. Set Up Database Schema

```bash
cd db
npm install

# Generate migration files from schema
npm run db:generate

# Apply migrations (creates all tables)
npm run db:migrate

# Optional: Seed with sample data
npm run db:seed
```

This creates all database tables:
- movies, movie_translations
- genres, genre_translations, movie_genres
- people, people_translations
- movie_cast, movie_cast_translations
- movie_crew, movie_crew_translations
- video_sources, movie_images
- users, user_sessions, oauth_accounts
- rentals, watch_progress
- And more...

### 5. Start Backend Server

```bash
npm run dev
```

You should see:
```
🚀 Lao Cinema API running on http://0.0.0.0:3001
📊 Health check: http://0.0.0.0:3001/health
```

### 6. Configure Frontend

```bash
cd ../web

# Add API URL to .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" >> .env.local

# Restart Next.js dev server
npm run dev
```

## Testing the Setup

### 1. Test Backend Health

```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

### 2. Test Movie Import

1. Go to http://localhost:3000/admin/import
2. Enter a TMDB ID (e.g., `550` for Fight Club)
3. Click "Fetch"
4. Review the preview
5. Click "Import Movie"
6. Should redirect to edit page with the imported movie

### 3. Check Database

```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# View movies
SELECT id, title, release_date FROM movies;
```

Or use Drizzle Studio (recommended):
```bash
cd db
npm run db:studio
```

Opens at https://local.drizzle.studio - a visual database editor where you can view and edit all tables.

## Project Structure

```
lao-cinema/
├── api/                    # Backend API
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts  # Database schema
│   │   │   └── index.ts   # DB connection
│   │   ├── routes/
│   │   │   └── movies.ts  # Movie endpoints
│   │   └── index.ts       # Server entry point
│   ├── drizzle/           # Generated migrations
│   ├── package.json
│   ├── tsconfig.json
│   └── .env               # Environment variables
│
└── web/                   # Next.js frontend
    ├── app/
    │   └── admin/
    │       ├── import/    # TMDB import page
    │       └── edit/      # Movie edit page
    ├── lib/
    │   ├── api/
    │   │   └── client.ts  # API client
    │   └── tmdb/          # TMDB integration
    └── .env.local         # Frontend env vars
```

## API Endpoints

### Movies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/movies` | Get all movies |
| GET | `/api/movies/:id` | Get movie by ID |
| POST | `/api/movies` | Create movie |
| PUT | `/api/movies/:id` | Update movie |
| DELETE | `/api/movies/:id` | Delete movie |

### Example: Create Movie

```bash
curl -X POST http://localhost:3001/api/movies \
  -H "Content-Type: application/json" \
  -d '{
    "tmdb_id": 550,
    "title": {"en": "Fight Club", "lo": "ສະໂມສອນ"},
    "overview": {"en": "An insomniac...", "lo": "..."},
    "release_date": "1999-10-15",
    "adult": false,
    "genres": [{"id": 18, "name": {"en": "Drama"}}],
    "video_sources": []
  }'
```

## Development Workflow

### Making Schema Changes

1. Edit `api/src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Apply to database: `npm run db:push`
4. Restart API server

### Adding New Endpoints

1. Create route file in `api/src/routes/`
2. Register in `api/src/index.ts`
3. Update frontend API client in `web/lib/api/client.ts`

## Troubleshooting

### "Cannot connect to database"

**Check PostgreSQL is running:**
```bash
# macOS
brew services list | grep postgresql

# Docker
docker ps | grep lao-cinema-db
```

**Test connection:**
```bash
psql $DATABASE_URL -c "SELECT 1"
```

**Common fixes:**
- Verify DATABASE_URL in `.env`
- Check PostgreSQL is running
- Ensure database exists: `createdb lao_cinema`
- Check firewall/network settings

### "Port 3001 already in use"

```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
lsof -ti:3001 | xargs kill

# Or change PORT in .env
PORT=3002
```

### "Module not found" errors

```bash
cd api
rm -rf node_modules package-lock.json
npm install
```

### Frontend can't connect to API

**Check CORS settings:**
- Verify `CORS_ORIGIN` in `api/.env` matches your frontend URL
- Default: `http://localhost:3000`

**Check API URL in frontend:**
- Verify `NEXT_PUBLIC_API_URL` in `web/.env.local`
- Default: `http://localhost:3001/api`

### Database migration errors

```bash
# Reset database (WARNING: deletes all data)
npm run db:push -- --force

# Or manually drop and recreate
dropdb lao_cinema
createdb lao_cinema
cd db
npm run db:migrate
npm run db:seed
```

### Port 5432 already in use

If you have PostgreSQL already running locally:

```bash
# Stop local PostgreSQL (macOS)
brew services stop postgresql

# Or change the port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

### Reset everything (Docker Compose)

```bash
# Stop and remove all data
docker-compose down -v

# Start fresh
docker-compose up -d
cd db
npm run db:migrate
npm run db:seed
```

## Production Deployment

### Backend

1. **Build:**
   ```bash
   cd api
   npm run build
   ```

2. **Set environment variables:**
   - `DATABASE_URL` - Production database URL
   - `PORT` - Server port
   - `CORS_ORIGIN` - Frontend production URL
   - `NODE_ENV=production`

3. **Run migrations:**
   ```bash
   npm run db:push
   ```

4. **Start server:**
   ```bash
   npm start
   ```

### Frontend

Update `NEXT_PUBLIC_API_URL` to production API URL:
```env
# Production
NEXT_PUBLIC_API_URL=https://api.laocinema.com/api
# Preview
NEXT_PUBLIC_API_URL=https://api.preview.laocinema.com/api
```

## Quick Reference

| Task | Command |
|------|---------|
| Start DB | `docker-compose up -d` |
| Stop DB | `docker-compose stop` |
| View DB | `cd db && npm run db:studio` |
| Migrate | `cd db && npm run db:migrate` |
| Seed | `cd db && npm run db:seed` |
| Logs | `docker-compose logs -f postgres` |
| Start API | `cd api && npm run dev` |

## Implemented Features

- [x] User authentication (session-based with scrypt)
- [x] User management (registration, login, profile)
- [x] Search and filtering (people, production companies)
- [x] Rental system with cross-device sync
- [x] Watch progress tracking
- [x] Video analytics
- [x] Audit logging
- [x] Role-based access control

## Next Steps

- [ ] OAuth providers (Google, Apple)
- [ ] Password reset flow (requires email service)
- [ ] Pagination for large datasets
- [ ] Caching layer (Redis)
- [ ] Rate limiting
- [ ] API documentation (Swagger/OpenAPI)
- [ ] CI/CD pipeline

## Resources

- [API README](/api/README.md)
- [Fastify Documentation](https://fastify.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
