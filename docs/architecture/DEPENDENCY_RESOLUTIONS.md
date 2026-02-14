# Dependency Resolution Explanations

This document explains why certain dependency versions are overridden in the root `package.json` file.

## `esbuild`

**Resolutions:**

```json
"resolutions": {
  "esbuild@0.14.47": "0.25.0",
  "esbuild@0.23.1": "0.25.0"
}
```

**Reasoning:**

- **`esbuild@0.23.1`:** This version is a transitive dependency of `@tanstack/router-generator@1.150.0` via `recast@0.23.11`. As of this writing, `@tanstack/router-generator` is at its latest version, so we cannot update it to resolve this dependency conflict. The project requires a newer version of `esbuild` for its own build processes, so we must force the resolution.

- **`esbuild@0.14.47`:** The exact package requiring this older version could not be definitively identified during the investigation. However, given the presence of the explicit resolution, it is presumed to be a necessary override to prevent build failures.

**Future Action:**

- A GitHub issue should be created for `@tanstack/router-generator` to request an update to their dependencies.
- Periodically re-evaluate the need for these resolutions, especially the one for `esbuild@0.14.47`.
