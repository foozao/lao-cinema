#!/bin/bash
# Security Audit Script
# Checks dependencies for known vulnerabilities across all workspaces

set -e

echo "🔒 Lao Cinema Security Audit"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

AUDIT_FAILED=0

# Function to run npm audit
run_audit() {
  local workspace=$1
  local path=$2
  
  echo ""
  echo "📦 Auditing: $workspace"
  echo "----------------------------------------"
  
  cd "$path"
  
  # Run npm audit and capture exit code
  if npm audit --audit-level=moderate; then
    echo -e "${GREEN}✓ No vulnerabilities found${NC}"
  else
    echo -e "${RED}✗ Vulnerabilities detected${NC}"
    AUDIT_FAILED=1
    
    # Show fix suggestions
    echo ""
    echo -e "${YELLOW}Run 'npm audit fix' to automatically fix issues${NC}"
    echo -e "${YELLOW}Run 'npm audit fix --force' for breaking changes${NC}"
  fi
  
  cd - > /dev/null
}

# Audit each workspace
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_audit "API" "$PROJECT_ROOT/api"
run_audit "Web" "$PROJECT_ROOT/web"
run_audit "Database" "$PROJECT_ROOT/db"
run_audit "Video Server" "$PROJECT_ROOT/video-server"

echo ""
echo "=============================="
if [ $AUDIT_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ Security audit passed${NC}"
  exit 0
else
  echo -e "${RED}✗ Security audit failed${NC}"
  echo ""
  echo "Please review and fix vulnerabilities before deploying."
  exit 1
fi
