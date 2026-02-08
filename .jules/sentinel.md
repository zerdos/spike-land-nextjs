## 2025-05-23 - Unauthenticated Debug Endpoint (RCE)
**Vulnerability:** Found `src/app/api/test/agent-debug/route.ts` which allowed unauthenticated users to execute arbitrary code modifications on `testing.spike.land` via an agent.
**Learning:** Debug endpoints in `src/app/api/test` are deployed by default in Next.js and must be explicitly protected or excluded from production builds.
**Prevention:** Always wrap test/debug endpoints in `if (process.env.NODE_ENV !== 'development')` checks and add authentication layers (`auth()`) even for local development tools.
