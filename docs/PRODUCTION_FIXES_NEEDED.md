# Production Fixes Required

## Issues Identified

### 1. Database Migrations Not Applied ✅ FIXED IN CODE
**Status**: Fixed in codebase, will be applied on next deployment
**Issue**: The EnhancedImage and ImageEnhancementJob tables don't exist in production database
**Error**: Server Component 500 error on `/apps/images`

**Solution Applied**:
- Created initial migration in `prisma/migrations/0_init/migration.sql`
- Updated `package.json` build script to run `prisma migrate deploy` before build
- Next deployment will automatically apply migrations

### 2. GitHub OAuth Redirect URI Not Configured ⚠️ REQUIRES MANUAL FIX
**Status**: Requires manual configuration in GitHub OAuth App settings
**Issue**: GitHub OAuth shows "Invalid Redirect URI" error
**Current Redirect URI**: `https://next.spike.land/api/auth/callback/github`
**Error**: "The redirect_uri is not associated with this application"

**Solution Required**:
1. Go to GitHub OAuth App settings: https://github.com/settings/applications
2. Find the OAuth app with Client ID: `Ov23liMoRsb1WZ7wlFou`
3. Add the following to **Authorization callback URLs**:
   - `https://next.spike.land/api/auth/callback/github`
   - `http://localhost:3000/api/auth/callback/github` (for local development)
4. Save changes

**Note**: This is a manual step that must be completed by someone with access to the GitHub OAuth app settings.

## Deployment Plan

1. ✅ Commit migration files and package.json changes
2. ✅ Push to main branch
3. ⏳ CI/CD will trigger automatic deployment
4. ⏳ Build process will run `prisma migrate deploy` automatically
5. ⚠️ **MANUAL**: Update GitHub OAuth app redirect URIs (see above)
6. ✅ Test production deployment

## Testing Checklist

After deployment:
- [ ] Visit https://next.spike.land/apps - should see Images app
- [ ] Click "Launch App" on Images - should redirect to sign-in
- [ ] Try GitHub OAuth - should work after redirect URI is configured
- [ ] After sign-in, visit /apps/images - should show empty state (no server error)
- [ ] Upload an image - should work
- [ ] View enhancement page - should work

## Files Changed

- `prisma/migrations/0_init/migration.sql` - Initial database schema migration
- `package.json` - Updated build script to run migrations
- `next.config.ts` - Already has R2 image hostname configured
