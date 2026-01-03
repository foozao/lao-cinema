# Database Migration Workflow

**Last Updated**: January 1, 2026  
**Status**: MANDATORY - All developers must follow this workflow

## Overview

This project uses **Drizzle ORM migrations** exclusively. The `db:push` command has been deprecated - use `db:migrate` for all environments.

## Critical Rules

### ✅ **DO**
- Use `npm run db:update` from project root (guided workflow)
- Run `npm run db:generate` before committing schema changes
- Use `./deploy.sh --db-migrate` for all deployments
- Review generated migration files before committing
- Keep migration files in version control

### ❌ **DON'T**
- **NEVER** use `db:push` (deprecated)
- **NEVER** manually edit migration files after generation
- **NEVER** delete migration files once deployed
- **NEVER** use `--db-update` flag on staging or production

## Workflow Steps

### 1. Local Development

When making schema changes during development:

```bash
# From project root - use the guided workflow
npm run db:update

# This will:
# 1. Check for schema.ts changes
# 2. Generate migration file
# 3. Show SQL for review
# 4. Apply to local database
# 5. Remind you to commit
```

**Use this for**: All schema changes, including experimenting

### 2. Before Committing (Generate Migration)

Once your schema changes are finalized:

```bash
# Generate migration file from schema changes
cd db
npm run db:generate

# This creates a new migration file in db/migrations/
# Example: 0001_brave_wonderman.sql
```

**Review the generated file**:
- Open `db/migrations/0001_brave_wonderman.sql`
- Verify it matches your intended changes
- Check for unexpected DROP statements
- Ensure foreign keys are correct

### 3. Test Migration Locally

Before committing, test that the migration works:

```bash
# Option A: Test on a fresh database
cd db
# Drop local database and recreate
npm run db:migrate

# Option B: Test on test database
npm run db:migrate:test
```

### 4. Commit Migration

```bash
git add db/migrations/
git add db/src/schema.ts
git commit -m "feat: add user watchlist table"
```

### 5. Deploy to Staging/Production

```bash
# Deploy with migrations
./scripts/deploy.sh --all --db-migrate --env staging

# Or production
./scripts/deploy.sh --all --db-migrate --env production
```

## Migration Files Structure

```
db/
├── migrations/
│   ├── 0000_living_banshee.sql    # Initial schema (Jan 2026)
│   ├── 0001_next_feature.sql      # Next feature
│   ├── 0002_another_feature.sql   # Another feature
│   └── meta/
│       └── _journal.json          # Migration tracking
└── src/
    └── schema.ts                  # Source of truth
```

## Commands Reference

| Command | Environment | Purpose |
|---------|-------------|---------|
| `npm run db:update` | Local only | Guided schema update workflow (recommended) |
| `npm run db:generate` | Local only | Create migration file from schema |
| `npm run db:migrate` | Any | Run pending migrations |
| `npm run db:migrate:test` | Local only | Run migrations on test database |
| `npm run db:reset:test` | Local only | Drop/recreate test database + migrate |

## Deployment Options

### Using deploy.sh

```bash
# Standard deployment with migrations
./scripts/deploy.sh --all --db-migrate

# Deploy specific service + migrations
./scripts/deploy.sh --api --db-migrate

# Deploy to specific environment
./scripts/deploy.sh --all --db-migrate --env production
```

### Flags
- `--db-migrate`: Run migrations (recommended for staging/production)
- `--db-update`: Use push instead (preview only, interactive)
- `--db-wipe`: Replace Cloud SQL with local data (destructive)

## Troubleshooting

### Migration Conflicts

If you see errors like "duplicate key value" or "relation already exists":

1. **Check migration history**:
   ```sql
   SELECT * FROM __drizzle_migrations ORDER BY created_at;
   ```

2. **Check for duplicate migration numbers**:
   ```bash
   ls -la db/migrations/*.sql
   ```

3. **If migrations are out of sync**, contact the team lead

### Schema Drift

If local schema doesn't match Cloud SQL:

```bash
# Option 1: Reset local to match production (data loss)
cd db
npm run db:migrate

# Option 2: Generate migration from local schema
npm run db:generate
# Review, commit, deploy
```

### Failed Migration

If a migration fails during deployment:

```bash
# Check Cloud SQL migration table
# Connect via Cloud SQL proxy
./cloud-sql-proxy <CONNECTION_NAME> --port=5433
psql "postgresql://laocinema:<PASSWORD>@127.0.0.1:5433/laocinema"

# Check failed migration
SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;

# Fix requires manual intervention - contact team lead
```

## Migration History

### January 1, 2026 - Fresh Start
- **Action**: Squashed all 44 migrations into single initial migration
- **Reason**: Resolved duplicate migration conflicts (0018, 0025, 0026)
- **Backup**: `db/migrations-backup-20260101-212900/`
- **New baseline**: `0000_living_banshee.sql`

## Best Practices

1. **Atomic Migrations**: Each migration should be a single, focused change
2. **Reversible**: Avoid destructive changes when possible
3. **Tested**: Always test migrations on staging before production
4. **Documented**: Add comments to complex migrations
5. **Coordinated**: Communicate schema changes with the team

## Emergency Procedures

### Rollback a Migration

Drizzle doesn't support automatic rollback. Manual process:

1. **Stop deployments**
2. **Write reverse migration**:
   ```sql
   -- Reverse migration example
   DROP TABLE IF EXISTS new_table;
   ALTER TABLE old_table ADD COLUMN deleted_column text;
   ```
3. **Test on staging**
4. **Deploy to production**
5. **Remove migration from journal**

### Reset Everything (Nuclear Option)

Only use if absolutely necessary:

```bash
# 1. Backup production data
./scripts/db/export-db-dump.sh

# 2. Drop and recreate database
# 3. Run all migrations from scratch
npm run db:migrate

# 4. Restore data (if needed)
```

## Questions?

Contact: Brandon (project lead)
