# Database Setup Guide

Quick guide to get your local PostgreSQL database running for Lao Cinema.

## Prerequisites

- Docker Desktop installed and running
- Node.js 20+ installed

## Step-by-Step Setup

### 1. Start PostgreSQL with Docker

From the project root:

```bash
docker-compose up -d
```

This starts PostgreSQL in the background. Verify it's running:

```bash
docker-compose ps
```

You should see `lao-cinema-db` with status "Up".

### 2. Install Database Dependencies

```bash
cd db
npm install
```

### 3. Generate Database Schema

```bash
npm run db:generate
```

This creates migration files from the schema in `db/drizzle/`.

### 4. Run Migrations

```bash
npm run db:migrate
```

This creates all the tables in your database:
- movies
- genres
- movie_genres
- cast
- crew
- video_sources

### 5. Seed Sample Data

```bash
npm run db:seed
```

This adds:
- 5 genres (Drama, Romance, Comedy, Action, Documentary)
- 1 sample movie with bilingual content
- Cast and crew
- Video source

## Verify Setup

### Option 1: Use Drizzle Studio (Recommended)

```bash
npm run db:studio
```

Open https://local.drizzle.studio in your browser to view and edit data.

### Option 2: Use psql

```bash
docker exec -it lao-cinema-db psql -U laocinema -d lao_cinema
```

Then run SQL:
```sql
SELECT title, release_date FROM movies;
\q
```

## Database Connection Info

- **Host**: localhost
- **Port**: 5432
- **Database**: lao_cinema
- **User**: laocinema
- **Password**: laocinema_dev
- **Connection String**: `postgres://laocinema:laocinema_dev@localhost:5432/lao_cinema`

## Common Commands

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose stop

# Stop and remove (keeps data)
docker-compose down

# Stop and remove everything (deletes data)
docker-compose down -v

# View logs
docker-compose logs -f postgres

# Restart database
docker-compose restart postgres
```

## Troubleshooting

### Port 5432 Already in Use

If you have PostgreSQL already running locally:

```bash
# Stop local PostgreSQL (macOS)
brew services stop postgresql

# Or change the port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

### Database Won't Start

Check Docker Desktop is running and has enough resources allocated.

### Reset Everything

```bash
# Stop and remove all data
docker-compose down -v

# Start fresh
docker-compose up -d
cd db
npm run db:migrate
npm run db:seed
```

## Next Steps

See `db/README.md` for:
- Detailed schema documentation
- How to query the database
- How to make schema changes
- Production considerations

## Quick Reference

| Task | Command |
|------|---------|
| Start DB | `docker-compose up -d` |
| Stop DB | `docker-compose stop` |
| View DB | `cd db && npm run db:studio` |
| Migrate | `cd db && npm run db:migrate` |
| Seed | `cd db && npm run db:seed` |
| Logs | `docker-compose logs -f postgres` |
