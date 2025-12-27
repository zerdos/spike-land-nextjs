# Spike Land Documentation

Welcome to the Spike Land documentation. This is the central index for all
platform documentation.

**Website**: [spike.land](https://spike.land)

---

## Quick Navigation

### For Users

| I want to...                  | Document                                                 |
| ----------------------------- | -------------------------------------------------------- |
| Understand the platform       | [FEATURES.md](./FEATURES.md)                             |
| Learn about image enhancement | [IMAGE_ENHANCEMENT.md](./IMAGE_ENHANCEMENT.md)           |
| Get tokens                    | [TOKEN_SYSTEM.md](./TOKEN_SYSTEM.md)                     |
| Use voucher codes             | [VOUCHER_SYSTEM_UPDATED.md](./VOUCHER_SYSTEM_UPDATED.md) |
| Read the user guide           | [USER_GUIDE.md](./USER_GUIDE.md)                         |

### For Developers

| I want to...           | Document                                                   |
| ---------------------- | ---------------------------------------------------------- |
| Integrate with the API | [API_REFERENCE.md](./API_REFERENCE.md)                     |
| Set up the database    | [DATABASE_SETUP.md](./DATABASE_SETUP.md)                   |
| Understand the schema  | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)                 |
| Set up Stripe payments | [STRIPE_INTEGRATION_PLAN.md](./STRIPE_INTEGRATION_PLAN.md) |
| Understand testing     | [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)               |
| Run E2E tests          | [E2E_TEST_IMPLEMENTATION.md](./E2E_TEST_IMPLEMENTATION.md) |
| Manage dependencies    | [DEPENDENCY_MANAGEMENT.md](./DEPENDENCY_MANAGEMENT.md)     |

### For Project Setup

| I want to...                  | Document                                                 |
| ----------------------------- | -------------------------------------------------------- |
| Set up development            | [../README.md](../README.md)                             |
| Understand CI/CD              | [../README.md](../README.md#cicd-pipeline)               |
| Debug CI/CD failures          | [CI_CD_DEBUGGING.md](./CI_CD_DEBUGGING.md)               |
| Set up Vercel                 | [VERCEL_ANALYTICS_SETUP.md](./VERCEL_ANALYTICS_SETUP.md) |
| Understand business structure | [BUSINESS_STRUCTURE.md](./BUSINESS_STRUCTURE.md)         |

---

## Documentation Structure

```
docs/
├── README.md                  # This index file
├── FEATURES.md                # Platform features & roadmap
├── API_REFERENCE.md           # Complete API documentation
├── TOKEN_SYSTEM.md            # Token economy details
├── DATABASE_SCHEMA.md         # Database models & relations
├── DATABASE_SETUP.md          # Database installation guide
├── DEPENDENCY_MANAGEMENT.md   # Dependency management guide
├── CI_CD_DEBUGGING.md         # CI/CD troubleshooting guide
├── api/                       # OpenAPI specs & examples
├── best-practices/            # Development best practices
├── database/                  # Database-specific docs
└── archive/                   # Historical documentation
```

---

## Core Documentation

### Platform

| Document                                         | Description                                               |
| ------------------------------------------------ | --------------------------------------------------------- |
| [FEATURES.md](./FEATURES.md)                     | Complete feature list, Pixel app phases, platform roadmap |
| [BUSINESS_STRUCTURE.md](./BUSINESS_STRUCTURE.md) | Company information and legal structure                   |
| [ROADMAP.md](./ROADMAP.md)                       | Future development plans                                  |

### API & Integration

| Document                               | Description                                   |
| -------------------------------------- | --------------------------------------------- |
| [API_REFERENCE.md](./API_REFERENCE.md) | Complete API documentation with examples      |
| [api/](./api/)                         | OpenAPI specifications and integration guides |

### Token Economy

| Document                                                 | Description                               |
| -------------------------------------------------------- | ----------------------------------------- |
| [TOKEN_SYSTEM.md](./TOKEN_SYSTEM.md)                     | Token acquisition, pricing, subscriptions |
| [VOUCHER_SYSTEM_UPDATED.md](./VOUCHER_SYSTEM_UPDATED.md) | Voucher codes and redemption              |

### Database

| Document                                                           | Description                             |
| ------------------------------------------------------------------ | --------------------------------------- |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)                         | Models, relationships, design decisions |
| [DATABASE_SETUP.md](./DATABASE_SETUP.md)                           | Installation, migrations, backup        |
| [DATABASE_QUICK_START.md](./DATABASE_QUICK_START.md)               | Quick setup guide                       |
| [DATABASE_MIGRATION_ROLLBACK.md](./DATABASE_MIGRATION_ROLLBACK.md) | Migration procedures                    |

