# Security Architecture Review: AI Cloud Swarm Platform Management Dashboard

**Auditor:** Security Architecture Review (Automated)
**Date:** 2026-02-14
**Scope:** CEO-facing admin panel for deployments, AI agent management, and sensitive business data
**Risk Rating:** HIGH -- this dashboard controls production infrastructure and AI agent execution

---

## Table of Contents

1. Executive Summary
2. Authentication Flow for the New Dashboard
3. Authorization Model
4. Agent Execution Sandboxing Requirements
5. WebSocket Authentication and Message Validation
6. Secret Management
7. Audit Trail Requirements
8. Rate Limiting Strategy
9. CSRF/XSS Protection
10. Input Validation for Agent Commands
11. Incident Response: Rogue Agent
12. Findings: Existing Vulnerabilities
13. Implementation Priorities

---

## 1. Executive Summary

The existing codebase has a solid security foundation with several well-implemented patterns:
- AES-256-GCM vault encryption with per-user key derivation
- PKCE-backed OAuth 2.1 with timing-safe comparisons
- 3-tier capability evaluation (DENY > ALLOW > ASK) for agent permissions
- Comprehensive audit logging schema (AgentAuditLog, AuditLog, WorkspaceAuditLog)
- CSP with nonce-based script allowlisting
- Rate limiting with Redis + in-memory fallback

However, the new dashboard features introduce critical attack surfaces that require hardening before deployment. This review identifies **7 HIGH**, **9 MEDIUM**, and **5 LOW** severity findings, with actionable remediation for each.

---

## 2. Authentication Flow for the New Dashboard

### Current State

The authentication system uses NextAuth v5 with JWT strategy and multiple OAuth providers. The proxy.ts middleware protects routes like /my-apps, /settings, /profile, /enhance.

- Auth config: `/Users/z/Developer/spike-land-nextjs/src/auth.config.ts`
- Auth handlers: `/Users/z/Developer/spike-land-nextjs/src/auth.ts`
- Middleware: `/Users/z/Developer/spike-land-nextjs/src/proxy.ts`

### Required Changes

**FINDING SEC-AUTH-01 [HIGH]: Dashboard routes are not in the protected paths list.**

The middleware at `/Users/z/Developer/spike-land-nextjs/src/proxy.ts` lines 65-70 defines:

```typescript
const PROTECTED_PATHS = [
  "/my-apps",
  "/settings",
  "/profile",
  "/enhance",
] as const;
```

The dashboard (presumably at /admin or /dashboard) is NOT listed. Any admin routes must be added here AND receive additional role-based checks.

**Recommended Authentication Flow:**

```
Browser -> Middleware (proxy.ts)
  |-> Check if path starts with /admin or /dashboard
  |-> Verify NextAuth JWT session exists
  |-> Extract user.role from JWT token
  |-> If role !== ADMIN && role !== SUPER_ADMIN -> 403 redirect
  |-> If SUPER_ADMIN required (deployments, agent spawning) -> additional check
  |-> Pass through with CSP nonce header
  |-> Dashboard loads with session context
```

**FINDING SEC-AUTH-02 [HIGH]: E2E bypass accessible on staging.**

In `/Users/z/Developer/spike-land-nextjs/src/proxy.ts` lines 213-217:

```typescript
const isStagingDomain = appUrl === "https://next.spike.land" || appUrl.includes("localhost");
const isProduction = process.env.NODE_ENV === "production" &&
  process.env.VERCEL_ENV === "production" &&
  !isStagingDomain;
```

The staging domain next.spike.land is explicitly excluded from the "production" check, meaning the E2E bypass header works there. If the admin dashboard is deployed to staging for testing, an attacker who discovers the E2E_BYPASS_SECRET can bypass all authentication. The bypass also allows setting arbitrary roles via cookies (e2e-user-role).

**Remediation:**
- Add a separate DASHBOARD_E2E_BYPASS_ENABLED env var that defaults to false
- Never allow E2E bypass on admin/dashboard routes regardless of environment
- Consider moving to a separate E2E-only deployment instead of header-based bypass

**FINDING SEC-AUTH-03 [MEDIUM]: Stable user ID uses weak hashing.**

