#!/bin/bash
# ========================================
# Migration Check Script
# ========================================
# Checks if schema.ts has been modified without generating a migration.
# Can be used as a pre-commit hook or run manually before deploying.
#
# Usage:
#   ./scripts/check-migrations.sh [--staged]
#
# Options:
#   --staged    Check only staged changes (for pre-commit hooks)
#
# Exit codes:
#   0 - No issues found
#   1 - Schema changed without migration (warning only, doesn't block)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

CHECK_STAGED=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --staged)
            CHECK_STAGED=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

echo "🔍 Checking for schema changes without migrations..."

# Check if schema.ts has been modified
if [ "$CHECK_STAGED" = true ]; then
    # Check staged changes
    SCHEMA_CHANGED=$(git diff --cached --name-only | grep -c "db/src/schema.ts" || true)
    MIGRATION_ADDED=$(git diff --cached --name-only | grep -c "db/drizzle/.*\.sql" || true)
else
    # Check uncommitted changes (staged + unstaged)
    SCHEMA_CHANGED=$(git diff --name-only HEAD | grep -c "db/src/schema.ts" || true)
    MIGRATION_ADDED=$(git diff --name-only HEAD | grep -c "db/drizzle/.*\.sql" || true)
fi

if [ "$SCHEMA_CHANGED" -gt 0 ] && [ "$MIGRATION_ADDED" -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: schema.ts has been modified but no migration file was added.${NC}"
    echo ""
    echo "If you made schema changes, please generate a migration:"
    echo ""
    echo "  cd db && npm run db:generate"
    echo ""
    echo "Or use the one-step deploy workflow:"
    echo ""
    echo "  ./scripts/deploy.sh --all --db-generate --env staging"
    echo ""
    echo -e "${YELLOW}Continuing anyway... (this is just a warning)${NC}"
    echo ""
    exit 0  # Warning only, don't block
fi

if [ "$SCHEMA_CHANGED" -gt 0 ] && [ "$MIGRATION_ADDED" -gt 0 ]; then
    echo -e "${GREEN}✓ Schema changed and migration file detected${NC}"
fi

if [ "$SCHEMA_CHANGED" -eq 0 ]; then
    echo -e "${GREEN}✓ No schema changes detected${NC}"
fi

exit 0
