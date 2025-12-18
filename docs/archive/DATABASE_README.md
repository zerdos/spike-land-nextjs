# Database Documentation Index

Welcome to the Spike Land database documentation. This directory contains
comprehensive guides for database setup, operations, and maintenance.

## Quick Links

- **[Quick Start Guide](./DATABASE_QUICK_START.md)** - Get up and running in 5
  minutes
- **[Complete Setup Guide](./DATABASE_SETUP.md)** - Comprehensive database
  setup, backup, monitoring, and recovery
- **[Migration Guide](./MIGRATION_GUIDE.md)** - How to create, manage, and
  deploy database migrations

## Overview

The Spike Land platform uses:

- **Database**: PostgreSQL 14+
- **ORM**: Prisma 6.x
- **Auth Integration**: NextAuth.js with Prisma Adapter
- **Schema Location**: `/prisma/schema.prisma`
- **Generated Client**: `/src/generated/prisma`

## Database Schema

### Core Models

1. **User** - User accounts (NextAuth integration)
2. **Account** - OAuth provider accounts (GitHub, Google)
3. **Session** - User sessions
4. **VerificationToken** - Email verification tokens
5. **App** - User-created applications
6. **Requirement** - App requirements and features
7. **MonetizationModel** - App pricing and monetization

### Entity Relationships

```
User (1) ----< (N) App
         |
         +----< (N) Account
         |
         +----< (N) Session

App (1) ----< (N) Requirement
        |
        +----< (N) MonetizationModel
        |
        +----< (N) App (self-reference: forks)
```

## Quick Reference

### npm Scripts

```bash
# Database Management
npm run db:generate          # Generate Prisma Client (types)
npm run db:migrate           # Create and apply migration (dev)
npm run db:migrate:deploy    # Deploy migrations (production)
npm run db:migrate:reset     # Reset database (dev only)
npm run db:push              # Push schema without migration
npm run db:seed              # Seed database with sample data
npm run db:studio            # Open Prisma Studio (GUI)
npm run db:validate          # Validate schema syntax
npm run db:format            # Format schema file
```

### Common Commands

```bash
# Setup
npm install                              # Install dependencies
cp .env.example .env                     # Create environment file
# Edit .env with your DATABASE_URL
npm run db:generate                      # Generate Prisma Client
npm run db:migrate                       # Create tables

# Development
npm run db:studio                        # Browse database
npm run dev                              # Start Next.js

# After schema changes
npm run db:migrate -- --name change_name # Create migration

# Production
npm run db:migrate:deploy                # Apply migrations
```

## File Structure

```
prisma/
├── schema.prisma              # Database schema definition
├── seed.ts                    # Database seeding script
└── migrations/                # Migration history
    ├── 20250123_init/
    │   └── migration.sql
    └── migration_lock.toml

src/
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   └── prisma.test.ts         # Client tests
└── generated/
    └── prisma/                # Generated Prisma Client

docs/
├── DATABASE_README.md         # This file
├── DATABASE_QUICK_START.md    # Quick setup guide
├── DATABASE_SETUP.md          # Complete setup documentation
└── MIGRATION_GUIDE.md         # Migration workflows
```

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

# Optional (for production with connection pooling)
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

## Development Workflow

1. **Make Schema Changes**
   ```bash
   # Edit prisma/schema.prisma
   # Add/modify models, fields, relationships
   ```

2. **Create Migration**
   ```bash
   npm run db:migrate -- --name descriptive_name
   ```

3. **Review Generated SQL**
   ```bash
   cat prisma/migrations/[timestamp]_descriptive_name/migration.sql
   ```

4. **Test Changes**
   ```bash
   npm run db:studio  # Visual verification
   npm run dev        # Test with application
   ```

5. **Commit Changes**
   ```bash
   git add prisma/
   git commit -m "Add: descriptive database changes"
   ```

## Production Deployment Checklist

Before deploying database changes to production:

- [ ] Migrations tested on staging environment
- [ ] Database backup completed
- [ ] Downtime window scheduled (if needed)
- [ ] Rollback plan documented
- [ ] Team notified

Deploy with:

```bash
npm run db:migrate:deploy
```

## Common Tasks

### Adding a New Model

```prisma
// prisma/schema.prisma
model NewModel {
  id        String   @id @default(cuid())
  name      String
  userId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

```bash
npm run db:migrate -- --name add_new_model
```

### Adding a Field to Existing Model

```prisma
model User {
  // ... existing fields
  newField String?  // Add new optional field
}
```

```bash
npm run db:migrate -- --name add_user_new_field
```

### Creating Indexes for Performance

```prisma
model App {
  // ... fields

  @@index([userId, status])    # Composite index
  @@index([createdAt])         # Single column index
}
```

```bash
npm run db:migrate -- --name add_app_indexes
```

## Using Prisma Client in Code

### Basic Queries

```typescript
import prisma from "@/lib/prisma";

// Find many
const users = await prisma.user.findMany();

// Find unique
const user = await prisma.user.findUnique({
  where: { email: "user@example.com" },
});

// Create
const newUser = await prisma.user.create({
  data: {
    email: "new@example.com",
    name: "New User",
  },
});

