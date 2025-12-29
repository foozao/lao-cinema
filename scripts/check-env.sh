#!/bin/bash
# Compare .env.example files with their corresponding .env files
# Reports missing variables (in example but not in .env) and extra variables (in .env but not in example)
# Usage: ./scripts/check-env.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Checking .env files against .env.example..."
echo ""

ERRORS_FOUND=0

# Find all .env.example files
EXAMPLE_FILES=$(find . -type f \( -name ".env.example" -o -name "env.example" \) -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*")

if [ -z "$EXAMPLE_FILES" ]; then
  echo "⚠️  No .env.example files found"
  exit 0
fi

for example_file in $EXAMPLE_FILES; do
  # Determine corresponding .env file path
  dir=$(dirname "$example_file")
  if [[ "$example_file" == */env.example ]]; then
    # Handle web/env.example -> web/.env
    env_file="$dir/.env"
  else
    # Handle standard .env.example -> .env
    env_file="${example_file%.example}"
  fi
  
  rel_example="${example_file#./}"
  rel_env="${env_file#./}"
  
  echo -e "${BLUE}Checking:${NC} $rel_env"
  
  # Check if .env exists
  if [ ! -f "$env_file" ]; then
    echo -e "  ${YELLOW}⚠️  File missing:${NC} $rel_env does not exist"
    echo -e "  ${YELLOW}   Suggestion:${NC} cp $rel_example $rel_env"
    echo ""
    ERRORS_FOUND=1
    continue
  fi
  
  # Extract variable names from .env.example (ignoring comments and empty lines)
  EXAMPLE_VARS=$(grep -v '^#' "$example_file" | grep -v '^$' | cut -d'=' -f1 | sort)
  
  # Extract variable names from .env (ignoring comments and empty lines)
  ENV_VARS=$(grep -v '^#' "$env_file" | grep -v '^$' | cut -d'=' -f1 | sort)
  
  # Find missing variables (in example but not in .env)
  MISSING=$(comm -23 <(echo "$EXAMPLE_VARS") <(echo "$ENV_VARS"))
  
  # Find extra variables (in .env but not in example)
  EXTRA=$(comm -13 <(echo "$EXAMPLE_VARS") <(echo "$ENV_VARS"))
  
  if [ -n "$MISSING" ]; then
    echo -e "  ${RED}❌ Missing variables:${NC}"
    while IFS= read -r var; do
      if [ -n "$var" ]; then
        echo -e "     - ${RED}$var${NC}"
      fi
    done <<< "$MISSING"
    ERRORS_FOUND=1
  fi
  
  if [ -n "$EXTRA" ]; then
    echo -e "  ${YELLOW}⚠️  Extra variables (not in example):${NC}"
    while IFS= read -r var; do
      if [ -n "$var" ]; then
        echo -e "     - ${YELLOW}$var${NC}"
      fi
    done <<< "$EXTRA"
  fi
  
  if [ -z "$MISSING" ] && [ -z "$EXTRA" ]; then
    echo -e "  ${GREEN}✅ All variables present${NC}"
  fi
  
  echo ""
done

if [ $ERRORS_FOUND -eq 0 ]; then
  echo -e "${GREEN}✨ All .env files are properly configured!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some .env files have missing variables${NC}"
  echo -e "${YELLOW}💡 Fix them and re-run this script to verify${NC}"
  exit 1
fi
