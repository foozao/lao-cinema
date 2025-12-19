# Database Backup & Recovery Guide

This document explains the database backup strategy for Lao Cinema and how to perform backup and restore operations.

## Backup Strategy

Lao Cinema uses a **multi-layered backup approach** for maximum data protection:

1. **Automated Cloud SQL Backups** (Primary) - Daily automated backups with 7-day retention
2. **Manual Cloud SQL Backups** (On-demand) - Create backups before major changes
3. **Local pg_dump Exports** (Offline) - Local backup files for disaster recovery

## 1. Automated Cloud SQL Backups

### Configuration

**Status**: ✅ ENABLED

```yaml
Backup Schedule: Daily at 3:00 PM UTC (10:00 PM Laos time)
Retention: 7 backups (7 days)
Transaction Logs: 7 days (enables point-in-time recovery)
Location: asia-southeast1 (Singapore)
```

### How It Works

- Cloud SQL automatically creates a backup every day during the 4-hour backup window starting at 15:00 UTC
- Backups are stored in Google Cloud Storage in the same region as your database
- Oldest backups are automatically deleted when retention limit is reached
- Transaction logs enable point-in-time recovery within the 7-day window

### View Automated Backups

```bash
# List all backups
gcloud sql backups list --instance=lao-cinema-db

# View backup details
gcloud sql backups describe BACKUP_ID --instance=lao-cinema-db
```

### Cost

- **Backup Storage**: $0.08/GB/month (Singapore region)
- **Estimated Cost**: ~$0.50-$2/month for typical database size (5-25 GB)

## 2. Manual Cloud SQL Backups

Use manual backups before:
- Major schema changes
- Data migrations
- Deploying risky features
- Bulk data operations

### Create Manual Backup

```bash
# Using the backup script (recommended)
./scripts/backup-db.sh "Before schema migration"

# Or using gcloud directly
gcloud sql backups create \
  --instance=lao-cinema-db \
  --description="Manual backup before migration"
```

The script will:
1. Verify you're using the correct GCP project
2. Create the backup with a timestamped description
3. Show you how to view and restore from the backup

### Restore from Cloud SQL Backup

```bash
# Using the restore script (recommended - interactive)
./scripts/restore-db.sh

# The script will:
# 1. List available backups
# 2. Prompt you to select a backup ID
# 3. Require confirmation before restoring
# 4. Perform the restore operation
```

**⚠️ WARNING**: Restoring from a backup will:
- Replace ALL current data with the backup data
- Delete any data created after the backup timestamp
- Cause downtime during the restore operation (~5-15 minutes)

## 3. Local pg_dump Exports

Local exports provide an additional layer of protection and enable:
- Offline backups stored outside Google Cloud
- Quick local testing with production data
- Migration to other database providers
- Long-term archival storage

### Create Local Export

```bash
# Export database to local file
./scripts/export-db-dump.sh

# Creates: backups/laocinema_backup_YYYYMMDD_HHMMSS.sql
```

**Prerequisites**:
- Cloud SQL Proxy installed (`cloud-sql-proxy` in project root)
- `CLOUD_DB_PASS` set in `.env` file
- PostgreSQL client tools installed (`pg_dump`)

### Import Local Dump

```bash
# Import from local dump file
./scripts/import-db-dump.sh backups/laocinema_backup_20250119_143000.sql
```

**Note**: Import script not yet created - use existing `sync-db-from-cloud.sh` pattern

## Backup Schedule Recommendations

### Development Phase (Current)
- **Automated**: Daily at 10:00 PM Laos time ✅
- **Manual**: Before each deployment
- **Local Export**: Weekly (Sundays)

### Production Phase (Future)
- **Automated**: Daily at 3:00 AM Laos time (off-peak)
- **Manual**: Before major changes
- **Local Export**: Weekly + before major releases
- **Consider**: Increase retention to 30 days

## Point-in-Time Recovery

Cloud SQL supports point-in-time recovery (PITR) within the transaction log retention period (7 days).

### Restore to Specific Time