In `/Users/z/Developer/spike-land-nextjs/src/auth.config.ts` lines 42-58, createStableUserId uses a simple bitwise hash (DJB2 variant) for Edge runtime compatibility. This is a 32-bit hash with known collision properties. While acceptable for general user ID generation, admin user IDs should not be predictable.

**Remediation:**
- Use SubtleCrypto (available in Edge) for SHA-256-based HMAC: crypto.subtle.sign("HMAC", key, data)
- This is already Edge-compatible and provides cryptographic strength

### Recommended: Step-Up Authentication for Critical Actions

For deployment promotion and agent spawning, implement step-up authentication:
1. User authenticates normally (OAuth/credentials)
2. For critical actions (deploy to prod, spawn agent, access secrets), require re-authentication within the last 15 minutes
3. Store lastReauthAt timestamp in the JWT
4. Dashboard checks Date.now() - lastReauthAt < 15min before allowing critical actions
5. If expired, prompt for password or OAuth re-consent

---

## 3. Authorization Model

### Current State

The role system in `/Users/z/Developer/spike-land-nextjs/src/lib/auth/admin-middleware.ts` provides:
- USER -- standard user
- ADMIN -- administrative access
- SUPER_ADMIN -- full system access

### Required: Granular Permission Matrix

| Operation | USER | ADMIN | SUPER_ADMIN | Additional Requirement |
|---|---|---|---|---|
| View agent list | No | Yes | Yes | -- |
| View agent details | No | Yes | Yes | -- |
| Send message to agent | No | Yes | Yes | -- |
| Spawn new agent | No | No | Yes | Step-up auth |
| Stop/kill agent | No | Yes | Yes | Audit log |
| View deployment status | No | Yes | Yes | -- |
| Promote to staging | No | Yes | Yes | Approval workflow |
| Promote to production | No | No | Yes | Step-up auth + 2nd approval |
| Rollback production | No | Yes | Yes | Audit log |
| View environment secrets | No | No | Yes | Step-up auth, secrets masked |
| Modify environment secrets | No | No | Yes | Step-up auth + audit |
| View audit logs | No | Yes | Yes | -- |
| Access MCP admin tools | No | Yes | Yes | Capability token |
| Proxy external API | No | Yes | Yes | -- |
| Manage API keys | No | Yes (own) | Yes (all) | -- |
| View Stripe/billing data | No | No | Yes | -- |

**FINDING SEC-AUTHZ-01 [HIGH]: Admin MCP tools lack role verification.**

In `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/admin.ts`, the registerAdminTools function receives userId but never verifies the user's role:

```typescript
export function registerAdminTools(
  registry: ToolRegistry,
  userId: string,
): void {
  // No role check -- anyone with a valid userId can call admin tools
```

**Remediation:**
- Add role verification at tool registration time
- Add per-handler role checks as defense-in-depth
- Add a requiredRole field to ToolDefinition and enforce it in the registry

**FINDING SEC-AUTHZ-02 [MEDIUM]: Agent ownership check is post-query, not pre-query.**

In `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/agent-management.ts` lines 70-80, the full agent record is fetched before ownership check. This reveals existence of agents via different error messages ("not found" vs "permission denied").

**Remediation:**
- Use a combined where clause: where: { id: agent_id, userId }
- Return the same error for both cases: "Agent not found or access denied"

### Approval Workflow for Deployments

Implement a two-person rule for production deployments:
1. ADMIN or SUPER_ADMIN initiates deployment request
2. System creates a DeploymentApproval record with status PENDING
3. A different SUPER_ADMIN must approve (cannot self-approve)
4. Approval window: 1 hour (configurable)
5. On approval, system executes deployment
6. All actions logged to AgentAuditLog

---

## 4. Agent Execution Sandboxing Requirements

### Current State

The sandbox at `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/sandbox.ts` is entirely in-memory and simulated.

**FINDING SEC-SANDBOX-01 [HIGH]: Sandbox execution is simulated, not isolated.**

The sandbox_exec tool does NOT actually execute code. When real execution is implemented, an agent could execute arbitrary shell commands, access the host filesystem, make network requests to internal services, read environment variables, or spawn child processes.

**Required Sandboxing Architecture:**

