# Image Enhancement App - Privacy & Compliance

This document outlines data handling practices, user rights, and compliance requirements for the Image Enhancement App.

---

## Table of Contents

1. [Data Collection](#data-collection)
2. [Data Storage & Retention](#data-storage--retention)
3. [User Rights](#user-rights)
4. [GDPR Compliance](#gdpr-compliance)
5. [Security Measures](#security-measures)
6. [Content Guidelines](#content-guidelines)
7. [Third-Party Services](#third-party-services)
8. [Image Ownership & Copyright](#image-ownership--copyright)
9. [Compliance Checklist](#compliance-checklist)

---

## Data Collection

### What We Collect

| Data Type | Purpose | Legal Basis |
|-----------|---------|-------------|
| Email address | Account identification, communication | Contract performance |
| Name | Personalization | Legitimate interest |
| Profile image | User experience | Consent |
| OAuth tokens | Authentication with providers | Contract performance |
| Uploaded images | Core service functionality | Contract performance |
| Enhanced images | Service delivery | Contract performance |
| Token transactions | Service billing | Contract performance |
| Payment info | Process purchases (via Stripe) | Contract performance |
| IP address | Security, fraud prevention | Legitimate interest |
| Usage analytics | Service improvement | Legitimate interest |

### What We Don't Collect

- Images are NOT used for AI training
- No biometric data extraction
- No facial recognition storage
- No location data from images (EXIF stripped on upload)

---

## Data Storage & Retention

### Storage Locations

| Data Type | Storage Location | Encryption |
|-----------|------------------|------------|
| User accounts | PostgreSQL (Neon) | At-rest encryption |
| Original images | Cloudflare R2 | At-rest encryption |
| Enhanced images | Cloudflare R2 | At-rest encryption |
| Session data | JWT tokens | Signed & encrypted |
| Payment data | Stripe (PCI compliant) | Stripe managed |

### Retention Periods

| Data Type | Retention Period | Justification |
|-----------|------------------|---------------|
| User account | Until deletion request | Service continuity |
| Original images | 90 days after last access | Allow re-enhancement |
| Enhanced images | 90 days after last access | Download availability |
| Transaction history | 7 years | Legal/tax requirements |
| Server logs | 30 days | Security monitoring |
| Analytics data | 2 years (anonymized) | Service improvement |

### Automatic Cleanup

```
Images inactive > 90 days:
  1. Send warning email (7 days before)
  2. Move to deletion queue
  3. Permanently delete from R2
  4. Remove database records
```

### Data Deletion on Account Closure

When a user deletes their account:

1. **Immediate** (within 24 hours):
   - Session tokens invalidated
   - OAuth connections revoked
   - Login disabled

2. **Within 30 days**:
   - All images deleted from R2
   - User record anonymized
   - Albums deleted
   - Transaction records retained (legal requirement)

---

## User Rights

### GDPR Article 15-22 Rights

| Right | Implementation | How to Exercise |
|-------|----------------|-----------------|
| **Access** (Art. 15) | Export all data | Settings > Download My Data |
| **Rectification** (Art. 16) | Edit profile | Settings > Profile |
| **Erasure** (Art. 17) | Delete account | Settings > Delete Account |
| **Restriction** (Art. 18) | Pause processing | Contact support |
| **Portability** (Art. 20) | Download in JSON | Settings > Download My Data |
| **Objection** (Art. 21) | Opt-out analytics | Settings > Privacy |
| **Automated decisions** (Art. 22) | Human review option | Contact support |

### Data Export Format

Users can export their data in a structured JSON format:

```json
{
  "user": {
    "id": "user_xxx",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "images": [
    {
      "id": "img_xxx",
      "name": "photo.jpg",
      "originalUrl": "https://...",
      "enhancements": [
        {
          "tier": "TIER_2K",
          "enhancedUrl": "https://...",
          "createdAt": "2024-01-16T12:00:00Z"
        }
      ]
    }
  ],
  "albums": [...],
  "transactions": [...],
  "exportedAt": "2024-01-20T14:00:00Z"
}
```

### Response Times

| Request Type | Maximum Response Time |
|--------------|----------------------|
| Data access request | 30 days |
| Rectification | 72 hours |
| Deletion | 30 days |
| Portability export | 30 days |

---

## GDPR Compliance

### Lawful Bases Used

| Processing Activity | Lawful Basis | Reference |
|--------------------|--------------|-----------|
| Account creation | Contract performance | Art. 6(1)(b) |
| Image enhancement | Contract performance | Art. 6(1)(b) |
| Payment processing | Contract performance | Art. 6(1)(b) |
| Marketing emails | Consent | Art. 6(1)(a) |
| Analytics | Legitimate interest | Art. 6(1)(f) |
| Security logs | Legitimate interest | Art. 6(1)(f) |

### Data Processing Agreement (DPA)

Sub-processors with DPAs in place:

| Provider | Purpose | Location | DPA Status |
|----------|---------|----------|------------|
| Cloudflare | CDN, R2 storage | US/EU | Signed |
| Neon | PostgreSQL database | US/EU | Signed |
| Stripe | Payment processing | US/EU | Signed |
| Google | Gemini AI API | US | Signed |
| Vercel | Hosting | US/EU | Signed |

### Cross-Border Transfers

Data transfers outside EEA use:
- Standard Contractual Clauses (SCCs)
- EU-US Data Privacy Framework (where applicable)
- Binding Corporate Rules (for large providers)

---

## Security Measures

### Technical Measures

| Measure | Implementation |
|---------|----------------|
| Encryption in transit | TLS 1.3 required |
| Encryption at rest | AES-256 (R2, PostgreSQL) |
| Authentication | OAuth 2.0 + JWT |
| Session management | Secure, HttpOnly cookies |
| API security | Rate limiting, CORS |
| File validation | Type checking, size limits |
| SQL injection | Prisma ORM parameterization |
| XSS prevention | React auto-escaping, CSP |

### Organizational Measures

| Measure | Implementation |
|---------|----------------|
| Access control | Role-based (RBAC) |
| Audit logging | All admin actions logged |
| Incident response | 72-hour breach notification |
| Employee training | Annual security training |
| Penetration testing | Annual third-party audit |

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login attempts | 5 | 15 minutes |
| Image uploads | 20 | 1 hour |
| API requests | 100 | 1 minute |
| Password reset | 3 | 1 hour |

---

## Content Guidelines

### Prohibited Content

Users must NOT upload:

1. **Illegal content**
   - Child sexual abuse material (CSAM)
   - Non-consensual intimate images
   - Content illegal in user's jurisdiction

2. **Harmful content**
   - Malware or malicious files
   - Content promoting violence
   - Harassment or doxxing material

3. **Infringing content**
   - Copyright violations
   - Trademark infringement
   - Stolen intellectual property

### Content Moderation

For public gallery (if enabled):

| Level | Action | Trigger |
|-------|--------|---------|
| Automated | Hash matching for known illegal content | Upload |
| Automated | AI content classification | Upload |
| User reports | Manual review queue | Report button |
| Admin review | Content removal + account action | Violation confirmed |

### Reporting Mechanism

Users can report content via:
- Report button on images (public gallery)
- Email: abuse@[domain]
- In-app reporting form

Response time: 24 hours for review, immediate removal for confirmed violations.

---

## Third-Party Services

### Google Gemini API

| Aspect | Detail |
|--------|--------|
| Purpose | AI image enhancement |
| Data sent | Image bytes only |
| Data retention by Google | Per Google AI terms |
| Location | US (Google Cloud) |

**Important:** Images are processed by Google's AI. Users consent to this when using the service.

### Stripe

| Aspect | Detail |
|--------|--------|
| Purpose | Payment processing |
| Data sent | Email, payment method |
| PCI compliance | Stripe is PCI DSS Level 1 |
| Data retention | Per Stripe privacy policy |

### Cloudflare R2

| Aspect | Detail |
|--------|--------|
| Purpose | Image storage |
| Location | Edge network (nearest region) |
| Encryption | AES-256 at rest |
| Access | Signed URLs only |

---

## Image Ownership & Copyright

### Ownership Rights

1. **Original images**: User retains full ownership
2. **Enhanced images**: User retains full ownership
3. **AI processing**: No transfer of rights to platform
4. **Platform license**: Limited license to store/process for service delivery

### User Warranties

By uploading, users warrant that:
- They own or have rights to the image
- The image doesn't infringe third-party rights
- The image complies with content guidelines

### Platform Rights

The platform may:
- Store images for service delivery
- Create thumbnails for UI display
- Process images for enhancement
- Delete images per retention policy

The platform will NOT:
- Use images for marketing without consent
- Train AI models on user images
- Sell or transfer images to third parties
- Access images for purposes other than service delivery

### DMCA / Copyright Takedown

For copyright complaints:

1. Submit takedown request with:
   - Identification of copyrighted work
   - Location of infringing content
   - Contact information
   - Good faith statement
   - Signature

2. Platform will:
   - Remove content within 24 hours
   - Notify the uploader
   - Restore if counter-notice received

---

## Compliance Checklist

### GDPR Requirements

- [x] Privacy policy published
- [x] Cookie consent banner
- [x] Data processing records (Art. 30)
- [x] DPAs with sub-processors
- [x] User rights implementation
- [x] Data breach procedures
- [x] DPO designated (if required)
- [x] Cross-border transfer mechanisms

### CCPA Requirements (California)

- [x] "Do Not Sell" option (N/A - we don't sell data)
- [x] Right to know disclosure
- [x] Right to delete implementation
- [x] Non-discrimination policy

### UK GDPR (Post-Brexit)

- [x] UK representative (if required)
- [x] ICO registration
- [x] UK-specific privacy notice

### PCI DSS (Payment Card)

- [x] No card data stored (Stripe handles)
- [x] Secure checkout integration
- [x] Webhook verification

---

## Contact Information

### Data Protection Officer

For privacy inquiries:
- Email: privacy@[domain]
- Response time: 72 hours

### Regulatory Authorities

Users may lodge complaints with:
- **UK**: Information Commissioner's Office (ICO)
- **EU**: Local Data Protection Authority
- **US**: FTC (Federal Trade Commission)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-XX-XX | Initial version |

---

## Related Documentation

- [Vision Document](./IMAGE_ENHANCEMENT_VISION.md) - Product overview
- [Database Schema](./IMAGE_ENHANCEMENT_SCHEMA.md) - Data models
- [Implementation Roadmap](./IMAGE_ENHANCEMENT_ROADMAP.md) - Development phases
