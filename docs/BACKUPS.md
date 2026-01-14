# Database Backup and Restore

This document outlines the process for backing up and restoring the Spike Land database.

## Automated Backups

Database backups are performed automatically on a daily basis using a GitHub Actions workflow. The workflow is defined in `.github/workflows/backup.yml`.

The backup process consists of the following steps:

1. **Dump the database:** The `pg_dump` command is used to create a SQL dump of the database.
2. **Compress the dump:** The SQL dump is compressed using `gzip` to reduce its size.
3. **Upload to Cloudflare R2:** The compressed backup file is uploaded to the Cloudflare R2 bucket specified by the `CLOUDFLARE_R2_BUCKET_NAME` environment variable.
4. **Apply rotation policy:** The 7 most recent backups are kept, and older backups are automatically deleted.

### Configuration

The backup workflow requires the following secrets to be configured in the GitHub repository's settings:

- `DATABASE_URL`: The connection string for the PostgreSQL database.
- `CLOUDFLARE_R2_BUCKET_NAME`: The name of the Cloudflare R2 bucket to store the backups in.
- `CLOUDFLARE_R2_ENDPOINT`: The endpoint for the Cloudflare R2 bucket.
- `CLOUDFLARE_R2_ACCESS_KEY_ID`: The access key ID for the Cloudflare R2 bucket.
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: The secret access key for the Cloudflare R2 bucket.

### Monitoring and Alerting

If the backup workflow fails, a new issue will be automatically created in the GitHub repository.

## Manual Restore

To restore the database from a backup, follow these steps:

1. **Download the backup file:** Download the desired backup file from the Cloudflare R2 bucket.
2. **Decompress the backup file:** Use the `gunzip` command to decompress the backup file:

   ```bash
   gunzip backup-<timestamp>.sql.gz
   ```

3. **Restore the database:** Use the `psql` command to restore the database from the decompressed SQL file.

   ```bash
   psql $DATABASE_URL < backup-<timestamp>.sql
   ```

   **Note:** This will overwrite the existing database.
