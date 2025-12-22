# Security Hardening

This document outlines security improvements implemented in the application.

## CSP Nonces

We have implemented a nonce-based Content Security Policy (CSP) to strictly control which scripts can execute.

### Implementation
- **Middleware**: A `src/middleware.ts` generates a cryptographically secure nonce for each request.
- **CSP Header**: The `Content-Security-Policy` header is set dynamically in the middleware, including the `nonce-{value}` directive in `script-src`.
- **Utility**: `src/lib/security/csp-nonce.ts` provides nonce generation (middleware safe).
- **Server Utility**: `src/lib/security/csp-nonce-server.ts` provides nonce retrieval for server components.

### Usage
To use the nonce in server components (e.g., layouts):

```typescript
import { getNonce } from "@/lib/security/csp-nonce-server";

export default async function Layout({ children }) {
  const nonce = await getNonce();
  return (
    <html lang="en">
      <body>
        {/* ... */}
        <Script src="..." nonce={nonce} />
      </body>
    </html>
  );
}
```

Next.js automatically handles nonces for its internal scripts when the `x-nonce` header is present.

## Bcrypt Cost Factor

The bcrypt cost factor (salt rounds) has been increased from 10 to 12.

### Rationale
- **NIST Recommendation**: Higher cost factors make brute-force and rainbow table attacks significantly slower.
- **Performance**: A cost of 12 provides a good balance between security and server performance for login operations.

### Affected Areas
- User Signup (`src/app/api/auth/signup/route.ts`)
- Admin Password Management (`src/app/api/admin/users/password/route.ts`)