```
Agent Command -> MCP Tool Handler
  |-> Validate against capability token
  |-> Rate limit check
  |-> Sandbox environment selection by trust level:
      SANDBOX: Isolated container, no network
      BASIC: Container with restricted network (allow-list only)
      TRUSTED: Container with broader network, filesystem quota
      AUTONOMOUS: Full container (still no host access)
  |-> Execute with resource limits:
      CPU time: 30s default
      Memory: 256MB default
      Filesystem: 100MB quota
      No host env vars, no host filesystem
      Network restricted by trust level
      Process count limit: 10
  |-> Capture stdout/stderr
  |-> Record in AgentAuditLog
  |-> Return result
```

**Technology Options:**
1. Vercel Sandbox (@vercel/sandbox): Already a dependency
2. Docker containers with security options
3. Firecracker microVMs for maximum isolation

**FINDING SEC-SANDBOX-02 [MEDIUM]: No file size or count limits in sandbox virtual filesystem.**

sandbox_write_file accepts any size content with no limits. An agent could fill server memory.

**Remediation:** Add per-sandbox file count limit (100), per-file size limit (1MB), total storage limit (50MB), and file path validation.

**FINDING SEC-SANDBOX-03 [MEDIUM]: No sandbox TTL or auto-cleanup.**

Sandboxes persist until explicitly destroyed or server restart.

**Remediation:** Add a 1-hour TTL, periodic cleanup, and limit of 5 concurrent sandboxes per user.

---

## 5. WebSocket Authentication and Message Validation

### Required WebSocket Security

**Authentication:**
1. Client establishes WebSocket connection
2. Server requires authentication BEFORE upgrading (cookie-based auth during HTTP upgrade handshake is recommended)
3. Server validates the JWT/session token
4. Server verifies ADMIN or SUPER_ADMIN role
5. Connection established with userId attached
6. Idle timeout: 5 minutes with ping/pong

**Message Validation:**
1. Parse safely (JSON.parse in try/catch)
2. Schema-validate with Zod for known message types
3. Size-limit: 64KB max
4. Type-check: only known message types allowed
5. Rate-limit: 60 messages/minute per connection
6. Sanitize before broadcast to prevent stored XSS

**FINDING SEC-WS-01 [MEDIUM]: Agent-to-agent communication must be isolated per user.**

The WebSocket server must maintain per-user channels and verify ownership before broadcasting.

---

## 6. Secret Management

### Current State

The vault at `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/crypto/vault.ts` is well-implemented with AES-256-GCM and per-user key derivation.

**FINDING SEC-SECRET-01 [HIGH]: MarketingAccount stores access tokens in plaintext.**

In the Prisma schema, MarketingAccount.accessToken and refreshToken are plain String fields.

**FINDING SEC-SECRET-02 [HIGH]: Account model stores OAuth tokens in plaintext.**

Account.refresh_token and access_token are plain String fields.

**Remediation for both:** Encrypt using vault's encryptSecret() before storage. Decrypt only at point of use.

**Secret Management Architecture for the Dashboard:**

```
Dashboard Client -> API Server -> External Service
  Request data       Load encrypted key from DB
                     Decrypt with vault
                     Call external API
                     Strip sensitive headers
  Sanitized response
```

Rules:
1. API keys for external services NEVER sent to client
2. Server-side proxy makes API calls, returns only data
3. All external API keys encrypted in database using vault
4. Environment variables only accessible server-side
5. Proxy validates requested endpoint against an allow-list
6. Response data sanitized

**FINDING SEC-SECRET-03 [MEDIUM]: Vault dev fallback key is deterministic.**

The dev fallback key in vault.ts is hardcoded. Anyone with source code access can derive it.

**Remediation:** Generate a random dev key on first use stored in a gitignored file, or require VAULT_MASTER_KEY in all environments.

---

## 7. Audit Trail Requirements

### Required Audit Events

