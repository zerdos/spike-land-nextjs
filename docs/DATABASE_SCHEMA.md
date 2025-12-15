# Database Schema Documentation

This document provides a detailed overview of the Spike Land database schema,
including models, relationships, and design decisions.

## Schema Version

- **Version**: 1.0.0
- **Last Updated**: 2025-01-23
- **Prisma Version**: 6.18.0
- **PostgreSQL Version**: 14+

## Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Spike Land Database Schema                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    User      │◄────────┤   Account    │         │   Session    │
│              │         │              │         │              │
│ id (PK)      │         │ id (PK)      │         │ id (PK)      │
│ email        │◄────────┤ userId (FK)  │         │ sessionToken │
│ name         │         │ provider     │         │ userId (FK)  │
│ emailVerified│         │ providerAccId│         │ expires      │
│ image        │         └──────────────┘         └──────────────┘
│ createdAt    │                 │                        │
│ updatedAt    │                 └────────────────────────┘
└──────┬───────┘
       │
       │ 1:N
       │
       ▼
┌──────────────┐         ┌──────────────────┐    ┌─────────────────────┐
│     App      │◄────────┤   Requirement    │    │  MonetizationModel  │
│              │         │                  │    │                     │
│ id (PK)      │         │ id (PK)          │    │ id (PK)             │
│ name         │◄────────┤ appId (FK)       │    │ appId (FK)          │
│ description  │         │ description      │    │ type                │
│ userId (FK)  │         │ priority         │    │ price               │
│ forkedFrom   │◄───┐    │ status           │    │ subscriptionInterval│
│ status       │    │    │ version          │    │ features[]          │
│ domain       │    │    │ createdAt        │    │ createdAt           │
│ createdAt    │    │    │ updatedAt        │    │ updatedAt           │
│ updatedAt    │    │    └──────────────────┘    └─────────────────────┘
└──────────────┘    │                                       │
       │            │                                       │
       └────────────┘                                       │
       (Self-reference                                      │
        for forks)                                          │
                                                            │
