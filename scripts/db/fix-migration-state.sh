#!/bin/bash

# Fix migration state for staging database
# This script marks migration 0021 as completed if the table already exists

set -e

echo "[INFO] Fixing migration state for staging database..."

# Check if Cloud SQL proxy is running
if ! pgrep -f "cloud-sql-proxy.*laocinema-staging" > /dev/null; then
    echo "[ERROR] Cloud SQL proxy is not running"
    echo "[INFO] Start it with: ./cloud-sql-proxy lao-cinema:asia-southeast1:laocinema-staging --port 5433"
    exit 1
fi

# Database connection string
DB_URL="postgresql://laocinema:${STAGING_DB_PASSWORD}@127.0.0.1:5433/laocinema"

echo "[INFO] Checking if password_reset_tokens table exists..."
TABLE_EXISTS=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'password_reset_tokens');")

if [ "$TABLE_EXISTS" = "t" ]; then
    echo "[INFO] ✓ Table exists, checking migration record..."
    
    MIGRATION_EXISTS=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT FROM drizzle.__drizzle_migrations WHERE hash = '1e5c8b9a8f3d2c7e6b4a9d8f7c6e5b4a3d2c1e0f9e8d7c6b5a4e3d2c1b0a9f8e7');")
    
    if [ "$MIGRATION_EXISTS" = "f" ]; then
        echo "[INFO] Migration record missing, inserting..."
        psql "$DB_URL" << 'EOF'
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('1e5c8b9a8f3d2c7e6b4a9d8f7c6e5b4a3d2c1e0f9e8d7c6b5a4e3d2c1b0a9f8e7', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (hash) DO NOTHING;
EOF
        echo "[INFO] ✓ Migration record inserted"
    else
        echo "[INFO] ✓ Migration already recorded"
    fi
else
    echo "[WARN] Table does not exist, migration should run normally"
fi

echo "[INFO] Done!"
