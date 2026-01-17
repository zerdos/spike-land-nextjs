# Beta Dependencies

This document tracks project dependencies that are currently pinned to a beta version. For each beta dependency, we provide a rationale for its use and a plan for migrating to a stable version.

## `next-auth@5.0.0-beta.30`

**Rationale:**

The project's architecture is built on Next.js with the App Router. The stable version of `next-auth` (v4) does not support the App Router, making the v5 beta a requirement for core authentication functionality.

**Migration Plan:**

The `next-auth` team is actively working on a stable v5 release. We will monitor the `next-auth` repository and release notes for updates. Once a stable v5 is available, we will create a dedicated task to upgrade, test, and validate the new version.

**Action:** Set a quarterly calendar reminder to check for a stable release.

## `workflow@4.0.1-beta.47`

**Rationale:**

The `workflow` package is used for creating durable, long-running background jobs, such as the image enhancement workflows in `src/workflows`. The beta version of this package provides essential features, including `FatalError` for controlling retry logic, which are not available in any stable release.

**Migration Plan:**

The stability and availability of the `workflow` package will be monitored. When a stable version that includes the required features is released, we will plan an upgrade.

**Action:** Set a quarterly calendar reminder to check for a stable release.
