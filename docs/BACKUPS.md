# Database Backup and Restore

This document outlines the process for backing up and restoring the Spike Land
database.

## Automated Backups

Database backups are performed automatically on a daily basis using a GitHub
Actions workflow. The workflow is defined in `.github/workflows/backup.yml`.

The backup process consists of the following steps:

1. **Dump the database:** The `pg_dump` command is used to create a SQL dump of
   the database.
2. **Compress the dump:** The SQL dump is compressed using `gzip` to reduce its
   size.
3. **Upload to Cloudflare R2:** The compressed backup file is uploaded to the
   Cloudflare R2 bucket specified by the `CLOUDFLARE_R2_BUCKET_NAME` environment
   variable.
4. **Apply rotation policy:** The 7 most recent backups are kept, and older
   backups are automatically deleted.

### Configuration

The backup workflow requires the following secrets to be configured in the
GitHub repository's settings:

- `DATABASE_URL`: The connection string for the PostgreSQL database.
- `CLOUDFLARE_R2_BUCKET_NAME`: The name of the Cloudflare R2 bucket to store the
  backups in.
- `CLOUDFLARE_R2_ENDPOINT`: The endpoint for the Cloudflare R2 bucket.
- `CLOUDFLARE_R2_ACCESS_KEY_ID`: The access key ID for the Cloudflare R2 bucket.
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: The secret access key for the Cloudflare R2
  bucket.

### Monitoring and Alerting

If the backup workflow fails, a new issue will be automatically created in the
GitHub repository.

## Manual Restore

To restore the database from a backup, follow these steps:

1. **Download the backup file:** Download the desired backup file from the
   Cloudflare R2 bucket.
2. **Decompress the backup file:** Use the `gunzip` command to decompress the
   backup file:

   ```bash
   gunzip backup-<timestamp>.sql.gz
   ```

3. **Restore the database:** Use the `psql` command to restore the database from
   the decompressed SQL file.

   ```bash
   psql $DATABASE_URL < backup-<timestamp>.sql
   ```

   **Note:** This will overwrite the existing database.

## Troubleshooting

### Backup Workflow Fails with "Missing required environment variables"

**Symptom**: Backup workflow creates an issue with error about missing R2 variables.

**Cause**: GitHub Secrets for Cloudflare R2 are not configured or are empty.

**Solution**:

1. Verify all 4 R2 secrets are configured in GitHub: Settings > Secrets and variables > Actions
2. Required secrets:
   - `CLOUDFLARE_R2_BUCKET_NAME` - Name of the R2 bucket (e.g., `spike-land-backups`)
   - `CLOUDFLARE_R2_ENDPOINT` - Full endpoint URL (e.g., `https://<account-id>.r2.cloudflarestorage.com`)
   - `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 API access key ID
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 API secret access key
3. See [SECRETS_SETUP.md](./SECRETS_SETUP.md#cloudflare-r2-required) for detailed setup instructions
4. Verify `DATABASE_URL` secret is also configured
5. Trigger a manual workflow run to test: Actions > Database Backup > Run workflow

### Backup Workflow Fails with "R2 connectivity check failed"

**Symptom**: Pre-flight checks fail with R2 connectivity errors.

**Cause**: R2 bucket doesn't exist, incorrect endpoint URL, or invalid API credentials.

**Solution**:

1. Verify the R2 bucket exists in Cloudflare Dashboard: https://dash.cloudflare.com/ > R2 > Overview
2. Check the `CLOUDFLARE_R2_ENDPOINT` secret:
   - Must include `https://` prefix
   - Format: `https://<account-id>.r2.cloudflarestorage.com`
   - Account ID can be found in Cloudflare dashboard URL or R2 settings
3. Verify API token permissions:
   - Token must have **Read & Write** access to the bucket
   - Check token hasn't expired
4. Test locally (if possible):
   ```bash
   export DATABASE_URL="postgresql://..."
   export CLOUDFLARE_R2_BUCKET_NAME="spike-land-backups"
   export CLOUDFLARE_R2_ENDPOINT="https://..."
   export CLOUDFLARE_R2_ACCESS_KEY_ID="..."
   export CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."
   yarn tsx scripts/backup/backup.ts --dry-run
   ```

### Backup Workflow Fails with "Database connectivity check failed"

**Symptom**: Pre-flight checks fail with database connectivity errors.

**Cause**: Database is unreachable from GitHub Actions runners or DATABASE_URL is invalid.

**Solution**:

1. Verify `DATABASE_URL` secret is configured correctly
2. Check database firewall rules allow connections from GitHub Actions IPs
3. For cloud databases (Neon, Supabase):
   - Ensure connection pooling is properly configured
   - Verify SSL mode is set correctly (`?sslmode=require`)
4. Test database accessibility from a different environment

### Manual Backup Trigger

To run a backup manually (useful for testing):

1. Go to GitHub repository > Actions
2. Select "Database Backup" workflow
3. Click "Run workflow"
4. Select branch: `main`
5. Click "Run workflow" button
6. Monitor the workflow run for errors

### Viewing Backup Files

To access backup files stored in R2:

1. Log into Cloudflare Dashboard: https://dash.cloudflare.com/
2. Navigate to R2 > Overview
3. Click on your backup bucket (e.g., `spike-land-backups`)
4. Browse or download backup files (named `backup-<timestamp>.sql.gz`)