| Event | Severity | Required Fields |
|---|---|---|
| Dashboard login | INFO | userId, IP, userAgent, timestamp |
| Dashboard login failure | WARN | attemptedEmail, IP, userAgent, reason |
| Agent spawned | HIGH | userId, agentId, config, capabilityTokenId |
| Agent stopped/killed | HIGH | userId, agentId, reason, wasForced |
| Agent command sent | MEDIUM | userId, agentId, command, content |
| Deployment initiated | HIGH | userId, environment, version, approvalId |
| Deployment approved | HIGH | userId (approver), deploymentId |
| Deployment rolled back | HIGH | userId, environment, versions, reason |
| Secret viewed | HIGH | userId, secretName, wasFullAccess |
| Secret modified | CRITICAL | userId, secretName, environment |
| API key created/revoked | HIGH | userId, apiKeyId, action |
| Permission approved/denied | MEDIUM | userId, requestId, agentId, decision |
| Capability token created/revoked | HIGH | userId, tokenId, agentId, scope |
| External API proxy request | LOW | userId, targetService, endpoint |
| Bulk data export | HIGH | userId, dataType, recordCount |

**FINDING SEC-AUDIT-01 [MEDIUM]: AgentAuditLog fire-and-forget drops errors silently.**

In `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/capability-filtered-registry.ts` lines 67-76, the void keyword discards the audit write promise. If the database is down, audit records are permanently lost.

**Remediation:**
- Implement a write-ahead log (WAL) pattern with retry queue
- Never drop HIGH/CRITICAL severity audit records
- Audit logs must be append-only (no UPDATE/DELETE)

---

## 8. Rate Limiting Strategy

### Dashboard-Specific Rate Limits

| Endpoint/Action | Limit | Window | Identifier |
|---|---|---|---|
| Dashboard API (general) | 120 req | 1 min | userId |
| Agent spawn | 5 req | 1 hour | userId |
| Agent command (stop/restart) | 20 req | 1 min | userId |
| Agent message send | 30 req | 1 min | userId |
| Deployment initiate | 3 req | 1 hour | userId |
| Secret access | 10 req | 1 min | userId |
| WebSocket connections | 3 concurrent | -- | userId |
| WebSocket messages | 60 msg | 1 min | connectionId |
| External API proxy | 30 req | 1 min | userId + service |
| Failed auth attempts | 5 req | 15 min | IP address |
| Bulk data export | 1 req | 10 min | userId |

**FINDING SEC-RATE-01 [MEDIUM]: Rate limit bypass via E2E/SKIP flags.**

In `/Users/z/Developer/spike-land-nextjs/src/lib/rate-limiter.ts` lines 247-254, SKIP_RATE_LIMIT env var disables all rate limiting. If accidentally set in production, this is a complete bypass.

**Remediation:** Add NODE_ENV check, never bypass for dashboard routes, log CRITICAL alert in production.

---

## 9. CSRF/XSS Protection for Dashboard

### Current State

CSP is well-implemented with nonce-based script allowlisting. Security headers in next.config.ts include HSTS, X-Frame-Options, X-Content-Type-Options, and Permissions-Policy.

**FINDING SEC-XSS-01 [MEDIUM]: CSP allows unsafe-eval for scripts.**

In `/Users/z/Developer/spike-land-nextjs/src/proxy.ts` line 162, the CSP script-src includes 'unsafe-eval' which allows dynamic code execution APIs that undermine XSS protection.

