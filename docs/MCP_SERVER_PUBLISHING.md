# MCP Server Package Publishing Guide

This document describes how to publish the `@spike-land/mcp-server` package to npm.

## Package Information

- **Package Name**: `@spike-land/mcp-server`
- **Current Version**: 0.1.0
- **Registry**: https://www.npmjs.com/package/@spike-land/mcp-server
- **Source**: `packages/mcp-server/`

## Prerequisites

### 1. npm Account Setup

You need an npm account with access to the `@spike-land` organization scope:

1. Create an npm account at https://www.npmjs.com/signup
2. Request access to the `@spike-land` organization (or create it)
3. Generate an npm access token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type (for CI/CD)
   - Copy the token (starts with `npm_...`)

### 2. GitHub Secret Configuration

Add the npm token to GitHub repository secrets:

1. Go to: https://github.com/zerdos/spike-land-nextjs/settings/secrets/actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: Your npm token from step 1
5. Click "Add secret"

## Publishing Methods

### Method 1: Automated Publishing via GitHub Actions (Recommended)

A GitHub Actions workflow template is provided at `docs/workflows/publish-mcp-server.yml`. To use it:

1. **Copy the workflow file**:
   ```bash
   cp docs/workflows/publish-mcp-server.yml .github/workflows/
   git add .github/workflows/publish-mcp-server.yml
   git commit -m "chore: Add MCP server publishing workflow"
   git push
   ```

2. **Follow the publishing steps below**

#### Option A: Tag-based Publishing

```bash
# 1. Update version in package.json
cd packages/mcp-server
npm version 0.1.1  # or patch, minor, major

# 2. Commit the version bump
git add package.json
git commit -m "chore(mcp-server): bump version to 0.1.1"

# 3. Create and push a git tag
git tag mcp-server-v0.1.1
git push origin main
git push origin mcp-server-v0.1.1

# 4. GitHub Actions will automatically:
#    - Build the package
#    - Publish to npm with provenance
#    - Create a GitHub release
```

#### Option B: Manual Workflow Dispatch

```bash
# Trigger the workflow manually from GitHub UI:
# 1. Go to: https://github.com/zerdos/spike-land-nextjs/actions/workflows/publish-mcp-server.yml
# 2. Click "Run workflow"
# 3. Select branch: main
# 4. Enter version: 0.1.1
# 5. Click "Run workflow"
```

Or via GitHub CLI:

```bash
gh workflow run publish-mcp-server.yml \
  --ref main \
  --field version=0.1.1
```

### Method 2: Manual Publishing (Local)

If you need to publish manually from your local machine:

```bash
# 1. Navigate to package directory
cd packages/mcp-server

# 2. Install dependencies
npm install

# 3. Build the package
npm run build

# 4. Verify build output
ls -la dist/
# Should contain: index.js, index.d.ts, client.js, client.d.ts, etc.

# 5. Test the package locally (optional)
npm pack
# This creates a .tgz file you can test with: npm install ./spike-land-mcp-server-0.1.0.tgz

# 6. Login to npm (if not already logged in)
npm login

# 7. Publish to npm
npm publish --access public

# 8. Verify publication
npm view @spike-land/mcp-server
```

## Post-Publishing Verification

After publishing, verify the package works correctly:

```bash
# 1. Test npx installation
SPIKE_LAND_API_KEY=sk_test_... npx @spike-land/mcp-server

# 2. Test npm installation
npm install -g @spike-land/mcp-server
SPIKE_LAND_API_KEY=sk_test_... spike-mcp

# 3. Check npm registry
npm view @spike-land/mcp-server

# 4. Verify package contents
npm view @spike-land/mcp-server dist.tarball
```

## Version Management

Follow semantic versioning (semver):

- **Patch** (0.1.0 → 0.1.1): Bug fixes, minor changes
  ```bash
  npm version patch
  ```

- **Minor** (0.1.0 → 0.2.0): New features, backward compatible
  ```bash
  npm version minor
  ```

- **Major** (0.1.0 → 1.0.0): Breaking changes
  ```bash
  npm version major
  ```

## Troubleshooting

### Error: "You do not have permission to publish"

**Solution**: Ensure you have access to the `@spike-land` organization on npm:
```bash
npm owner add YOUR_USERNAME @spike-land/mcp-server
```

### Error: "Package name too similar to existing package"

**Solution**: The `@spike-land` scope prevents naming conflicts. Ensure you're logged into the correct npm account.

### Error: "dist/ directory not found"

**Solution**: Run the build command before publishing:
```bash
npm run build
```

### Error: "Invalid authentication token"

**Solution**: For GitHub Actions, verify `NPM_TOKEN` secret is set correctly. For local publishing, run:
```bash
npm logout
npm login
```

## Package Distribution

Once published, users can install the package:

### Via npx (Recommended)
```bash
SPIKE_LAND_API_KEY=sk_live_... npx @spike-land/mcp-server
```

### Via npm install
```bash
npm install -g @spike-land/mcp-server
SPIKE_LAND_API_KEY=sk_live_... spike-mcp
```

### Claude Desktop Configuration
Users add to `~/.config/claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "spike-land": {
      "command": "npx",
      "args": ["@spike-land/mcp-server"],
      "env": {
        "SPIKE_LAND_API_KEY": "sk_live_..."
      }
    }
  }
}
```

## Security Considerations

1. **npm Token**: Keep the `NPM_TOKEN` secret secure. Rotate it periodically.
2. **Provenance**: The GitHub Actions workflow uses `--provenance` flag for supply chain security.
3. **Access Control**: Limit npm organization access to trusted maintainers.
4. **Version Tags**: Use git tags to track published versions.

## Related Documentation

- [MCP Tools User Guide](https://spike.land/apps/pixel/mcp-tools)
- [API Key Management](https://spike.land/settings)
- [Issue #196: MCP Server Implementation](https://github.com/zerdos/spike-land-nextjs/issues/196)
- [Issue #201: MCP Server Publishing](https://github.com/zerdos/spike-land-nextjs/issues/201)

## Support

For issues with publishing, contact:
- Repository owner: @zerdos
- Create an issue: https://github.com/zerdos/spike-land-nextjs/issues
