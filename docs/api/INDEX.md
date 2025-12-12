# Spike Land API Documentation Index

Complete reference guide for all API documentation files.

## Quick Navigation

| Document                                               | Purpose                    | Audience           | Length      |
| ------------------------------------------------------ | -------------------------- | ------------------ | ----------- |
| [openapi.yaml](#openapiyaml)                           | Complete API specification | Developers, tools  | 1,598 lines |
| [README.md](#readmemd)                                 | Getting started with API   | All developers     | 349 lines   |
| [INTEGRATION_GUIDE.md](#integration_guidemd)           | Implementation patterns    | Backend developers | 571 lines   |
| [CURL_EXAMPLES.md](#curl_examplesmd)                   | Quick testing reference    | QA, API testers    | 680 lines   |
| [IMPLEMENTATION_SUMMARY.md](#implementation_summarymd) | Project summary            | Project managers   | 389 lines   |
| [QUICK_REFERENCE.md](#quick_referencemd)               | Essential info cheat sheet | All developers     | 284 lines   |
| [ALBUM_ENDPOINTS.md](#album_endpointsmd)               | Album API details          | Backend developers | 666 lines   |
| [IMAGE_ENDPOINTS.md](#image_endpointsmd)               | Image API details          | Backend developers | 776 lines   |

**Total Documentation**: 5,313 lines + existing API_REFERENCE.md

---

## Document Descriptions

### openapi.yaml

**Type**: OpenAPI 3.0 Specification
**Format**: YAML
**Size**: 1,598 lines, 46 KB

Complete machine-readable API specification including:

- Base configuration and metadata
- Authentication schemes (session cookie & bearer token)
- 25+ reusable schema definitions
- Error response standards
- Common parameters
- Rate limiting documentation
- Full server configuration

**Use Cases**:

- Import into Swagger UI for interactive documentation
- Generate SDKs for multiple languages
- Import into Postman for API testing
- Validate with OpenAPI tools
- Generate mock servers

**How to Use**:

1. View with Swagger UI: Paste content at https://swagger.io/tools/swagger-ui/
2. Generate SDK: `npx openapi-generator-cli generate -i docs/api/openapi.yaml -g typescript-fetch`
3. Import to Postman: File > Import > Select openapi.yaml
4. Deploy documentation: `npx @redocly/cli build-docs docs/api/openapi.yaml`

---

### README.md

**Type**: Getting Started Guide
**Format**: Markdown
**Size**: 349 lines, 8.7 KB

Overview of API documentation and how to use it:

- File structure and navigation
- Instructions for using OpenAPI spec
- SDK generation in multiple languages (TypeScript, Python, Go)
- Postman collection setup
- OpenAPI validation
- API architecture overview
- Authentication methods explained
- Token economy system
- Rate limiting explanation
- Error handling standards
- Component documentation
- Example API calls with responses
- Security considerations
- Monitoring and debugging

**Audience**: All developers starting with the API
**Read Time**: 10-15 minutes
**Next Steps**: Choose between INTEGRATION_GUIDE.md or CURL_EXAMPLES.md

---

### INTEGRATION_GUIDE.md

**Type**: Developer Integration Guide
**Format**: Markdown
**Size**: 571 lines, 14 KB

Code-first guide for implementing API integration:

- Authentication setup (session-based, bearer tokens, mobile)
- Common API patterns with working code:
  - Token balance checking
  - Image enhancement with polling
  - Job streaming
  - Album management
  - Batch operations
  - Referral program
- Error handling with TypeScript example class
- Rate limiting with retry logic
- Type-safe API client implementation
- Testing examples (unit & integration)
- Error handling strategies

**Audience**: Backend developers, API SDK creators
**Read Time**: 30-45 minutes
**Language**: TypeScript/JavaScript
**Includes**: 30+ working code examples

---

### CURL_EXAMPLES.md

**Type**: Testing Reference
**Format**: Markdown
**Size**: 680 lines, 13 KB

Quick reference for testing API with cURL:

- Environment setup
- 40+ working cURL examples:
  - Health checks
  - Authentication
  - Token management
  - Image operations
  - Enhancement jobs
  - Album management
  - Gallery operations
  - Referral program
  - Payment processing
- Error response examples
- Useful cURL tips and tricks
- Automation shell scripts
- Performance measurement
- Troubleshooting guide

**Audience**: QA engineers, API testers, developers
**Read Time**: 20-30 minutes
**Use**: Copy-paste ready commands

---

### IMPLEMENTATION_SUMMARY.md

**Type**: Project Summary
**Format**: Markdown
**Size**: 389 lines, 11 KB

Comprehensive summary of the API documentation project:

- Deliverables overview
- Architecture decisions and rationale
- Tools and technologies
- Integration points with existing API
- Best practices implemented
- Next steps (phased roadmap)
- File locations and organization
- Key metrics and statistics
- Testing and validation approach
- Support and maintenance guidelines

**Audience**: Project managers, architects
**Read Time**: 15-20 minutes
**Key Sections**:

- Phase 1: Validation (Complete)
- Phase 2: Endpoint Documentation (Pending)
- Phase 3: SDK Generation (Pending)
- Phase 4: Documentation Deployment (Pending)
- Phase 5: Maintenance (Ongoing)

---

### QUICK_REFERENCE.md

**Type**: Cheat Sheet
**Format**: Markdown
**Size**: 284 lines, 7 KB

Essential information at a glance:

- API base URLs
- Authentication quick setup
- Token costs and regeneration
- Rate limits summary
- Common HTTP status codes
- Error response format
- Key endpoints list
- Query parameter reference
- Response header guide
- Useful tools and links

**Audience**: All developers (bookmark this!)
**Read Time**: 5-10 minutes
**Use**: Quick lookup during development

---

### ALBUM_ENDPOINTS.md

**Type**: Endpoint Documentation
**Format**: Markdown
**Size**: 666 lines, 16 KB

Detailed documentation for album operations:

- List albums
- Create album
- Update album
- Delete album
- Add images to album
- Remove images from album
- Share album
- Batch enhance album images
- Get album metadata

**Includes for each endpoint**:

- HTTP method and path
- Authentication requirement
- Query/path parameters
- Request body schema
- Response schema
- Status codes and examples
- Rate limit info
- Error cases

**Audience**: Backend developers
**Related Endpoints**: /api/albums/*

---

### IMAGE_ENDPOINTS.md

**Type**: Endpoint Documentation
**Format**: Markdown
**Size**: 776 lines, 17 KB

Detailed documentation for image operations:

- Upload image
- Get image details
- Delete image
- List images
- Get image versions
- Get enhanced images
- Share image
- Export image
- Move to album

**Includes for each endpoint**:

- HTTP method and path
- Authentication requirement
- Request/response examples
- All possible status codes
- Error scenarios
- Rate limiting
- Token cost information
- File format requirements

**Audience**: Backend developers
**Related Endpoints**: /api/images/_, /api/images/[id]/_

---

## Reading Path by Role

### Frontend Developer

1. Start: **README.md** (5 min)
2. Quick ref: **QUICK_REFERENCE.md** (5 min)
3. Examples: **CURL_EXAMPLES.md** (15 min)
4. Implementation: **INTEGRATION_GUIDE.md** (20 min)
5. Reference: **openapi.yaml** (as needed)

**Total Time**: ~45 minutes to get started

### Backend Developer

1. Start: **README.md** (5 min)
2. Guide: **INTEGRATION_GUIDE.md** (30 min)
3. Endpoints: **ALBUM_ENDPOINTS.md** & **IMAGE_ENDPOINTS.md** (20 min)
4. Reference: **openapi.yaml** (as needed)
5. Testing: **CURL_EXAMPLES.md** (as needed)

**Total Time**: ~55 minutes to understand all details

### QA / Test Engineer

1. Quick ref: **QUICK_REFERENCE.md** (5 min)
2. Examples: **CURL_EXAMPLES.md** (25 min)
3. Endpoints: **ALBUM_ENDPOINTS.md** & **IMAGE_ENDPOINTS.md** (15 min)
4. Reference: **openapi.yaml** (as needed)

**Total Time**: ~45 minutes to start testing

### DevOps / API Consumer

1. Overview: **README.md** (5 min)
2. Reference: **QUICK_REFERENCE.md** (5 min)
3. Spec: **openapi.yaml** (15 min)
4. Integration: **INTEGRATION_GUIDE.md** (20 min)

**Total Time**: ~45 minutes for integration

### Project Manager / Architect

1. Overview: **IMPLEMENTATION_SUMMARY.md** (15 min)
2. Architecture: **README.md** (10 min)
3. Details: **openapi.yaml** (20 min)

**Total Time**: ~45 minutes for big picture

---

## Common Tasks

### "I need to understand the API quickly"

- Read: QUICK_REFERENCE.md (5 min)
- Then: INTEGRATION_GUIDE.md (20 min)
- Location: README.md → INTEGRATION_GUIDE.md

### "I want to test an endpoint"

- Read: CURL_EXAMPLES.md (find your endpoint)
- Copy command and run
- Location: docs/api/CURL_EXAMPLES.md

### "I'm implementing a feature"

- Reference: INTEGRATION_GUIDE.md (patterns)
- Check: ALBUM_ENDPOINTS.md or IMAGE_ENDPOINTS.md (details)
- Validate: openapi.yaml (complete schema)
- Location: docs/api/INTEGRATION_GUIDE.md

### "I need to generate an SDK"

- Read: README.md (SDK generation section)
- Run: OpenAPI Generator command
- Validate: openapi.yaml
- Location: docs/api/README.md

### "I want to set up Swagger UI"

- Read: README.md (deployment section)
- Use: openapi.yaml file
- Command: `npx swagger-ui docs/api/openapi.yaml -p 8080`
- Location: docs/api/README.md

### "I need error handling details"

- Reference: QUICK_REFERENCE.md (error codes)
- Details: INTEGRATION_GUIDE.md (error handler class)
- Examples: CURL_EXAMPLES.md (error responses)
- Location: Multiple files

### "I'm documenting API changes"

- Update: openapi.yaml (spec)
- Update: INTEGRATION_GUIDE.md (if patterns change)
- Update: CURL_EXAMPLES.md (if endpoints change)
- Location: docs/api/openapi.yaml

---

## API Statistics

### Schemas (25+)

- User Models: 3
- Image Models: 3
- Album Models: 2
- Referral Models: 2
- Voucher Models: 1
- App Models: 2
- Admin Models: 2
- Error Models: 2
- Other: 3+

### Enumerations (5)

- EnhancementTier
- JobStatus
- AlbumPrivacy
- ExportFormat
- UserRole

### Endpoints by Category

- Health: 1
- Authentication: 1 (via NextAuth.js)
- Tokens: 2
- Images: 8
- Enhancement: 4
- Albums: 8
- Jobs: 4
- Gallery: 2
- Referral: 2
- Vouchers: 2
- Stripe: 2
- Apps: 3
- Admin: 8+
- Public: 2

**Total Documented Routes**: 48+

---

## Tools for These Docs

### Viewing

- GitHub: Native markdown rendering
- VS Code: Markdown preview
- Markdown viewers: Any online viewer

### OpenAPI Spec Usage

- Swagger UI: `https://swagger.io/tools/swagger-ui/`
- ReDoc: `npx @redocly/cli build-docs docs/api/openapi.yaml`
- Postman: Import openapi.yaml directly
- OpenAPI Generator: Generate SDKs
- Swagger CLI: Validate specification

### Creating Requests

- cURL: Command line tool (all examples provided)
- Postman: GUI for building requests
- Insomnia: Similar to Postman
- REST Client VS Code: Extension for testing
- Thunder Client: VS Code extension

---

## Maintenance & Updates

### When API Endpoint Changes

1. Update openapi.yaml (source of truth)
2. Update relevant endpoint document (ALBUM_ENDPOINTS.md, etc.)
3. Update CURL_EXAMPLES.md if examples change
4. Update INTEGRATION_GUIDE.md if patterns change
5. Update QUICK_REFERENCE.md if relevant
6. Validate with: `npx swagger-cli validate docs/api/openapi.yaml`

### When Adding New Endpoint

1. Add schema to openapi.yaml (components section)
2. Add endpoint definition to openapi.yaml (paths section)
3. Add cURL example to CURL_EXAMPLES.md
4. Add integration example to INTEGRATION_GUIDE.md (if new pattern)
5. Update QUICK_REFERENCE.md if important
6. Consider new endpoint documentation file if complex

### Release Checklist

- [ ] openapi.yaml validated
- [ ] All endpoints documented
- [ ] CURL examples tested
- [ ] Integration guide examples tested
- [ ] No 404 links in documentation
- [ ] Version numbers updated
- [ ] Changelog updated

---

## Version History

| Version | Date         | Status   | Notes                                                                                       |
| ------- | ------------ | -------- | ------------------------------------------------------------------------------------------- |
| 1.0.0   | Dec 12, 2025 | Complete | Initial base specification with 25+ schemas, all components, ready for endpoint definitions |

---

## Support & Questions

### For API Users

- Start: docs/api/README.md
- Questions: contact support@spike.land
- Issues: GitHub Issues

### For Maintainers

- Guidelines: See IMPLEMENTATION_SUMMARY.md
- Changes: Update openapi.yaml first, then derived docs
- Validation: `npx swagger-cli validate docs/api/openapi.yaml`

### For Contributors

- Follow patterns in existing documentation
- Update openapi.yaml as source of truth
- Test cURL examples before committing
- Validate all YAML/JSON before pushing

---

## Related Documentation

For additional context, see:

- [API_REFERENCE.md](../API_REFERENCE.md) - Detailed endpoint reference
- [TOKEN_SYSTEM.md](../TOKEN_SYSTEM.md) - Token economy details
- [IMAGE_ENHANCEMENT.md](../IMAGE_ENHANCEMENT.md) - Enhancement pipeline
- [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) - Data models
- [SECURITY_AUDIT_REPORT.md](../SECURITY_AUDIT_REPORT.md) - Security details

---

**Last Updated**: December 12, 2025
**Current Version**: 1.0.0
**Status**: Complete - Base specification ready for deployment
**Next Review**: December 19, 2025 or when major changes occur
