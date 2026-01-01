# Migration Quick Reference

## Daily Development Workflow

```bash
# 1. Make changes to db/src/schema.ts
# 2. Push to local database (rapid iteration)
cd db
npm run db:push

# 3. When ready to commit, generate migration
npm run db:generate

# 4. Review the generated migration file
# 5. Test it (optional but recommended)
npm run db:migrate

# 6. Commit
git add .
git commit -m "feat: your change description"
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