### Image Enhancement (Pixel App)

| Document                                                       | Description                       |
| -------------------------------------------------------------- | --------------------------------- |
| [IMAGE_ENHANCEMENT.md](./IMAGE_ENHANCEMENT.md)                 | Enhancement workflow and features |
| [IMAGE_ENHANCEMENT_ROADMAP.md](./IMAGE_ENHANCEMENT_ROADMAP.md) | Pixel app development phases      |
| [IMAGE_ENHANCEMENT_PRIVACY.md](./IMAGE_ENHANCEMENT_PRIVACY.md) | Privacy and data handling         |

### Payments

| Document                                                   | Description                    |
| ---------------------------------------------------------- | ------------------------------ |
| [STRIPE_INTEGRATION_PLAN.md](./STRIPE_INTEGRATION_PLAN.md) | Stripe setup and configuration |
| [STRIPE_PAYMENT_FLOW.md](./STRIPE_PAYMENT_FLOW.md)         | Payment flow documentation     |
| [STRIPE_TESTING_GUIDE.md](./STRIPE_TESTING_GUIDE.md)       | Testing payments               |

### Testing & CI/CD

| Document                                                   | Description                          |
| ---------------------------------------------------------- | ------------------------------------ |
| [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)               | Comprehensive testing infrastructure |
| [E2E_TEST_IMPLEMENTATION.md](./E2E_TEST_IMPLEMENTATION.md) | E2E testing setup                    |
| [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)       | Manual testing procedures            |
| [CI_CD_DEBUGGING.md](./CI_CD_DEBUGGING.md)                 | CI/CD troubleshooting guide          |

### Security & Operations

| Document                                                   | Description                  |
| ---------------------------------------------------------- | ---------------------------- |
| [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md)     | Security practices and audit |
| [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)               | Pre-launch checklist         |
| [PRODUCTION_FIXES_NEEDED.md](./PRODUCTION_FIXES_NEEDED.md) | Known issues                 |

### Maintenance

| Document                                               | Description                         |
| ------------------------------------------------------ | ----------------------------------- |
| [DEPENDENCY_MANAGEMENT.md](./DEPENDENCY_MANAGEMENT.md) | Adding, removing, auditing packages |

---

## Best Practices

See [best-practices/](./best-practices/) for development guidelines:

- [nextjs-15.md](./best-practices/nextjs-15.md) - Next.js patterns
- [typescript.md](./best-practices/typescript.md) - TypeScript guidelines
- [react-patterns.md](./best-practices/react-patterns.md) - React best practices
- [prisma-orm.md](./best-practices/prisma-orm.md) - Database patterns
- [testing-strategies.md](./best-practices/testing-strategies.md) - Testing
  approaches

---

## Archive

Historical documentation is stored in [archive/](./archive/):

- Implementation summaries
- Previous design decisions
- Completed feature documentation
- Historical deployment notes

---

## Contributing to Documentation

1. **Single source of truth**: Don't duplicate content across files
2. **Link, don't copy**: Reference other docs instead of copying
3. **Keep files focused**: One topic per document
4. **Update the index**: Add new docs to this README
5. **Archive old docs**: Move outdated content to `archive/`

---

**Last Updated**: December 2025
