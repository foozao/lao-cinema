---
description: Database migration procedures for local and cloud environments
---

# Database Migration Workflow

## Local Development

### Push schema changes directly (fast iteration)
```bash
cd db
// turbo
npm run db:push
```

### Generate and run migrations (proper workflow)
```bash
cd db
npm run db:generate  # Creates migration file in db/migrations/
npm run db:migrate   # Runs pending migrations
```

### View current schema
```bash
cd db
npm run db:studio    # Opens Drizzle Studio in browser
```

## Cloud SQL (via Deploy Script)

### Run migrations on Cloud SQL
```bash
# Preview environment
./scripts/deploy.sh --db-migrate --env preview

# Staging environment
./scripts/deploy.sh --db-migrate --env staging

# Production environment
./scripts/deploy.sh --db-migrate --env production
```

### Generate + migrate in one step
```bash
./scripts/deploy.sh --db-generate --env staging
```

### Sync content data (movies, accolades, etc.)
```bash
./scripts/deploy.sh --sync-content --env staging
```

## Manual Cloud SQL Access

### Start Cloud SQL Proxy
```bash
# Download proxy (one-time)
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Start proxy (keep running in background)
./cloud-sql-proxy lao-cinema:asia-southeast1:laocinema-preview &
```

### Connect to Cloud SQL
```bash
# Use single quotes for passwords with special characters
psql 'postgresql://laocinema:PASSWORD@127.0.0.1:5432/laocinema'
```

### Run Drizzle commands against Cloud SQL
```bash
cd db
DATABASE_URL='postgresql://laocinema:PASSWORD@127.0.0.1:5432/laocinema' npm run db:push
```

## Migration Best Practices

### DO:
- Generate migrations for all schema changes
- Test migrations locally before running on staging
- Run on staging before production
- Keep migrations small and focused
- Backup before destructive migrations

### DON'T:
- Use `db:push` in production (use migrations instead)
- Run `--db-wipe` on production
- Skip staging when deploying to production
- Delete migration files after they've been run

## Common Scenarios

### Add a new table
1. Edit `db/src/schema.ts`
2. Generate migration: `npm run db:generate`
3. Review migration file in `db/migrations/`
4. Push to local: `npm run db:push`
5. Test locally
6. Deploy: `./scripts/deploy.sh --db-migrate --env staging`

### Add a column to existing table
1. Edit `db/src/schema.ts`
2. Generate migration: `npm run db:generate`
3. Check if migration handles existing data correctly
4. Push to local: `npm run db:push`
5. Deploy with migration

### Rename a column (careful!)
1. Create migration that:
   - Adds new column
   - Copies data from old to new
   - Drops old column
2. Update application code to use new column name
3. Deploy API and migration together

## Troubleshooting

### "relation already exists"
Migration trying to create something that exists. Check if migration was partially applied.

### "column does not exist"
Code references column that doesn't exist yet. Deploy migration before code that uses it.

### Identifier truncation warnings
PostgreSQL truncates long identifiers. These are usually harmless notices.
```
NOTICE: identifier "very_long_table_name_pk" will be truncated
```

### Reset test database
```bash
cd db
npm run db:push:test
```

## Backup Before Dangerous Operations

### Export database dump
```bash
./scripts/db/backup-db.sh --env staging
```

### Restore from dump
```bash
psql 'postgresql://...' < backup.sql
```
