# Spike Land Documentation

Welcome to the Spike Land documentation. This is the central index for all
platform documentation.

**Website**: [spike.land](https://spike.land)

---

## Quick Navigation

### For Users

| I want to...              | Document                                                 |
| ------------------------- | -------------------------------------------------------- |
| Understand the platform   | [features/FEATURES.md](./features/FEATURES.md)                             |
| Learn about the Pixel app | [features/PIXEL_APP.md](./features/PIXEL_APP.md)                           |
| Understand pipelines      | [features/PIXEL_PIPELINES.md](./features/PIXEL_PIPELINES.md)               |
| Get tokens                | [architecture/TOKEN_SYSTEM.md](./architecture/TOKEN_SYSTEM.md)             |
| Use voucher codes         | [features/VOUCHER_SYSTEM_UPDATED.md](./features/VOUCHER_SYSTEM_UPDATED.md) |
| Read the user guide       | [features/USER_GUIDE.md](./features/USER_GUIDE.md)                         |

### For Developers

| I want to...             | Document                                                               |
| ------------------------ | ---------------------------------------------------------------------- |
| Integrate with the API   | [architecture/API_REFERENCE.md](./architecture/API_REFERENCE.md)                 |
| View API changelog       | [API_CHANGELOG.md](./API_CHANGELOG.md)                                           |
| Set up the database      | [architecture/DATABASE_SETUP.md](./architecture/DATABASE_SETUP.md)               |
| Quick start database     | [guides/DATABASE_QUICK_START.md](./guides/DATABASE_QUICK_START.md)               |
| Understand the schema    | [architecture/DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md)             |
| Track database usage     | [DATABASE_USAGE_TRACKING.md](./DATABASE_USAGE_TRACKING.md)                       |
| Perform migrations       | [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)                                       |
| Set up Stripe payments   | [archive/STRIPE_INTEGRATION_PLAN.md](./archive/STRIPE_INTEGRATION_PLAN.md)       |
| Understand testing       | [guides/TESTING_STRATEGY.md](./guides/TESTING_STRATEGY.md)                       |
| Run E2E tests            | [E2E_TEST_IMPLEMENTATION.md](./E2E_TEST_IMPLEMENTATION.md)                       |
| Automate E2E setup       | [guides/AUTOMATED_SETUP.md](./guides/AUTOMATED_SETUP.md)                         |
| Manage dependencies      | [guides/DEPENDENCY_MANAGEMENT.md](./guides/DEPENDENCY_MANAGEMENT.md)             |
| Integrate tracking       | [integrations/CAMPAIGN_TRACKING_INTEGRATION.md](./integrations/CAMPAIGN_TRACKING_INTEGRATION.md) |
| Use parallel enhancement | [useParallelEnhancement-hook.md](./useParallelEnhancement-hook.md)               |

### For Project Setup

| I want to...                  | Document                                                 |
| ----------------------------- | -------------------------------------------------------- |
| Set up development            | [../README.md](../README.md)                             |
| Configure secrets/env vars    | [guides/SECRETS_SETUP.md](./guides/SECRETS_SETUP.md)                   |
| Rotate credentials            | [guides/CREDENTIAL_ROTATION.md](./guides/CREDENTIAL_ROTATION.md)       |
| Understand CI/CD              | [../README.md](../README.md#cicd-pipeline)                             |
| Debug CI/CD failures          | [guides/CI_CD_DEBUGGING.md](./guides/CI_CD_DEBUGGING.md)               |
| Set up Vercel                 | [guides/VERCEL_ANALYTICS_SETUP.md](./guides/VERCEL_ANALYTICS_SETUP.md) |
| Understand business structure | [business/BUSINESS_STRUCTURE.md](./business/BUSINESS_STRUCTURE.md)     |
| Review CEO decisions          | [CEO_DECISIONS.md](./CEO_DECISIONS.md)                   |

---

## Documentation Structure

```
docs/
├── README.md                         # This index file
├── ROADMAP.md                        # Future development plans
├── TECH_DEBT.md                      # Tech debt tracking
├── architecture/                     # System architecture docs
│   ├── API_REFERENCE.md              # Complete API documentation
│   ├── DATABASE_SCHEMA.md            # Database models & relations
│   ├── DATABASE_SETUP.md             # Database installation guide
│   ├── MY_APPS_ARCHITECTURE.md       # My-Apps feature architecture
│   ├── TOKEN_SYSTEM.md               # Token economy details
│   ├── JSON_SCHEMAS.md               # JSON schema definitions
│   └── DEPENDENCY_RESOLUTIONS.md     # Dependency resolution notes
├── features/                         # Feature documentation
│   ├── FEATURES.md                   # Platform features & roadmap
│   ├── PIXEL_APP.md                  # Pixel app comprehensive guide
│   ├── PIXEL_PIPELINES.md            # Enhancement pipeline configurations
│   ├── SOCIAL_MEDIA.md               # Social media features
│   ├── SUBSCRIPTION_TIERS.md         # Subscription tier details
│   ├── VOUCHER_SYSTEM_UPDATED.md     # Voucher codes and redemption
│   ├── USER_GUIDE.md                 # End-user platform guide
│   └── ORBIT_USER_GUIDE.md           # Orbit feature guide
├── guides/                           # How-to guides
│   ├── SECRETS_SETUP.md              # Secrets & environment variables
│   ├── CREDENTIAL_ROTATION.md        # Credential rotation procedures
│   ├── DATABASE_QUICK_START.md       # Quick database setup
│   ├── DATABASE_MIGRATION_ROLLBACK.md # Migration rollback procedures
│   ├── TESTING_STRATEGY.md           # Comprehensive testing guide
│   ├── AUTOMATED_SETUP.md            # E2E authentication bypass setup
│   ├── DEPENDENCY_MANAGEMENT.md      # Dependency management guide
│   ├── CI_CD_DEBUGGING.md            # CI/CD troubleshooting guide
│   ├── VERCEL_ANALYTICS_SETUP.md     # Vercel analytics configuration
│   └── ...                           # Additional guides
├── integrations/                     # Third-party integrations
│   ├── BRIDGEMIND_INTEGRATION.md     # BridgeMind integration
│   ├── BRIDGEMIND_COLLABORATION.md   # BridgeMind collaboration
│   └── CAMPAIGN_TRACKING_INTEGRATION.md # Campaign analytics
├── business/                         # Business documentation
│   ├── BUSINESS_STRUCTURE.md         # Company information
│   ├── LAUNCH_CHECKLIST.md           # Pre-launch checklist
│   ├── LAUNCH_PLAN.md                # Launch strategy
│   └── ...                           # Additional business docs
├── security/                         # Security documentation
│   ├── SECURITY_AUDIT_REPORT.md      # Security audit
│   └── SECURITY_HARDENING.md         # Security hardening (CSP)
├── sprints/                          # Sprint documentation
│   └── TECH_STABILIZATION_SPRINT_1.md
├── api/                              # OpenAPI specs & examples
├── best-practices/                   # Development best practices
├── database/                         # Database-specific docs
├── migrations/                       # API migration guides
├── testing/                          # Testing documentation
└── archive/                          # Historical documentation
```

---

## Core Documentation

### Platform

| Document                                         | Description                                       |
| ------------------------------------------------ | ------------------------------------------------- |
| [features/FEATURES.md](./features/FEATURES.md)             | Platform vision, MCP-first strategy, feature list |
| [business/ZOLTAN_ERDOS.md](./business/ZOLTAN_ERDOS.md)     | Founder profile, background, and vision           |
| [business/BUSINESS_STRUCTURE.md](./business/BUSINESS_STRUCTURE.md) | Company information and legal structure           |
| [CEO_DECISIONS.md](./CEO_DECISIONS.md)           | Strategic decisions and technology choices        |
| [ROADMAP.md](./ROADMAP.md)                       | Future development plans                          |

### Pixel App (Image Enhancement)

| Document                                   | Description                                           |
| ------------------------------------------ | ----------------------------------------------------- |
| [features/PIXEL_APP.md](./features/PIXEL_APP.md)             | Comprehensive Pixel app documentation                 |
| [features/PIXEL_PIPELINES.md](./features/PIXEL_PIPELINES.md) | Enhancement pipeline configurations and customization |

### API & Integration

| Document                                                       | Description                                   |
| -------------------------------------------------------------- | --------------------------------------------- |
| [architecture/API_REFERENCE.md](./architecture/API_REFERENCE.md) | Complete API documentation with examples      |
| [API_CHANGELOG.md](./API_CHANGELOG.md)                         | API version history and breaking changes      |
| [API_VERSIONING.md](./API_VERSIONING.md)                       | Versioning strategy and deprecation policies  |
| [API_ALBUMS_BATCH_ENHANCE.md](./API_ALBUMS_BATCH_ENHANCE.md)   | Batch enhancement API documentation           |
| [API_PUBLIC_ALBUMS_GALLERY.md](./API_PUBLIC_ALBUMS_GALLERY.md) | Public albums gallery API                     |
| [api/](./api/)                                                 | OpenAPI specifications and integration guides |
| [api/00_START_HERE.md](./api/00_START_HERE.md)                 | API getting started guide                     |
| [api/ALBUM_ENDPOINTS.md](./api/ALBUM_ENDPOINTS.md)             | Album API endpoints documentation             |
| [api/IMAGE_ENDPOINTS.md](./api/IMAGE_ENDPOINTS.md)             | Image API endpoints documentation             |
| [api/CURL_EXAMPLES.md](./api/CURL_EXAMPLES.md)                 | cURL examples for API testing                 |
| [api/INTEGRATION_GUIDE.md](./api/INTEGRATION_GUIDE.md)         | Step-by-step integration guide                |
| [api/REFUND_POLICY.md](./api/REFUND_POLICY.md)                 | Token refund policies                         |

### Token Economy

| Document                                                 | Description                               |
| -------------------------------------------------------- | ----------------------------------------- |
| [architecture/TOKEN_SYSTEM.md](./architecture/TOKEN_SYSTEM.md)   | Token acquisition, pricing, subscriptions |
| [features/VOUCHER_SYSTEM_UPDATED.md](./features/VOUCHER_SYSTEM_UPDATED.md) | Voucher codes and redemption              |

### Database

| Document                                                                                                 | Description                             |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [architecture/DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md)                                     | Models, relationships, design decisions |
| [architecture/DATABASE_SETUP.md](./architecture/DATABASE_SETUP.md)                                       | Installation, migrations, backup        |
| [guides/DATABASE_QUICK_START.md](./guides/DATABASE_QUICK_START.md)                                       | Quick setup guide                       |
| [DATABASE_USAGE_TRACKING.md](./DATABASE_USAGE_TRACKING.md)                                               | Table usage tracking across codebase    |
| [guides/DATABASE_MIGRATION_ROLLBACK.md](./guides/DATABASE_MIGRATION_ROLLBACK.md)                         | Migration rollback procedures           |
| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)                                                               | Database migration best practices       |
| [database/](./database/)                                                                                 | Database-specific documentation         |
| [database/ALBUM_IMAGE_INDEXES.md](./database/ALBUM_IMAGE_INDEXES.md)                                     | Album image index strategies            |
| [database/ALBUM_IMAGE_INDEX_ANALYSIS.md](./database/ALBUM_IMAGE_INDEX_ANALYSIS.md)                       | Index performance analysis              |
| [database/album-enhance-pagination-optimization.md](./database/album-enhance-pagination-optimization.md) | Pagination optimization                 |

### Payments

| Document                                                   | Description                    |
| ---------------------------------------------------------- | ------------------------------ |
| [archive/STRIPE_INTEGRATION_PLAN.md](./archive/STRIPE_INTEGRATION_PLAN.md) | Stripe setup and configuration (archived) |
| [archive/STRIPE_PAYMENT_FLOW.md](./archive/STRIPE_PAYMENT_FLOW.md)         | Payment flow documentation (archived)     |
| [archive/STRIPE_TESTING_GUIDE.md](./archive/STRIPE_TESTING_GUIDE.md)       | Testing payments (archived)               |

### Testing & CI/CD

| Document                                                                           | Description                          |
| ---------------------------------------------------------------------------------- | ------------------------------------ |
| [guides/TESTING_STRATEGY.md](./guides/TESTING_STRATEGY.md)                         | Comprehensive testing infrastructure |
| [E2E_TEST_IMPLEMENTATION.md](./E2E_TEST_IMPLEMENTATION.md)                         | E2E testing setup                    |
| [E2E_IMAGE_ENHANCEMENT_TESTS.md](./E2E_IMAGE_ENHANCEMENT_TESTS.md)                 | Image enhancement E2E tests          |
| [guides/AUTOMATED_SETUP.md](./guides/AUTOMATED_SETUP.md)                           | E2E authentication bypass setup      |
| [guides/MANUAL_TESTING_GUIDE.md](./guides/MANUAL_TESTING_GUIDE.md)                 | Manual testing procedures            |
| [guides/CI_CD_DEBUGGING.md](./guides/CI_CD_DEBUGGING.md)                           | CI/CD troubleshooting guide          |
| [testing/](./testing/)                                                             | Testing documentation                |
| [testing/BATCH_ENHANCEMENT_E2E_TESTS.md](./testing/BATCH_ENHANCEMENT_E2E_TESTS.md) | Batch enhancement E2E tests          |
| [testing/testing-everything-manually.md](./testing/testing-everything-manually.md) | Manual testing checklist             |

### Security & Operations

| Document                                                   | Description                            |
| ---------------------------------------------------------- | -------------------------------------- |
| [guides/SECRETS_SETUP.md](./guides/SECRETS_SETUP.md)             | Secrets & environment variables (SSOT) |
| [guides/CREDENTIAL_ROTATION.md](./guides/CREDENTIAL_ROTATION.md) | Credential rotation procedures         |
| [security/SECURITY_AUDIT_REPORT.md](./security/SECURITY_AUDIT_REPORT.md) | Security practices and audit           |
| [security/SECURITY_HARDENING.md](./security/SECURITY_HARDENING.md) | Security hardening measures (CSP)      |
| [guides/ERROR_LOG_AUDIT_GUIDE.md](./guides/ERROR_LOG_AUDIT_GUIDE.md) | Error log auditing procedures          |
| [business/LAUNCH_CHECKLIST.md](./business/LAUNCH_CHECKLIST.md)   | Pre-launch checklist                   |
| [business/LAUNCH_PLAN.md](./business/LAUNCH_PLAN.md)             | Launch strategy and rollout plan       |
| [PRODUCTION_FIXES_NEEDED.md](./PRODUCTION_FIXES_NEEDED.md) | Known issues                           |
| [JOB_CLEANUP_SYSTEM.md](./JOB_CLEANUP_SYSTEM.md)           | Automatic job timeout and cleanup      |

### Marketing & Campaigns

| Document                                                               | Description                          |
| ---------------------------------------------------------------------- | ------------------------------------ |
| [business/MARKETING_PERSONAS.md](./business/MARKETING_PERSONAS.md)                       | Target personas for Pixel app        |
| [archive/CHRISTMAS_CAMPAIGN_2025.md](./archive/CHRISTMAS_CAMPAIGN_2025.md)               | Christmas 2025 marketing campaign    |
| [integrations/CAMPAIGN_TRACKING_INTEGRATION.md](./integrations/CAMPAIGN_TRACKING_INTEGRATION.md) | Campaign analytics integration guide |

### Development Tools & Utilities

| Document                                                           | Description                         |
| ------------------------------------------------------------------ | ----------------------------------- |
| [guides/DEPENDENCY_MANAGEMENT.md](./guides/DEPENDENCY_MANAGEMENT.md)   | Adding, removing, auditing packages |
| [guides/VERCEL_ANALYTICS_SETUP.md](./guides/VERCEL_ANALYTICS_SETUP.md) | Vercel analytics configuration      |
| [useParallelEnhancement-hook.md](./useParallelEnhancement-hook.md)     | Parallel enhancement React hook     |
| [features/USER_GUIDE.md](./features/USER_GUIDE.md)                     | End-user platform guide             |

---

## Best Practices

See [best-practices/](./best-practices/) for development guidelines and quick
reference guides.

### Core Development

| Document                                                        | Description                            |
| --------------------------------------------------------------- | -------------------------------------- |
| [nextjs-15.md](./best-practices/nextjs-15.md)                   | Next.js 15 patterns and best practices |
| [typescript.md](./best-practices/typescript.md)                 | TypeScript guidelines                  |
| [react-patterns.md](./best-practices/react-patterns.md)         | React best practices                   |
| [prisma-orm.md](./best-practices/prisma-orm.md)                 | Prisma ORM database patterns           |
| [testing-strategies.md](./best-practices/testing-strategies.md) | Testing approaches                     |
| [state-management.md](./best-practices/state-management.md)     | State management patterns              |
| [error-handling.md](./best-practices/error-handling.md)         | Error handling strategies              |

### API & Integration

| Document                                                        | Description                         |
| --------------------------------------------------------------- | ----------------------------------- |
| [api-design.md](./best-practices/api-design.md)                 | REST API design best practices      |
| [stripe-integration.md](./best-practices/stripe-integration.md) | Stripe payment integration patterns |

### Infrastructure & Performance

| Document                                                          | Description                       |
| ----------------------------------------------------------------- | --------------------------------- |
| [web-performance.md](./best-practices/web-performance.md)         | Web performance optimization      |
| [seo-nextjs.md](./best-practices/seo-nextjs.md)                   | SEO best practices for Next.js    |
| [SEO-REFERENCE.md](./best-practices/SEO-REFERENCE.md)             | SEO quick reference guide         |
| [cloudflare-services.md](./best-practices/cloudflare-services.md) | Cloudflare services integration   |
| [cicd-pipelines.md](./best-practices/cicd-pipelines.md)           | CI/CD pipeline best practices     |
| [logging-monitoring.md](./best-practices/logging-monitoring.md)   | Logging and monitoring strategies |

### Security

| Document                                                                    | Description                  |
| --------------------------------------------------------------------------- | ---------------------------- |
| [web-security.md](./best-practices/web-security.md)                         | Web security best practices  |
| [SECURITY_INDEX.md](./best-practices/SECURITY_INDEX.md)                     | Security documentation index |
| [SECURITY_QUICK_REFERENCE.md](./best-practices/SECURITY_QUICK_REFERENCE.md) | Security quick reference     |

### Styling & UI

| Document                                            | Description                 |
| --------------------------------------------------- | --------------------------- |
| [tailwind-css.md](./best-practices/tailwind-css.md) | Tailwind CSS best practices |

### AI & Advanced Features

| Document                                                          | Description                        |
| ----------------------------------------------------------------- | ---------------------------------- |
| [ai-llm-integration.md](./best-practices/ai-llm-integration.md)   | AI/LLM integration patterns        |
| [image-generation-ai.md](./best-practices/image-generation-ai.md) | AI image generation best practices |

### MCP Development

| Document                                                                  | Description                  |
| ------------------------------------------------------------------------- | ---------------------------- |
| [mcp-server-development.md](./best-practices/mcp-server-development.md)   | MCP server development guide |
| [mcp-servers-development.md](./best-practices/mcp-servers-development.md) | MCP servers development      |
| [MCP_DEVELOPMENT_INDEX.md](./best-practices/MCP_DEVELOPMENT_INDEX.md)     | MCP development index        |
| [MCP_QUICK_REFERENCE.md](./best-practices/MCP_QUICK_REFERENCE.md)         | MCP quick reference guide    |

---

## API Migration Guides

See [migrations/](./migrations/) for API version migration guides.

| Document                                                    | Description                          |
| ----------------------------------------------------------- | ------------------------------------ |
| [README.md](./migrations/README.md)                         | Migration guide overview and process |
| [MIGRATION_TEMPLATE.md](./migrations/MIGRATION_TEMPLATE.md) | Template for new migration guides    |

---

## Archive

Historical documentation is stored in [archive/](./archive/):

| Category                  | Contents                                                    |
| ------------------------- | ----------------------------------------------------------- |
| Implementation summaries  | Completed feature implementation documentation              |
| Previous design decisions | Historical architectural decisions                          |
| Completed features        | Archived feature documentation                              |
| Historical deployment     | Past deployment and migration notes                         |
| Old plans                 | [archive/plans/](./archive/plans/) - Historical issue plans |

See [archive/README.md](./archive/README.md) for detailed archive index.

---

## Contributing to Documentation

1. **Single source of truth**: Don't duplicate content across files
2. **Link, don't copy**: Reference other docs instead of copying
3. **Keep files focused**: One topic per document
4. **Update the index**: Add new docs to this README
5. **Archive old docs**: Move outdated content to `archive/`
6. **Follow structure**: Place docs in appropriate subdirectories
7. **Use templates**: Follow existing document templates for consistency

---

**Last Updated**: December 30, 2025
