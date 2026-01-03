#!/bin/bash
# Lao Cinema - Schema Update Helper
# Guides through the proper migration workflow when schema.ts changes

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_DIR="$PROJECT_ROOT/db"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                  Schema Update Helper                          ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Check for schema changes
log_step "1/5: Checking for schema changes..."

cd "$PROJECT_ROOT"

SCHEMA_CHANGED=false
if git diff --name-only | grep -q "db/src/schema.ts"; then
    SCHEMA_CHANGED=true
    log_info "schema.ts has uncommitted changes"
elif git diff --cached --name-only | grep -q "db/src/schema.ts"; then
    SCHEMA_CHANGED=true
    log_info "schema.ts has staged changes"
else
    log_warn "No uncommitted changes to schema.ts detected"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Exiting. Run this script after modifying schema.ts"
        exit 0
    fi
fi

# Step 2: Generate migration
log_step "2/5: Generating migration file..."
echo ""

cd "$DB_DIR"

# Capture the output to find the new migration file
BEFORE_MIGRATIONS=$(ls -1 migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')

npm run db:generate 2>&1 | tee /tmp/drizzle-generate.log

AFTER_MIGRATIONS=$(ls -1 migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')

if [ "$AFTER_MIGRATIONS" -gt "$BEFORE_MIGRATIONS" ]; then
    # Find the newest migration file
    NEW_MIGRATION=$(ls -t migrations/*.sql | head -1)
    log_info "New migration created: $NEW_MIGRATION"
    echo ""
    
    # Step 3: Show migration for review
    log_step "3/5: Review the generated SQL:"
    echo ""
    echo -e "${YELLOW}────────────────────────────────────────────────────────────────${NC}"
    cat "$NEW_MIGRATION"
    echo -e "${YELLOW}────────────────────────────────────────────────────────────────${NC}"
    echo ""
    
    read -p "Does this migration look correct? (Y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log_warn "Migration rejected. You can:"
        echo "  1. Edit the migration file: $NEW_MIGRATION"
        echo "  2. Delete it and modify schema.ts again"
        echo "  3. Run this script again when ready"
        exit 1
    fi
else
    log_info "No new migration needed (schema matches existing migrations)"
    echo ""
fi

# Step 4: Run migration locally
log_step "4/5: Apply migration to local database?"
echo ""

read -p "Run db:migrate on local database? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    log_info "Running migrations..."
    npm run db:migrate
    
    # Also update test database
    read -p "Also update test database? (Y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        npm run db:migrate:test
    fi
else
    log_warn "Skipped local migration. Remember to run: cd db && npm run db:migrate"
fi

# Step 5: Remind about git
log_step "5/5: Git reminder"
echo ""

cd "$PROJECT_ROOT"

# Check if there are new migration files to commit
UNCOMMITTED_MIGRATIONS=$(git status --porcelain db/migrations/ 2>/dev/null | grep -c "^??" || true)
MODIFIED_MIGRATIONS=$(git status --porcelain db/migrations/ 2>/dev/null | grep -c "^ M\|^M " || true)

if [ "$UNCOMMITTED_MIGRATIONS" -gt 0 ] || [ "$MODIFIED_MIGRATIONS" -gt 0 ]; then
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  IMPORTANT: Commit your migration files before deploying!    ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  git add db/migrations/"
    echo "  git add db/src/schema.ts"
    echo "  git commit -m 'db: add migration for <describe changes>'"
    echo ""
fi

echo -e "${GREEN}✓ Schema update workflow complete${NC}"
echo ""
echo "Next steps for deployment:"
echo "  1. Commit schema.ts and migration files"
echo "  2. Deploy with: scripts/deploy.sh --db-migrate --env <env>"
echo ""
