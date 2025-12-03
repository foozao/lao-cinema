# Database Synchronization

Scripts to sync data between your local PostgreSQL database and Cloud SQL.

## Prerequisites

1. **Cloud SQL Proxy** - Install if you haven't already:
   ```bash
   gcloud components install cloud-sql-proxy
   ```

2. **PostgreSQL client tools** - Should already be installed with PostgreSQL:
   - `psql`
   - `pg_dump`

## Scripts

### 1. Sync Local → Cloud (`sync-db-to-cloud.sh`)

Push your local database to Cloud SQL:

```bash
./sync-db-to-cloud.sh
```

**Use this when:**
- You've added movies/data locally and want to deploy it
- You want to test with production-like data in the cloud
- You're setting up the cloud database for the first time

### 2. Sync Cloud → Local (`sync-db-from-cloud.sh`)

Pull Cloud SQL database to your local machine:

```bash
./sync-db-from-cloud.sh
```

**Use this when:**
- You want to work with production data locally
- Someone else has updated the cloud database
- You need to debug issues with production data

⚠️ **Warning**: This will overwrite your local database!

## How It Works

Both scripts:
1. Start the Cloud SQL proxy (if not already running)
2. Use `pg_dump` to create a SQL dump file
3. Use `psql` to restore the dump to the target database
4. Clean up temporary files

The proxy runs on port `5433` to avoid conflicts with your local PostgreSQL on port `5432`.

## Configuration

Database credentials are configured in the scripts:

**Local Database:**
- Host: `localhost:5432`
- Database: `lao_cinema`
- User: `laocinema`
- Password: `laocinema_dev`

**Cloud SQL:**
- Instance: `lao-cinema-db`
- Database: `laocinema`
- User: `laocinema`
- Password: `LaoC1nema_Dev_2024!`

## Troubleshooting

### Cloud SQL Proxy fails to start

Install or update it:
```bash
gcloud components install cloud-sql-proxy
gcloud components update
```

### Port 5433 already in use

The proxy may already be running. Either:
- Use the existing proxy (script will detect it)
- Kill the existing proxy: `lsof -ti:5433 | xargs kill`

### Connection refused

Make sure:
- Your local PostgreSQL is running: `brew services list`
- You're authenticated with GCP: `gcloud auth login`
- Your GCP project is set: `gcloud config set project lao-cinema`

### Permission denied

Make scripts executable:
```bash
chmod +x sync-db-to-cloud.sh sync-db-from-cloud.sh
```

## Example Workflow

**Typical development workflow:**

1. Develop locally with local database
2. Add/test movies locally
3. When ready to deploy:
   ```bash
   ./sync-db-to-cloud.sh  # Push data to cloud
   ./deploy.sh             # Deploy application
   ```

4. Test at: https://lao-cinema-web-463494440618.asia-southeast1.run.app

**Pulling production data:**

```bash
./sync-db-from-cloud.sh  # Pull latest cloud data
npm run dev              # Test locally with prod data
```

## Safety

- Local → Cloud sync is safe (won't affect your local data)
- Cloud → Local sync asks for confirmation before overwriting
- Dump files are timestamped and stored in `/tmp`
- Dump files are automatically cleaned up after sync

## See Also

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [BACKEND_SETUP.md](./BACKEND_SETUP.md) - Backend setup instructions
