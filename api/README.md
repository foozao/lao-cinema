# Lao Cinema API

Backend API for the Lao Cinema streaming platform.

## Tech Stack

- **Framework**: Fastify
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Language**: TypeScript

## Setup

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Set Up PostgreSQL

You need a PostgreSQL database. Options:

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb lao_cinema
```

**Option B: Docker**
```bash
docker run --name lao-cinema-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=lao_cinema \
  -p 5432:5432 \
  -d postgres:16
```

**Option C: Cloud (Neon, Supabase, etc.)**
- Sign up for a free PostgreSQL database
- Copy the connection string

### 3. Configure Environment

```bash
cp .env.example .env

# Edit .env with your database URL
DATABASE_URL=postgresql://user:password@localhost:5432/lao_cinema
```

### 4. Run Migrations

```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

API will be running on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```

### Movies

**Get all movies**
```
GET /api/movies
```

**Get movie by ID**
```
GET /api/movies/:id
```

**Create movie** (import from TMDB)
```
POST /api/movies
Content-Type: application/json

{
  "tmdb_id": 550,
  "title": { "en": "Fight Club", "lo": "..." },
  "overview": { "en": "...", "lo": "..." },
  "release_date": "1999-10-15",
  "adult": false,
  "genres": [...],
  "video_sources": [...]
}
```

**Update movie**
```
PUT /api/movies/:id
Content-Type: application/json

{
  "title": { "en": "Updated Title", "lo": "..." }
}
```

**Delete movie**
```
DELETE /api/movies/:id
```

## Database Schema

### Movies Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tmdb_id` | Integer | TMDB movie ID (unique) |
| `imdb_id` | Text | IMDB ID |
| `title` | JSONB | `{ en: string, lo?: string }` |
| `overview` | JSONB | `{ en: string, lo?: string }` |
| `tagline` | JSONB | `{ en: string, lo?: string }` |
| `release_date` | Text | ISO date string |
| `runtime` | Integer | Minutes |
| `vote_average` | Real | Rating 0-10 |
| `genres` | JSONB | Array of genre objects |
| `video_sources` | JSONB | Array of video source objects |
| `cast` | JSONB | Array of cast members |
| `crew` | JSONB | Array of crew members |
| `created_at` | Timestamp | Auto-generated |
| `updated_at` | Timestamp | Auto-updated |

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate migration files
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

### Database Migrations

When you change the schema in `src/db/schema.ts`:

```bash
# Generate migration
npm run db:generate

# Apply to database
npm run db:push
```

### Drizzle Studio

Visual database editor:

```bash
npm run db:studio
```

Opens at `https://local.drizzle.studio`

## Production Deployment

### Build

```bash
npm run build
```

### Environment Variables

Required for production:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - Frontend URL (e.g., https://laocinema.com)
- `LOG_LEVEL` - `info`, `warn`, `error`

### Start

```bash
npm start
```

## Connecting Frontend

Update Next.js to call the API:

```typescript
// In Next.js Server Actions
const response = await fetch('http://localhost:3001/api/movies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(movieData),
});
```

## Troubleshooting

### "Cannot connect to database"
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Test connection: `psql $DATABASE_URL`

### "Port 3001 already in use"
- Change PORT in `.env`
- Or kill existing process: `lsof -ti:3001 | xargs kill`

### "Module not found"
- Run `npm install`
- Check `package.json` dependencies

## Next Steps

- [ ] Add authentication (JWT)
- [ ] Add user management
- [ ] Add video upload/transcoding
- [ ] Add search and filtering
- [ ] Add caching (Redis)
- [ ] Add rate limiting
- [ ] Add API documentation (Swagger)

## Resources

- [Fastify Documentation](https://fastify.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
