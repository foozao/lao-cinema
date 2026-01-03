# Migration Quick Reference

## Daily Development Workflow

```bash
# 1. Make changes to db/src/schema.ts

# 2. From project root, run the schema update helper:
npm run db:update

# This will:
#   - Generate migration file
#   - Show SQL for review
#   - Apply to local database
#   - Remind you to commit

# 3. Commit
git add db/src/schema.ts db/migrations/
git commit -m "db: your change description"
```

## Deployment

```bash
# Always use --db-migrate for deployments
./scripts/deploy.sh --all --db-migrate

# Specific environments
./scripts/deploy.sh --all --db-migrate --env staging
./scripts/deploy.sh --all --db-migrate --env production
```

## Key Files

- **Schema**: `db/src/schema.ts` (source of truth)
- **Migrations**: `db/migrations/*.sql` (version-controlled)
- **Workflow Doc**: `docs/setup/MIGRATION_WORKFLOW.md` (detailed guide)

## Emergency Contacts

If migrations fail during deployment, contact Brandon immediately.

## Last Reset

**Date**: January 1, 2026  
**Action**: Squashed 44 migrations into single baseline  
**Backup**: `db/migrations-backup-20260101-*/`  
**Reason**: Resolved duplicate migration conflicts (0018, 0025, 0026)
