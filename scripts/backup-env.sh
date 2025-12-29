#!/bin/bash
# Backup all .env files to a specified directory
# Usage: ./scripts/backup-env.sh /path/to/backup/directory

set -e

if [ -z "$1" ]; then
  echo "Error: Backup destination directory required"
  echo "Usage: $0 /path/to/backup/directory"
  exit 1
fi

BACKUP_DIR="$1"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BACKUP_DIR}/env_backup_${TIMESTAMP}"

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "📦 Backing up .env files to: $BACKUP_PATH"
echo ""

# Find all .env files (excluding .env.example files)
ENV_FILES=$(find . -type f -name ".env" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*")

if [ -z "$ENV_FILES" ]; then
  echo "⚠️  No .env files found"
  exit 0
fi

# Backup each file with its relative path
for file in $ENV_FILES; do
  # Get relative path and create directory structure in backup
  rel_path="${file#./}"
  dir_path=$(dirname "$rel_path")
  
  mkdir -p "$BACKUP_PATH/$dir_path"
  cp "$file" "$BACKUP_PATH/$rel_path"
  
  echo "✅ Backed up: $rel_path"
done

echo ""
echo "✨ Backup complete!"
echo "📁 Location: $BACKUP_PATH"