```bash
# Restore to a specific timestamp
gcloud sql instances restore-backup lao-cinema-db \
  --backup-run=BACKUP_ID \
  --backup-instance=lao-cinema-db \
  --point-in-time="2025-01-19T14:30:00Z"
```

**Use Cases**:
- Recover from accidental data deletion
- Undo a bad migration
- Investigate data at a specific point in time

## Disaster Recovery Procedures

### Scenario 1: Accidental Data Deletion (< 7 days ago)

1. Identify the timestamp before deletion
2. Use point-in-time recovery:
   ```bash
   ./scripts/restore-db.sh
   # Select the backup closest to the incident
   ```

### Scenario 2: Database Corruption

1. Create a manual backup of current state (for forensics)
2. Restore from the most recent good backup:
   ```bash
   ./scripts/restore-db.sh
   ```

### Scenario 3: Complete Cloud SQL Failure

1. Create a new Cloud SQL instance
2. Restore from local pg_dump export:
   ```bash
   # Upload dump to new instance
   # Use import script or manual psql restore
   ```

### Scenario 4: Regional Outage

- Automated backups are stored in the same region (asia-southeast1)
- For cross-region protection, consider:
  - Periodic exports to Cloud Storage in different region
  - Local pg_dump exports stored off-site

## Monitoring & Alerts

### Check Backup Status

```bash
# Verify automated backups are enabled
gcloud sql instances describe lao-cinema-db \
  --format="yaml(settings.backupConfiguration)"

# Check recent backup success
gcloud sql operations list \
  --instance=lao-cinema-db \
  --filter="operationType=BACKUP" \
  --limit=5
```

### Set Up Alerts (Recommended)

Configure Cloud Monitoring alerts for:
- Backup failures
- Backup duration exceeding threshold
- Storage usage approaching limits

## Best Practices

1. **Test Restores Regularly**
   - Perform a test restore quarterly
   - Verify data integrity after restore
   - Document restore time

2. **Before Major Changes**
   - Always create a manual backup
   - Document what changed
   - Keep backup for at least 30 days

3. **Retention Policy**
   - Keep automated backups for 7 days (current)
   - Keep manual backups for 30 days
   - Archive critical backups to Cloud Storage

4. **Security**
   - Backups inherit database encryption
   - Access controlled via IAM permissions
   - Local dumps should be encrypted if stored long-term

5. **Cost Optimization**
   - Monitor backup storage costs
   - Delete unnecessary manual backups
   - Use lifecycle policies for archived dumps

## Troubleshooting

### Backup Creation Fails

```bash
# Check instance status
gcloud sql instances describe lao-cinema-db

# Check recent operations
gcloud sql operations list --instance=lao-cinema-db --limit=10

# View operation details
gcloud sql operations describe OPERATION_ID
```

### Restore Takes Too Long

- Normal restore time: 5-15 minutes for small databases (<10 GB)
- Large databases may take 30-60 minutes
- Check operation status:
  ```bash
  gcloud sql operations list --instance=lao-cinema-db
  ```

### Local Export Fails

1. Verify Cloud SQL Proxy is running
2. Check `CLOUD_DB_PASS` is set correctly
3. Ensure sufficient disk space
4. Check PostgreSQL client tools are installed

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `backup-db.sh` | Create manual Cloud SQL backup | `./scripts/backup-db.sh "description"` |
| `restore-db.sh` | Restore from Cloud SQL backup | `./scripts/restore-db.sh` (interactive) |
| `export-db-dump.sh` | Export to local pg_dump file | `./scripts/export-db-dump.sh` |

## Additional Resources

- [Cloud SQL Backup Documentation](https://cloud.google.com/sql/docs/postgres/backup-recovery/backups)
- [Point-in-Time Recovery Guide](https://cloud.google.com/sql/docs/postgres/backup-recovery/pitr)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)

## Change Log

- **2025-01-19**: Enabled automated backups (daily at 15:00 UTC, 7-day retention)
- **2025-01-19**: Created manual backup and restore scripts
- **2025-01-19**: Created local export script
