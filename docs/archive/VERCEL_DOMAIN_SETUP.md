# Vercel Domain Setup for spike.land

This guide explains how to configure custom domains for the Spike Land platform on Vercel.

## Domain Structure

| Domain             | Purpose       | Redirect                   |
| ------------------ | ------------- | -------------------------- |
| `spike.land`       | Main platform | Production domain          |
| `pixel.spike.land` | Pixel app     | Redirects to `/apps/pixel` |
| `next.spike.land`  | Legacy        | Redirects to `spike.land`  |

## Vercel Configuration

1. **Log in to Vercel Dashboard**: https://vercel.com/dashboard

2. **Navigate to your project**: Select `spike-land-nextjs` project

3. **Go to Settings → Domains**

4. **Add Custom Domains**:
   - Click "Add" and enter: `spike.land` (set as **Production Domain**)
   - Click "Add" and enter: `pixel.spike.land`
   - Click "Add" and enter: `next.spike.land` (optional, for legacy support)

5. **Vercel will provide DNS records**:
   - You'll see instructions showing what DNS records to add
   - Typically it will be a CNAME record pointing to `cname.vercel-dns.com`

## Redirects (vercel.json)

Redirects are configured in `vercel.json` at the project root:

- `pixel.spike.land/*` → `spike.land/apps/pixel/*` (301 permanent)
- `next.spike.land/*` → `spike.land/*` (301 permanent)

## Important Notes

- **Production Deployment**: The main branch automatically deploys to `spike.land`
- **Preview Deployments**: All other branches get unique preview URLs
- **SSL Certificate**: Vercel automatically provisions and renews SSL certificates
- **Propagation Time**: DNS changes may take up to 48 hours globally (usually faster)

## Verification

After adding the DNS records in Cloudflare (see CLOUDFLARE_DNS_SETUP.md):

1. Wait a few minutes for DNS propagation
2. Vercel will automatically verify the domains
3. Once verified, you'll see a green checkmark next to each domain
4. Test the redirects:
   - `https://pixel.spike.land` → should redirect to `https://spike.land/apps/pixel`
   - `https://spike.land` → should redirect to `https://spike.land`

## Troubleshooting

- **Domain verification fails**: Double-check DNS records in Cloudflare match Vercel's requirements
- **SSL certificate issues**: Ensure Cloudflare SSL mode is set to "Full" or "Full (strict)"
- **Redirects not working**: Ensure `vercel.json` is committed and deployed
- **Deployment not showing on custom domain**: Ensure the domain is set as "Production Domain" in Vercel settings
