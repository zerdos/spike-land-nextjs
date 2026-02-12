## 2025-05-23 - Unauthenticated Debug Endpoint (RCE)
**Vulnerability:** Found `src/app/api/test/agent-debug/route.ts` which allowed unauthenticated users to execute arbitrary code modifications on `testing.spike.land` via an agent.
**Learning:** Debug endpoints in `src/app/api/test` are deployed by default in Next.js and must be explicitly protected or excluded from production builds.
**Prevention:** Always wrap test/debug endpoints in `if (process.env.NODE_ENV !== 'development')` checks and add authentication layers (`auth()`) even for local development tools.

## 2025-05-24 - Path Traversal in Blog Post Retrieval
**Vulnerability:** `getPostBySlug` in `src/lib/blog/get-posts.ts` accepted unvalidated `slug` input, allowing traversal to parent directories (e.g., `../../../etc/passwd`).
**Learning:** File system access functions must explicitly validate or sanitize input paths, even when using "safe" path joiners like `path.join`, if the input can contain traversal sequences.
**Prevention:** Use strict regex validation (e.g., `/^[a-zA-Z0-9_-]+$/`) for filenames or identifiers derived from user input before passing them to file system APIs.

## 2025-06-03 - [Rate Limit Bypass in Production]
**Vulnerability:** Found `src/lib/rate-limiter.ts` allowed bypassing rate limits in production if `E2E_BYPASS_AUTH` or `SKIP_RATE_LIMIT` environment variables were accidentally set.
**Learning:** Security controls (like rate limiting) should never rely solely on environment flags that might be misconfigured. Production environments must strictly enforce security logic.
**Prevention:** Always wrap development/testing bypass logic in `process.env.NODE_ENV !== 'production'` checks.

## 2026-02-12 - [CI/CD Production Environment Rate Limiting]
**Vulnerability:** E2E tests in CI failed because strict rate limit bypass checks (`NODE_ENV !== 'production'`) blocked valid test traffic when the CI environment ran against a production build artifact.
**Learning:** CI/CD pipelines often run tests against production builds to ensure artifact integrity. Security controls must distinguish between unauthorized production bypass attempts and authorized testing automation (e.g., via specific secrets or bypass keys), rather than relying solely on `NODE_ENV`.
**Prevention:** Allow rate limit bypass in production ONLY if a strong, specific signal (like `E2E_BYPASS_AUTH`) is present and explicitly authorized, while keeping general bypasses (`SKIP_RATE_LIMIT`) restricted to non-production environments. Log warnings when production bypasses occur.
