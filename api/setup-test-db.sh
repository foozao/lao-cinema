#!/bin/bash

# Setup test database for Lao Cinema API
# This script creates a separate test database to prevent tests from affecting development data

set -e

echo "🧪 Setting up test database for Lao Cinema..."

# Get database credentials from .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please create one from .env.example"
    exit 1
fi

# Extract database URL components
source .env
DB_URL=${DATABASE_URL}

# Parse the database URL to get credentials
# Format: postgresql://user:password@host:port/database
if [[ $DB_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ Error: Could not parse DATABASE_URL"
    exit 1
fi

TEST_DB_NAME="lao_cinema_test"

echo "📊 Database info:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Test DB: $TEST_DB_NAME"
echo ""

# Check if test database already exists
echo "🔍 Checking if test database exists..."
DB_EXISTS=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -w $TEST_DB_NAME | wc -l)

if [ $DB_EXISTS -eq 1 ]; then
    echo "⚠️  Test database '$TEST_DB_NAME' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping existing test database..."
        PGPASSWORD=$DB_PASS dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $TEST_DB_NAME
    else
        echo "✅ Using existing test database"
        TEST_DB_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$TEST_DB_NAME"
        
        # Update .env file
        if grep -q "TEST_DATABASE_URL=" .env; then
            sed -i.bak "s|TEST_DATABASE_URL=.*|TEST_DATABASE_URL=$TEST_DB_URL|" .env
        else
            echo "TEST_DATABASE_URL=$TEST_DB_URL" >> .env
        fi
        
        echo "✅ Test database setup complete!"
        echo ""
        echo "📝 Next steps:"
        echo "  1. Run migrations: cd ../db && DATABASE_URL=$TEST_DB_URL npm run migrate"
        echo "  2. Run tests: npm test"
        exit 0
    fi
fi

# Create test database
echo "🏗️  Creating test database '$TEST_DB_NAME'..."
PGPASSWORD=$DB_PASS createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $TEST_DB_NAME

echo "✅ Test database created successfully!"

# Construct test database URL
TEST_DB_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$TEST_DB_NAME"

# Update .env file with TEST_DATABASE_URL
echo "📝 Updating .env file..."
if grep -q "TEST_DATABASE_URL=" .env; then
    # Replace existing TEST_DATABASE_URL
    sed -i.bak "s|TEST_DATABASE_URL=.*|TEST_DATABASE_URL=$TEST_DB_URL|" .env
    echo "  Updated TEST_DATABASE_URL in .env"
else
    # Add TEST_DATABASE_URL
    echo "" >> .env
    echo "# Test Database" >> .env
    echo "TEST_DATABASE_URL=$TEST_DB_URL" >> .env
    echo "  Added TEST_DATABASE_URL to .env"
fi

echo ""
echo "🎉 Test database setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Run migrations on test database:"
echo "     cd ../db && DATABASE_URL=$TEST_DB_URL npm run migrate"
echo ""
echo "  2. Return to api directory and run tests:"
echo "     cd ../api && npm test"
echo ""
echo "💡 Tip: Your development database is safe now. Tests will only affect '$TEST_DB_NAME'"
