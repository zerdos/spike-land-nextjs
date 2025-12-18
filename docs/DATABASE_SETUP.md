# Database Setup Guide

This guide covers the complete database setup for Spike Land platform using
Prisma ORM with PostgreSQL.

## Overview

- **ORM**: Prisma 6.x
- **Database**: PostgreSQL 14+
- **Schema Location**: `/prisma/schema.prisma`
- **Generated Client**: `/src/generated/prisma`

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Database Options](#production-database-options)
4. [Schema Overview](#schema-overview)
5. [Running Migrations](#running-migrations)
6. [Backup and Recovery](#backup-and-recovery)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ installed locally OR access to a cloud PostgreSQL instance
- Basic understanding of SQL and database concepts

## Local Development Setup

### Option 1: Local PostgreSQL with Docker

The fastest way to get started with PostgreSQL locally:

```bash
# Pull and run PostgreSQL container
docker run --name spike-land-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=spike_land \
  -p 5432:5432 \
  -d postgres:16-alpine

# Verify it's running
docker ps | grep spike-land-postgres
```

### Option 2: Local PostgreSQL Installation

#### macOS (using Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb spike_land
```

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb spike_land
```

### Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update the `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/spike_land?schema=public
```

## Production Database Options

### Recommended Cloud Providers

#### 1. Supabase (Recommended for Next.js)

- Free tier: 500MB database, connection pooling included
- Setup: https://supabase.com/
- Connection string format:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

#### 2. Railway

- Easy deployment, PostgreSQL included
- Setup: https://railway.app/
- Connection string provided in Railway dashboard

#### 3. Neon

- Serverless PostgreSQL with branching
- Free tier: 3GB storage
- Setup: https://neon.tech/

#### 4. AWS RDS

- Production-grade, scalable
- More complex setup, higher cost

### Connection Pooling for Production

For serverless/edge deployments (Vercel, AWS Lambda), use connection pooling:

```env
# Pooled connection (for Prisma Client queries)
DATABASE_URL=postgresql://user:password@host:6543/db?pgbouncer=true

# Direct connection (for Prisma Migrate)
DIRECT_URL=postgresql://user:password@host:5432/db
```

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Schema Overview

### Core Models

#### User Model (NextAuth Integration)

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  apps          App[]
}
```

#### App Model (Core Platform Entity)

```prisma
model App {
  id          String    @id @default(cuid())
  name        String
  description String?
  userId      String    # App owner
  forkedFrom  String?   # Parent app (if forked)
  status      AppStatus @default(DRAFT)
  domain      String?   @unique
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user               User                @relation(fields: [userId], references: [id])
  parentApp          App?                @relation("AppForks", fields: [forkedFrom], references: [id])
  forks              App[]               @relation("AppForks")
  requirements       Requirement[]
  monetizationModels MonetizationModel[]
}
```

**App Statuses:**

- `DRAFT`: App under development
- `ACTIVE`: Published and accessible
- `ARCHIVED`: No longer active but preserved
- `DELETED`: Soft deleted

#### Requirement Model

```prisma
model Requirement {
  id          String              @id @default(cuid())
  appId       String
  description String              @db.Text
  priority    RequirementPriority @default(MEDIUM)
  status      RequirementStatus   @default(PENDING)
  version     Int                 @default(1)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  app App @relation(fields: [appId], references: [id], onDelete: Cascade)
}
```

**Priority Levels:** LOW, MEDIUM, HIGH, CRITICAL **Status Types:** PENDING,
IN_PROGRESS, COMPLETED, REJECTED

#### MonetizationModel

```prisma
model MonetizationModel {
  id                   String                @id @default(cuid())
  appId                String
  type                 MonetizationType      @default(FREE)
  price                Decimal?              @db.Decimal(10, 2)
  subscriptionInterval SubscriptionInterval?
  features             String[]
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  app App @relation(fields: [appId], references: [id], onDelete: Cascade)
}
```

**Monetization Types:** FREE, ONE_TIME, SUBSCRIPTION, FREEMIUM, USAGE_BASED
**Subscription Intervals:** MONTHLY, QUARTERLY, YEARLY

### NextAuth Required Models

- **Account**: OAuth provider accounts (GitHub, Google)
- **Session**: Active user sessions
- **VerificationToken**: Email verification tokens

### Database Indexes

Performance-critical indexes included:

- User email (unique)
- App userId, forkedFrom, status, domain
- Requirement appId, status, priority
- Account provider + providerAccountId

## Running Migrations

### Initial Migration (First Time Setup)

Once you have a database configured:

```bash
# Generate Prisma Client (types only, no DB changes)
yarn prisma generate

# Create and apply initial migration
yarn prisma migrate dev --name init

# This will:
# 1. Create migration files in prisma/migrations/
# 2. Apply migrations to your database
# 3. Generate Prisma Client with types
```

### Development Workflow

```bash
# After schema changes, create a new migration
yarn prisma migrate dev --name descriptive_name

# Examples:
yarn prisma migrate dev --name add_app_status_index
yarn prisma migrate dev --name add_requirement_priority
```

### Production Migrations

```bash
# Deploy migrations to production (non-interactive)
yarn prisma migrate deploy

# This should be run in CI/CD pipeline
```

### Migration Best Practices

1. **Always backup before migrations** in production
2. **Test migrations** on staging environment first
3. **Use descriptive names** for migrations
4. **Never edit applied migrations** - create new ones
5. **Review generated SQL** before applying to production

### Reset Database (Development Only)

```bash
# WARNING: This deletes all data!
yarn prisma migrate reset

# This will:
# 1. Drop database
# 2. Recreate database
# 3. Apply all migrations
# 4. Run seed script (if configured)
```

## Backup and Recovery

### Backup Strategy

#### Automated Daily Backups

**PostgreSQL pg_dump (Recommended)**

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="spike_land"
DB_USER="postgres"
DB_HOST="localhost"

# Create backup directory
mkdir -p $BACKUP_DIR

# Run backup
pg_dump -h $DB_HOST -U $DB_USER -F c -b -v -f \
  "$BACKUP_DIR/spike_land_$TIMESTAMP.backup" $DB_NAME

# Compress backup
gzip "$BACKUP_DIR/spike_land_$TIMESTAMP.backup"

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: spike_land_$TIMESTAMP.backup.gz"
```

**Setup Cron Job (Daily at 2 AM)**

```bash
crontab -e

# Add line:
0 2 * * * /path/to/backup-database.sh >> /var/log/postgres-backup.log 2>&1
```

#### Cloud Provider Backups

**Supabase:**

- Automatic daily backups (Pro plan)
- Point-in-time recovery (PITR)
- Dashboard: Database > Backups

**Railway:**

- Automatic daily snapshots
- Manual snapshots via dashboard

**AWS RDS:**

- Automated backups with retention period
- Manual snapshots before major changes

### Backup Retention Policy

- **Daily backups**: Keep 30 days
- **Weekly backups**: Keep 12 weeks
- **Monthly backups**: Keep 12 months
- **Pre-migration backups**: Keep indefinitely

### Recovery Procedures

#### Restore from pg_dump Backup

```bash
# 1. Stop application to prevent writes
# 2. Drop existing database (if needed)
dropdb spike_land

# 3. Create fresh database
createdb spike_land

# 4. Restore from backup
pg_restore -h localhost -U postgres -d spike_land \
  /path/to/spike_land_20250101_020000.backup

# 5. Verify data integrity
psql -U postgres -d spike_land -c "SELECT COUNT(*) FROM users;"

# 6. Restart application
```

#### Point-in-Time Recovery (PITR)

For AWS RDS or Supabase Pro:

```bash
# Use cloud provider dashboard or CLI
# Example for AWS RDS:
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier spike-land-prod \
  --target-db-instance-identifier spike-land-restored \
  --restore-time 2025-01-15T14:30:00Z
```

### Testing Backups

**CRITICAL: Untested backups don't exist!**

Monthly backup test procedure:

```bash
# 1. Create test database
createdb spike_land_test

# 2. Restore backup to test database
pg_restore -d spike_land_test /path/to/latest/backup.gz

# 3. Verify critical data
psql -U postgres -d spike_land_test <<EOF
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM apps;
SELECT COUNT(*) FROM requirements;
EOF

# 4. Cleanup
dropdb spike_land_test
```

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **Connection Pool**
   - Active connections
   - Idle connections
   - Connection wait time

2. **Query Performance**
   - Slow queries (>100ms)
   - Query execution plans
   - Index usage

3. **Database Size**
   - Total database size
   - Table sizes
   - Index sizes

4. **Replication Lag** (if using replicas)
   - Lag time in seconds
   - Replay lag

### Monitoring Queries

**Active Connections**

```sql
SELECT
  count(*) as total_connections,
  state,
  application_name
FROM pg_stat_activity
WHERE datname = 'spike_land'
GROUP BY state, application_name;
```

**Slow Queries (requires pg_stat_statements)**

```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'spike_land')
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Table Sizes**

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Index Usage**

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

**Unused Indexes (candidates for removal)**

```sql
SELECT
  schemaname || '.' || tablename AS table,
  indexname,
  pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size
FROM pg_stat_user_indexes i
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint
  )
ORDER BY pg_relation_size(i.indexrelid) DESC;
```

### Routine Maintenance

#### Weekly Maintenance (Automated)

**VACUUM and ANALYZE**

```sql
-- Run weekly to reclaim space and update statistics
VACUUM ANALYZE;

-- Or per table
VACUUM ANALYZE users;
VACUUM ANALYZE apps;
```

**Automate with cron:**

```bash
# Add to crontab (Sundays at 3 AM)
0 3 * * 0 psql -U postgres -d spike_land -c "VACUUM ANALYZE;" >> /var/log/postgres-maintenance.log 2>&1
```

#### Monthly Maintenance

1. **Review slow queries** and optimize indexes
2. **Check for bloat** in tables and indexes
3. **Review and test backups**
4. **Update statistics** for query planner
5. **Check disk space** and plan capacity

#### Monitoring Setup with Alerting

**Key alerts to configure:**

1. **Connection Pool Exhaustion**
   - Alert when >80% connections used
   - Action: Scale connection pool or investigate leaks

2. **Replication Lag** (if using replicas)
   - Alert when lag >30 seconds
   - Action: Check network, disk I/O

3. **Database Size**
   - Alert when >80% disk space used
   - Action: Cleanup, archive, or scale storage

4. **Slow Query Increase**
   - Alert when >10 queries taking >1 second
   - Action: Review query plans, add indexes

5. **Failed Backups**
   - Alert immediately on backup failure
   - Action: Investigate and re-run backup

### Connection Pooling Configuration

**Prisma Connection Pool (Application Layer)**

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["metrics"]
}
```

**Environment Configuration:**

```env
# Connection pool settings (append to DATABASE_URL)
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
```

**Recommended Pool Sizes:**

- Development: 5-10 connections
- Production (single instance): 10-20 connections
- Production (serverless): Use external pooler (PgBouncer)

**PgBouncer Configuration (Production)**

```ini
[databases]
spike_land = host=localhost port=5432 dbname=spike_land

[pgbouncer]
listen_port = 6543
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5
server_lifetime = 3600
server_idle_timeout = 600
```

## High Availability Setup

### Master-Slave Replication (Read Replicas)

**Use case:** Scale read-heavy workloads

**Setup for AWS RDS:**

1. Create read replica via AWS Console or CLI
2. Update application to use read replica for queries
3. Keep write operations on primary

**Prisma configuration for read replicas:**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@/generated/prisma";

// Write operations (primary)
export const prismaWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Read operations (replica)
export const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_READ_URL,
    },
  },
});
```

### Failover Procedures

**Automatic Failover (Cloud Providers):**

- AWS RDS: Multi-AZ deployment (automatic)
- Supabase: Built-in failover
- Railway: Platform handles failover

**Manual Failover (Self-hosted):**

```bash
# 1. Promote replica to primary
pg_ctl promote -D /var/lib/postgresql/data

# 2. Update application connection string
# Point DATABASE_URL to new primary

# 3. Restart application
systemctl restart spike-land-app

# 4. Configure old primary as replica (after fixing)
```

## Disaster Recovery Runbook

### Scenario 1: Database Corruption

**Detection:** Application errors, data inconsistencies **RTO:** 1 hour |
**RPO:** Last backup (24 hours max)

1. Stop application to prevent further corruption
2. Identify corruption extent with `SELECT * FROM [table]`
3. Restore from latest backup to test database
4. Verify data integrity in test database
5. If valid, promote test database to primary
6. Update application connection string
7. Restart application
8. Monitor for errors

### Scenario 2: Accidental Data Deletion

**Detection:** User reports, monitoring alerts **RTO:** 30 minutes | **RPO:**
Point-in-time (if enabled)

1. Identify deletion timestamp
2. If PITR available: Restore to point before deletion
3. If no PITR: Restore from backup, manually recover deleted records
4. Compare restored data with current database
5. Merge recovered data using SQL INSERT statements
6. Verify data consistency

### Scenario 3: Database Server Failure

**Detection:** Connection failures, health checks failing **RTO:** 15 minutes |
**RPO:** 0 (with replication)

1. Check if replica is available and healthy
2. Promote replica to primary (automatic with RDS Multi-AZ)
3. Update application connection string (if needed)
4. Verify application connectivity
5. Monitor replication lag (if new replica spawned)
6. Investigate and repair failed primary

### Scenario 4: Complete Data Center Outage

**Detection:** All services unavailable **RTO:** 2 hours | **RPO:** Last backup
(24 hours max)

1. Activate disaster recovery site
2. Restore latest backup to new database instance
3. Update DNS to point to DR site
4. Apply any transaction logs (if available)
5. Start application in DR environment
6. Verify functionality and data integrity
7. Communicate status to users

## Security Best Practices

1. **Least Privilege Access**
   - Application user: Only necessary permissions
   - Admin user: Full access, restricted by IP
   - Readonly user: For analytics and reporting

2. **Connection Security**
   - Always use SSL/TLS in production
   - Verify SSL certificates
   - Use connection string with `sslmode=require`

3. **Secrets Management**
   - Never commit `.env` file to git
   - Use secret management service (AWS Secrets Manager, Vault)
   - Rotate database passwords quarterly

4. **Audit Logging**
   - Enable PostgreSQL audit logging
   - Log all DDL statements (CREATE, ALTER, DROP)
   - Log failed authentication attempts

5. **Regular Updates**
   - Keep PostgreSQL version updated
   - Apply security patches promptly
   - Update Prisma regularly

## Troubleshooting

### Connection Issues

**Error: "Can't reach database server"**

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if port is open
nc -zv localhost 5432

# Verify connection string
echo $DATABASE_URL
```

**Error: "Too many connections"**

```bash
# Check current connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Increase max_connections (requires restart)
# Edit postgresql.conf
max_connections = 200
```

### Migration Issues

**Error: "Migration failed"**

```bash
# Mark migration as rolled back
yarn prisma migrate resolve --rolled-back <migration_name>

# Fix issue and re-run
yarn prisma migrate dev
```

**Error: "Database schema is not in sync"**

```bash
# Reset migration state (dev only!)
yarn prisma migrate reset

# Production: Create new migration to sync
yarn prisma migrate dev --name sync_schema
```

### Performance Issues

**Slow Queries**

```sql
-- Enable query logging
ALTER DATABASE spike_land SET log_min_duration_statement = 100;

-- Review slow queries in log files
tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"
```

**High CPU Usage**

```sql
-- Find expensive queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Kill runaway query (if needed)
SELECT pg_cancel_backend(<pid>);
```

## Additional Resources

- **Prisma Documentation**: https://www.prisma.io/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs
- **NextAuth.js Prisma Adapter**: https://next-auth.js.org/adapters/prisma
- **Database Performance Tuning**:
  https://wiki.postgresql.org/wiki/Performance_Optimization

## Support and Maintenance Contacts

- **Database Administrator**: [Contact Info]
- **DevOps Team**: [Contact Info]
- **On-Call Schedule**: [Link to schedule]
- **Incident Response**: [Runbook link]
