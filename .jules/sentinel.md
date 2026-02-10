## 2025-05-23 - Unauthenticated Debug Endpoint (RCE)
**Vulnerability:** Found `src/app/api/test/agent-debug/route.ts` which allowed unauthenticated users to execute arbitrary code modifications on `testing.spike.land` via an agent.
**Learning:** Debug endpoints in `src/app/api/test` are deployed by default in Next.js and must be explicitly protected or excluded from production builds.
**Prevention:** Always wrap test/debug endpoints in `if (process.env.NODE_ENV !== 'development')` checks and add authentication layers (`auth()`) even for local development tools.

## 2025-05-24 - Path Traversal in Blog Post Retrieval
**Vulnerability:** `getPostBySlug` in `src/lib/blog/get-posts.ts` accepted unvalidated `slug` input, allowing traversal to parent directories (e.g., `../../../etc/passwd`).
**Learning:** File system access functions must explicitly validate or sanitize input paths, even when using "safe" path joiners like `path.join`, if the input can contain traversal sequences.
**Prevention:** Use strict regex validation (e.g., `/^[a-zA-Z0-9_-]+$/`) for filenames or identifiers derived from user input before passing them to file system APIs.