# Vercel Domain Setup for spike.land

**Note:** This is archived documentation. Subdomain references (next.spike.land, pixel.spike.land) are now deprecated. All traffic should use the main domain: https://spike.land with route-based navigation (e.g., /apps/images).

This guide explains how to configure custom domains for the Spike Land platform on Vercel.

## Domain Structure

| Domain             | Purpose       | Status     | Notes                                             |
| ------------------ | ------------- | ---------- | ------------------------------------------------- |
| `spike.land`       | Main platform | Active     | Production domain                                 |
| `pixel.spike.land` | Pixel app     | DEPRECATED | Was intended to redirect to `/apps/images`        |
| `next.spike.land`  | Legacy        | DEPRECATED | Was intended to redirect to `spike.land`          |

**Current Setup:** Only `spike.land` is actively used. All routes are accessed via the main domain (e.g., `spike.land/apps/images`).

## Vercel Configuration

1. **Log in to Vercel Dashboard**: https://vercel.com/dashboard

2. **Navigate to your project**: Select `spike-land-nextjs` project

3. **Go to Settings → Domains**

4. **Add Custom Domains**:
   - Click "Add" and enter: `spike.land` (set as **Production Domain**)
   - ~~Click "Add" and enter: `pixel.spike.land`~~ (DEPRECATED - no longer needed)
   - ~~Click "Add" and enter: `next.spike.land`~~ (DEPRECATED - no longer needed)

5. **Vercel will provide DNS records**:
   - You'll see instructions showing what DNS records to add
   - Typically it will be a CNAME record pointing to `cname.vercel-dns.com`

## Redirects (vercel.json)

**Historical Note:** Previously, redirects were configured in `vercel.json` for subdomain support:

- ~~`pixel.spike.land/*` → `spike.land/apps/images/*` (301 permanent)~~ - REMOVED
- ~~`next.spike.land/*` → `spike.land/*` (301 permanent)~~ - REMOVED

**Current:** No subdomain redirects are configured. All routing is handled via Next.js App Router.

## Important Notes

- **Production Deployment**: The main branch automatically deploys to `spike.land`
- **Preview Deployments**: All other branches get unique preview URLs
- **SSL Certificate**: Vercel automatically provisions and renews SSL certificates
- **Propagation Time**: DNS changes may take up to 48 hours globally (usually faster)

## Verification

After adding the DNS records in Cloudflare (see CLOUDFLARE_DNS_SETUP.md):

1. Wait a few minutes for DNS propagation
2. Vercel will automatically verify the domain
3. Once verified, you'll see a green checkmark next to the domain
4. Test the deployment:
   - `https://spike.land` → should show the homepage
   - `https://spike.land/apps/images` → should show the Pixel image enhancement app

## Troubleshooting

- **Domain verification fails**: Double-check DNS records in Cloudflare match Vercel's requirements
- **SSL certificate issues**: Ensure Cloudflare SSL mode is set to "Full" or "Full (strict)"
- **Redirects not working**: Ensure `vercel.json` is committed and deployed
- **Deployment not showing on custom domain**: Ensure the domain is set as "Production Domain" in Vercel settings