// Update
const updated = await prisma.user.update({
  where: { id: userId },
  data: { name: "Updated Name" },
});

// Delete
await prisma.user.delete({
  where: { id: userId },
});
```

### Relations and Includes

```typescript
// Create with relations
const app = await prisma.app.create({
  data: {
    name: "My App",
    userId: user.id,
    requirements: {
      create: [
        { description: "Feature 1", priority: "HIGH" },
      ],
    },
  },
  include: {
    requirements: true,
    monetizationModels: true,
  },
});

// Query with relations
const appWithDetails = await prisma.app.findUnique({
  where: { id: appId },
  include: {
    user: true,
    requirements: {
      where: { status: "PENDING" },
      orderBy: { priority: "desc" },
    },
    forks: true,
    parentApp: true,
  },
});
```

### Advanced Queries

```typescript
// Filtering and sorting
const apps = await prisma.app.findMany({
  where: {
    status: "ACTIVE",
    userId: currentUserId,
    requirements: {
      some: {
        priority: "HIGH",
        status: "PENDING",
      },
    },
  },
  orderBy: [
    { createdAt: "desc" },
  ],
  take: 10,
  skip: 0,
});

// Aggregations
const stats = await prisma.app.aggregate({
  where: { status: "ACTIVE" },
  _count: true,
  _avg: {
    // Average of some numeric field
  },
});

// Transactions
const result = await prisma.$transaction([
  prisma.app.create({ data: appData }),
  prisma.requirement.create({ data: reqData }),
]);
```

## Monitoring and Maintenance

### Key Metrics

Monitor these metrics in production:

- **Connection Pool**: Active/idle connections
- **Query Performance**: Slow queries (>100ms)
- **Database Size**: Table and index sizes
- **Replication Lag**: If using replicas

### Routine Maintenance

**Weekly:**

- Run `VACUUM ANALYZE` on database
- Review slow query logs
- Check disk space

**Monthly:**

- Review and test backups
- Analyze query patterns
- Update statistics

**Quarterly:**

- Review and optimize indexes
- Clean up old data (if applicable)
- Performance audit

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed monitoring setup and
SQL queries.

## Backup and Recovery

### Backup Strategy

- **Daily**: Automated full backups (keep 30 days)
- **Weekly**: Verified backups (keep 12 weeks)
- **Monthly**: Long-term backups (keep 12 months)
- **Pre-Migration**: Manual backup before any schema change

### Creating Backups

```bash
# Using pg_dump
pg_dump -Fc spike_land > backup_$(date +%Y%m%d).backup

# Compress
gzip backup_20250123.backup
```

### Restoring from Backup

```bash
# Create fresh database
createdb spike_land_restored

# Restore backup
pg_restore -d spike_land_restored backup_20250123.backup

# Verify
psql spike_land_restored -c "SELECT COUNT(*) FROM users;"
```

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for complete backup and disaster
recovery procedures.

## Troubleshooting

### Connection Issues

```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL is running
# Docker: docker ps | grep postgres
# Local: systemctl status postgresql
```

### Migration Issues

```bash
# Check migration status
npm run db:validate
yarn prisma migrate status

# Reset (dev only)
npm run db:migrate:reset

# Mark migration as resolved
yarn prisma migrate resolve --rolled-back [name]
```

### Schema Drift

```bash
# Pull current database schema
yarn prisma db pull

# Compare with prisma/schema.prisma
# Create migration to sync
npm run db:migrate -- --name sync_schema
```

## Security Best Practices

1. **Never commit `.env` file** - Use `.env.example` as template
2. **Use SSL/TLS** in production - Add `?sslmode=require` to DATABASE_URL
3. **Least privilege access** - Application user should only have necessary
   permissions
4. **Rotate credentials** - Update passwords quarterly
5. **Enable audit logging** - Track schema changes and access patterns

## Performance Tips

1. **Add indexes** for frequently queried fields
2. **Use connection pooling** (PgBouncer) in production
3. **Monitor slow queries** and optimize
4. **Use `select` to limit returned fields**
5. **Batch operations** when possible
6. **Enable query logging** in development

Example optimization:

```typescript
// Bad: Returns all fields
const users = await prisma.user.findMany();

// Good: Only returns needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});
```

## Additional Resources

### Official Documentation

- **Prisma Docs**: https://www.prisma.io/docs
- **Prisma Schema Reference**:
  https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **NextAuth + Prisma**: https://next-auth.js.org/adapters/prisma

### Spike Land Specific

- [DATABASE_QUICK_START.md](./DATABASE_QUICK_START.md) - Quick setup
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Complete setup guide
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration workflows

## Getting Help

- **Database Administrator**: [Contact Info]
- **DevOps Team**: [Contact Info]
- **GitHub Issues**: [Repository URL]/issues
- **Team Slack**: #database-support

## Contributing

When contributing database changes:

1. Always create migrations (never manual SQL)
2. Use descriptive migration names
3. Test on staging before production
4. Document complex migrations
5. Follow the migration guide workflows
6. Update this documentation if needed

## License

[Your License Here]