**Remediation:** Create a stricter CSP for /admin/* and /dashboard/* routes without unsafe-eval. Keep wasm-unsafe-eval only if needed.

**FINDING SEC-CSRF-01 [LOW]: CORS wildcard on codespace routes.**

`/Users/z/Developer/spike-land-nextjs/src/lib/codespace/cors.ts` uses Access-Control-Allow-Origin: *. Ensure dashboard routes never use this pattern.

**Additional XSS Protections:**
1. Sanitize agent messages before rendering (DOMPurify)
2. Sanitize deployment logs (branch names, commit messages)
3. Sanitize external API data (Sentry errors, GitHub PR descriptions)

---

## 10. Input Validation for Agent Commands

**FINDING SEC-INPUT-01 [MEDIUM]: Agent message content has no max length.**

In `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/agent-management.ts` lines 24-27, the content field has no maximum length. Add .max(10000) and sanitize for injection.

**FINDING SEC-INPUT-02 [LOW]: Sandbox file paths not validated for traversal.**

sandbox_write_file and sandbox_read_file accept any string as file_path. When real execution is implemented, this enables path traversal.

**Required Validation Schemas for Dashboard:**

```typescript
// Agent spawn
const SpawnAgentSchema = z.object({
  displayName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_]+$/),
  projectPath: z.string().max(500).optional(),
  templateId: z.string().cuid().optional(),
  maxTokenBudget: z.number().int().min(1000).max(10000000),
  maxApiCalls: z.number().int().min(10).max(100000),
  allowedTools: z.array(z.string().max(100)).max(200),
  deniedTools: z.array(z.string().max(100)).max(200),
  trustLevel: z.enum(["SANDBOX", "BASIC", "TRUSTED"]),
});

// Agent command
const AgentCommandSchema = z.object({
  agentId: z.string().cuid(),
  command: z.enum(["stop", "restart", "pause", "resume", "reduce_budget"]),
  reason: z.string().min(1).max(500),
});

// Deployment
const DeploymentSchema = z.object({
  environment: z.enum(["staging", "production"]),
  version: z.string().regex(/^[a-f0-9]{7,40}$/),
  rollbackTo: z.string().regex(/^[a-f0-9]{7,40}$/).optional(),
  reason: z.string().min(1).max(500),
});
```

---

## 11. Incident Response: Rogue Agent

### Kill Switch Architecture

```
Dashboard UI -> "Emergency Stop Agent" button (SUPER_ADMIN only)
  API: POST /api/admin/agents/:id/kill
    Step 1: Revoke capability token immediately
    Step 2: Revoke all child tokens (delegation chain)
    Step 3: Destroy all active sandboxes
    Step 4: Close WebSocket connections
    Step 5: Mark agent as killed (deletedAt=NOW)
    Step 6: Create CRITICAL audit log
    Step 7: Notify connected dashboard users
```

### Kill All (System Emergency)

```
POST /api/admin/agents/kill-all
  Requires SUPER_ADMIN + step-up auth
  Revoke ALL active capability tokens
  Destroy ALL sandboxes
  Close ALL agent WebSocket connections
  CRITICAL audit event
  Notify all SUPER_ADMIN users
```

### Automatic Circuit Breakers

1. **Budget breaker:** >80% budget consumed in <5 min -> auto-pause + notify
2. **Error rate breaker:** >50% errors over last 20 actions -> pause + notify
3. **Permission storm:** >10 permission requests in 5 min -> pause + notify
4. **Recursion breaker:** delegation depth at max -> prevent further delegation
5. **Anomaly detection:** unusual tool access patterns -> flag for review

### Trust Level Demotion

```
AUTONOMOUS -> TRUSTED: On first revocation or >10% error rate
TRUSTED -> BASIC: On second revocation or >25% error rate
BASIC -> SANDBOX: On third revocation or >50% error rate
SANDBOX -> KILLED: On fourth revocation
```

---

## 12. Findings Summary

### HIGH Severity (7)

| ID | Finding | File |
|---|---|---|
| SEC-AUTH-01 | Dashboard routes not in protected paths | `/Users/z/Developer/spike-land-nextjs/src/proxy.ts` L65-70 |
| SEC-AUTH-02 | E2E bypass accessible on staging | `/Users/z/Developer/spike-land-nextjs/src/proxy.ts` L213-217 |
| SEC-AUTHZ-01 | Admin MCP tools lack role verification | `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/admin.ts` L63-66 |
| SEC-SANDBOX-01 | Sandbox execution simulated, not isolated | `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/sandbox.ts` L160 |
| SEC-SECRET-01 | MarketingAccount tokens in plaintext | `/Users/z/Developer/spike-land-nextjs/prisma/schema.prisma` L193 |
| SEC-SECRET-02 | Account OAuth tokens in plaintext | `/Users/z/Developer/spike-land-nextjs/prisma/schema.prisma` L172 |
| SEC-AGENT-01 | No kill switch or emergency stop | (missing) |

### MEDIUM Severity (9)

| ID | Finding | File |
|---|---|---|
| SEC-AUTH-03 | Stable user ID weak 32-bit hash | `/Users/z/Developer/spike-land-nextjs/src/auth.config.ts` L42-58 |
| SEC-AUTHZ-02 | Agent ownership check leaks existence | `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/agent-management.ts` L70-80 |
| SEC-SANDBOX-02 | No file size/count limits | `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/sandbox.ts` L251-257 |
| SEC-SANDBOX-03 | No sandbox TTL/auto-cleanup | `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/sandbox.ts` L36 |
| SEC-SECRET-03 | Vault dev fallback deterministic | `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/crypto/vault.ts` L50-53 |
| SEC-AUDIT-01 | Audit log fire-and-forget | `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/capability-filtered-registry.ts` L67-76 |
| SEC-RATE-01 | Rate limit bypass via env flags | `/Users/z/Developer/spike-land-nextjs/src/lib/rate-limiter.ts` L247-254 |
| SEC-XSS-01 | CSP allows unsafe-eval | `/Users/z/Developer/spike-land-nextjs/src/proxy.ts` L162 |
| SEC-INPUT-01 | Agent message no max length | `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/agent-management.ts` L24-27 |

### LOW Severity (5)

| ID | Finding | File |
|---|---|---|
| SEC-WS-01 | Agent comms must isolate per user | (architectural) |
| SEC-CSRF-01 | CORS wildcard on codespace routes | `/Users/z/Developer/spike-land-nextjs/src/lib/codespace/cors.ts` L8-12 |
| SEC-INPUT-02 | Sandbox paths not traversal-safe | `/Users/z/Developer/spike-land-nextjs/src/lib/mcp/server/tools/sandbox.ts` L195-228 |
| SEC-AGENT-02 | No automatic circuit breakers | (missing) |
| SEC-CRYPTO-01 | Two constantTimeCompare impls differ | `/Users/z/Developer/spike-land-nextjs/src/proxy.ts` L42 vs `/Users/z/Developer/spike-land-nextjs/src/auth.ts` L462 |

---

## 13. Implementation Priorities

### Phase 1: Pre-Launch Blockers

1. Add dashboard routes to PROTECTED_PATHS [SEC-AUTH-01]
2. Add role verification to admin MCP tools [SEC-AUTHZ-01]
3. Implement agent kill switch API [SEC-AGENT-01]
4. Disable E2E bypass for dashboard routes [SEC-AUTH-02]
5. Add content length limits to agent messages [SEC-INPUT-01]
6. Add sandbox file/size limits [SEC-SANDBOX-02]

### Phase 2: Before Production (2 weeks)

7. Encrypt MarketingAccount/Account tokens [SEC-SECRET-01/02]
8. Stricter CSP for dashboard routes [SEC-XSS-01]
9. WebSocket authentication [SEC-WS-01]
10. Sandbox TTL and auto-cleanup [SEC-SANDBOX-03]
11. Resilient audit logging (WAL) [SEC-AUDIT-01]
12. Rate limit environment validation [SEC-RATE-01]

### Phase 3: Hardening (1 month)

13. Real sandbox isolation [SEC-SANDBOX-01]
14. Deployment approval workflow (two-person rule)
15. Step-up authentication for critical actions
16. Automatic circuit breakers [SEC-AGENT-02]
17. Upgrade stable user ID to SHA-256 [SEC-AUTH-03]
18. External API proxy with allowlist
19. Unify constantTimeCompare [SEC-CRYPTO-01]

### Phase 4: Ongoing

20. Regular dependency scanning (npm audit, Snyk)
21. Penetration testing of dashboard endpoints
22. Audit log review automation
23. Trust level demotion automation
24. Secret rotation procedures

---

## OWASP References

| Finding Category | OWASP Top 10 (2021) | CWE |
|---|---|---|
| Authentication bypass | A07: Identification and Authentication Failures | CWE-287 |
| Missing authorization | A01: Broken Access Control | CWE-862 |
| Sandbox escape | A01: Broken Access Control | CWE-269 |
| Plaintext secrets | A02: Cryptographic Failures | CWE-312 |
| XSS via agent messages | A03: Injection | CWE-79 |
| Missing rate limiting | A04: Insecure Design | CWE-770 |
| Missing audit logging | A09: Security Logging and Monitoring Failures | CWE-778 |
| CSRF | A01: Broken Access Control | CWE-352 |
| Path traversal | A01: Broken Access Control | CWE-22 |
| Weak hashing | A02: Cryptographic Failures | CWE-328 |