┌─────────────────────┐                                    │
│ VerificationToken   │                                    │
│                     │                                    │
│ identifier          │                                    │
│ token (PK)          │                                    │
│ expires             │                                    │
└─────────────────────┘                                    │
```

## Models

### User

Represents a user account in the system. Integrated with NextAuth.js for
authentication.

**Table Name**: `users`

| Column        | Type      | Constraints      | Description                     |
| ------------- | --------- | ---------------- | ------------------------------- |
| id            | String    | PK, CUID         | Unique user identifier          |
| name          | String?   | Nullable         | User's display name             |
| email         | String?   | Unique, Nullable | User's email address            |
| emailVerified | DateTime? | Nullable         | Email verification timestamp    |
| image         | String?   | Nullable         | User's avatar/profile image URL |
| createdAt     | DateTime  | Default: now()   | Account creation timestamp      |
| updatedAt     | DateTime  | Auto-update      | Last update timestamp           |

**Relations**:

- Has many `Account` (OAuth provider accounts)
- Has many `Session` (active sessions)
- Has many `App` (user-created applications)

**Indexes**:

- Unique index on `email`

**Design Notes**:

- Email is nullable to support OAuth-only accounts without email permission
- Uses CUID for globally unique, ordered IDs
- `emailVerified` tracks when user confirmed their email

---

### Account

Stores OAuth provider account information. Part of NextAuth.js adapter.

**Table Name**: `accounts`

| Column            | Type    | Constraints    | Description                       |
| ----------------- | ------- | -------------- | --------------------------------- |
| id                | String  | PK, CUID       | Unique account identifier         |
| userId            | String  | FK → User.id   | Associated user                   |
| type              | String  |                | Account type (e.g., "oauth")      |
| provider          | String  |                | OAuth provider (github, google)   |
| providerAccountId | String  |                | Provider's user ID                |
| refresh_token     | String? | Text, Nullable | OAuth refresh token               |
| access_token      | String? | Text, Nullable | OAuth access token                |
| expires_at        | Int?    | Nullable       | Token expiration (Unix timestamp) |
| token_type        | String? | Nullable       | Token type (e.g., "Bearer")       |
| scope             | String? | Nullable       | OAuth scopes granted              |
| id_token          | String? | Text, Nullable | OpenID Connect ID token           |
| session_state     | String? | Nullable       | OAuth session state               |

**Relations**:

- Belongs to `User` (cascade delete)

**Indexes**:

- Unique composite index on `[provider, providerAccountId]`

**Design Notes**:

- Supports multiple OAuth providers per user
- Tokens stored as TEXT for long strings
- Cascade delete ensures cleanup when user is deleted

---

### Session

Tracks active user sessions. Part of NextAuth.js adapter.

**Table Name**: `sessions`

| Column       | Type     | Constraints  | Description                  |
| ------------ | -------- | ------------ | ---------------------------- |
| id           | String   | PK, CUID     | Unique session identifier    |
| sessionToken | String   | Unique       | Session token (cookie value) |
| userId       | String   | FK → User.id | Associated user              |
| expires      | DateTime |              | Session expiration           |

**Relations**:

- Belongs to `User` (cascade delete)

**Indexes**:

- Unique index on `sessionToken`

**Design Notes**:

- Session tokens should be treated as secrets
- Expired sessions should be cleaned up periodically
- Cascade delete ensures sessions are removed with user

---

### VerificationToken

Email verification tokens. Part of NextAuth.js adapter.

**Table Name**: `verification_tokens`

| Column     | Type     | Constraints             | Description              |
| ---------- | -------- | ----------------------- | ------------------------ |
| identifier | String   | Composite PK with token | Email or user identifier |
| token      | String   | Unique, Composite PK    | Verification token       |
| expires    | DateTime |                         | Token expiration         |

**Indexes**:

- Unique composite index on `[identifier, token]`
- Unique index on `token`

**Design Notes**:

- No relations (standalone tokens)
- Should be cleaned up after use or expiration
- Used for passwordless sign-in or email verification

---

### App

Core entity representing user-created applications.

**Table Name**: `apps`

| Column      | Type      | Constraints       | Description             |
| ----------- | --------- | ----------------- | ----------------------- |
| id          | String    | PK, CUID          | Unique app identifier   |
| name        | String    |                   | Application name        |
| description | String?   | Text, Nullable    | Application description |
| userId      | String    | FK → User.id      | App owner               |
| forkedFrom  | String?   | FK → App.id, Null | Parent app (if forked)  |
| status      | AppStatus | Default: DRAFT    | App lifecycle status    |
| domain      | String?   | Unique, Nullable  | Custom domain           |
| createdAt   | DateTime  | Default: now()    | App creation timestamp  |
| updatedAt   | DateTime  | Auto-update       | Last update timestamp   |

**Relations**:

- Belongs to `User` (cascade delete)
- Self-reference: `forkedFrom` → `App` (set null on delete)
- Has many `App` (forks of this app)
- Has many `Requirement`
- Has many `MonetizationModel`

**Indexes**:

- Index on `userId`
- Index on `forkedFrom`
- Index on `status`
- Unique index on `domain`

**Enums - AppStatus**:

- `DRAFT` - App under development
- `ACTIVE` - Published and accessible
- `ARCHIVED` - No longer active but preserved
- `DELETED` - Soft deleted

**Design Notes**:

- `forkedFrom` enables app inheritance/forking feature
- Domain uniqueness enforces one app per custom domain
- Cascade delete removes all app data when user is deleted
- Set null on parent app delete preserves fork history

---

### Requirement

Feature requirements or specifications for an app.

**Table Name**: `requirements`

| Column      | Type                | Constraints      | Description                   |
| ----------- | ------------------- | ---------------- | ----------------------------- |
| id          | String              | PK, CUID         | Unique requirement identifier |
| appId       | String              | FK → App.id      | Associated app                |
| description | String              | Text             | Requirement description       |
| priority    | RequirementPriority | Default: MEDIUM  | Requirement priority          |
| status      | RequirementStatus   | Default: PENDING | Implementation status         |
| version     | Int                 | Default: 1       | Requirement version number    |
| createdAt   | DateTime            | Default: now()   | Creation timestamp            |
| updatedAt   | DateTime            | Auto-update      | Last update timestamp         |

**Relations**:

- Belongs to `App` (cascade delete)

**Indexes**:

- Index on `appId`
- Index on `status`
- Index on `priority`

**Enums - RequirementPriority**:

- `LOW` - Nice to have
- `MEDIUM` - Should have
- `HIGH` - Must have
- `CRITICAL` - Blocking issue

**Enums - RequirementStatus**:

- `PENDING` - Not started
- `IN_PROGRESS` - Currently being worked on
- `COMPLETED` - Finished and deployed
- `REJECTED` - Will not implement

**Design Notes**:

- Version tracking allows requirement evolution
- Multiple indexes support filtering by status and priority
- Cascade delete removes requirements with app
- Text type allows long descriptions

---

### MonetizationModel

Pricing and monetization strategies for apps.

**Table Name**: `monetization_models`

| Column               | Type                  | Constraints      | Description             |
| -------------------- | --------------------- | ---------------- | ----------------------- |
| id                   | String                | PK, CUID         | Unique model identifier |
| appId                | String                | FK → App.id      | Associated app          |
| type                 | MonetizationType      | Default: FREE    | Monetization type       |
| price                | Decimal?              | (10,2), Nullable | Price in USD            |
| subscriptionInterval | SubscriptionInterval? | Nullable         | Billing interval        |
| features             | String[]              | Array            | Included features       |
| createdAt            | DateTime              | Default: now()   | Creation timestamp      |
| updatedAt            | DateTime              | Auto-update      | Last update timestamp   |

**Relations**:

- Belongs to `App` (cascade delete)

**Indexes**:

- Index on `appId`
- Index on `type`

**Enums - MonetizationType**:

- `FREE` - No cost
- `ONE_TIME` - Single payment
- `SUBSCRIPTION` - Recurring payment
- `FREEMIUM` - Free with paid upgrades
- `USAGE_BASED` - Pay per use

**Enums - SubscriptionInterval**:

- `MONTHLY` - Billed monthly
- `QUARTERLY` - Billed every 3 months
- `YEARLY` - Billed annually

**Design Notes**:

- Apps can have multiple monetization models (tiers)
- Price stored as Decimal(10,2) for precise currency handling
- Features array stores included feature descriptions
- subscriptionInterval only required for SUBSCRIPTION type
- Cascade delete removes models with app

---

## Relationships Summary

### One-to-Many Relationships

1. **User → Account** (1:N)
   - One user can have multiple OAuth accounts
   - Cascade delete

2. **User → Session** (1:N)
   - One user can have multiple active sessions
   - Cascade delete

3. **User → App** (1:N)
   - One user can create multiple apps
   - Cascade delete

4. **App → Requirement** (1:N)
   - One app can have multiple requirements
   - Cascade delete

5. **App → MonetizationModel** (1:N)
   - One app can have multiple pricing tiers
   - Cascade delete

### Self-Referencing Relationships

1. **App → App** (forkedFrom)
   - An app can be forked from another app
   - Set null on parent delete (preserves fork history)

## Database Constraints

### Primary Keys

- All models use CUID (Collision-resistant Unique Identifier)
- CUIDs are URL-safe, sortable, and globally unique

### Foreign Keys

- All foreign keys have defined cascade/set null behavior
- Cascade delete used for dependent data (sessions, apps, requirements)
- Set null used for optional references (app forks)

### Unique Constraints

- User email (nullable unique)
- Account (provider + providerAccountId)
- Session sessionToken
- App domain (nullable unique)
- VerificationToken token and (identifier + token)

### Check Constraints

None currently defined. Consider adding:

- Price must be positive
- Version must be positive
- Email format validation

## Indexes Strategy

### Performance Indexes

- **Foreign Keys**: All foreign keys indexed for join performance
- **Status Fields**: Indexed for filtering active/draft apps
- **Priority**: Indexed for sorting requirements

### Composite Indexes

Consider adding for common query patterns:

```prisma
@@index([userId, status]) // User's active apps
@@index([appId, status])  // App's pending requirements
@@index([type, price])    // Pricing tier filtering
```

## Data Types

### String Types

- **CUID**: IDs (fixed length, efficient)
- **Text**: Long content (descriptions)
- **Varchar**: Short strings (names, tokens)

### Numeric Types

- **Decimal(10,2)**: Prices (avoids floating-point errors)
- **Int**: Counters, timestamps, versions

### Date/Time Types

- **DateTime**: All timestamps (UTC stored)

### Array Types

- **String[]**: Feature lists (PostgreSQL native array)

## Security Considerations

### Sensitive Data

- **Access Tokens**: Stored as TEXT, should be encrypted at rest
- **Refresh Tokens**: Stored as TEXT, should be encrypted at rest
- **Session Tokens**: Should be treated as secrets
- **Verification Tokens**: Single-use, time-limited

### Recommendations

1. Enable PostgreSQL encryption at rest
2. Use SSL/TLS for database connections
3. Implement row-level security (RLS) for multi-tenant scenarios
4. Audit access to tokens table
5. Implement token rotation for long-lived sessions

## Performance Considerations

### Query Optimization

- Use `select` to limit returned fields
- Use `include` judiciously (avoid N+1 queries)
- Implement pagination for large result sets
- Consider adding database-level limits

### Connection Pooling

- Use PgBouncer or Prisma's connection pooling
- Recommended pool size: 10-20 connections
- Set appropriate timeouts

### Caching Strategy

- Cache frequently accessed, rarely changed data
- Use Redis for session caching
- Implement cache invalidation strategy

## Scalability

### Vertical Scaling

- Current schema supports 100K+ users
- Add read replicas for read-heavy workloads
- Consider table partitioning for very large tables

### Horizontal Scaling

- Schema designed for sharding by userId
- Consider separate databases for different app domains
- Use connection pooling for serverless deployments

## Migration Strategy

### Backward Compatibility

- Always add nullable columns first
- Backfill data before making columns required
- Use multi-step migrations for breaking changes

### Zero-Downtime Deployments

1. Add new column (nullable)
2. Deploy code that writes to both columns
3. Backfill old data
4. Deploy code that reads from new column
5. Make column required
6. Remove old column (optional)

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed procedures.

## Future Enhancements

### Planned Features

- [ ] Audit log table for tracking changes
- [ ] Notification preferences table
- [ ] App collaboration (multiple owners)
- [ ] App analytics/metrics table
- [ ] Payment transactions table
- [ ] App categories and tags
- [ ] User roles and permissions

### Schema Evolution

- Consider adding `deletedAt` for soft deletes
- Add `archivedAt` for archival tracking
- Implement versioning for apps
- Add metadata JSONB column for extensibility

## Appendix

### Sample Queries

**Get user with all apps:**

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    apps: {
      include: {
        requirements: true,
        monetizationModels: true,
      },
    },
  },
});
```

**Get active apps with pending requirements:**

```typescript
const apps = await prisma.app.findMany({
  where: {
    status: "ACTIVE",
    requirements: {
      some: {
        status: "PENDING",
        priority: { in: ["HIGH", "CRITICAL"] },
      },
    },
  },
  include: {
    requirements: {
      where: { status: "PENDING" },
      orderBy: { priority: "desc" },
    },
  },
});
```

**Get app with fork hierarchy:**

```typescript
const app = await prisma.app.findUnique({
  where: { id: appId },
  include: {
    parentApp: true, // Parent if this is a fork
    forks: { // All forks of this app
      include: {
        user: true,
      },
    },
  },
});
```

### Database Statistics

Run these queries to analyze database:

```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Row counts
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Version History

- **v1.0.0** (2025-01-23): Initial schema with User, App, Requirement,
  MonetizationModel
