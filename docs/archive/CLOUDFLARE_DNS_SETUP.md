# Cloudflare DNS Setup for next.spike.land

This guide explains how to configure DNS records in Cloudflare for your custom domain `next.spike.land`.

## Prerequisites

- Domain `spike.land` is managed by Cloudflare
- You have access to the Cloudflare dashboard for this domain

## DNS Configuration Steps

1. **Log in to Cloudflare Dashboard**: https://dash.cloudflare.com

2. **Select your domain**: Click on `spike.land`

3. **Navigate to DNS**: Click on "DNS" in the left sidebar

4. **Add CNAME Record**:
   - Click "Add record"
   - Type: `CNAME`
   - Name: `next`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **DNS only** (gray cloud, NOT proxied)
   - TTL: Auto
   - Click "Save"

## Important: Cloudflare Proxy Setting

**CRITICAL**: The CNAME record MUST be set to "DNS only" (gray cloud icon), NOT "Proxied" (orange cloud).

Why?

- Vercel needs to provision SSL certificates directly
- Proxied records can interfere with Vercel's SSL certificate generation
- "DNS only" mode allows Vercel to handle SSL/TLS directly

## SSL/TLS Configuration

1. **Navigate to SSL/TLS**: Click on "SSL/TLS" in the left sidebar

2. **Set Encryption Mode**:
   - Choose: **Full (strict)** or **Full**
   - This ensures end-to-end encryption between Cloudflare, Vercel, and users

## Verification Steps

After adding the DNS record:

1. **Check DNS propagation**:
   ```bash
   # On your terminal
   dig next.spike.land
   # or
   nslookup next.spike.land
   ```
   Should show: `next.spike.land. IN CNAME cname.vercel-dns.com.`

2. **Verify in Vercel**:
   - Go back to Vercel Dashboard → Project → Settings → Domains
   - Wait for Vercel to verify the domain (usually 1-5 minutes)
   - Once verified, you'll see a green checkmark

3. **Test the deployment**:
   - After next deployment to `main` branch
   - Visit: https://next.spike.land
   - Should show your Next.js application

## Expected DNS Record

After setup, your DNS record should look like:

| Type  | Name | Target               | Proxy Status | TTL  |
| ----- | ---- | -------------------- | ------------ | ---- |
| CNAME | next | cname.vercel-dns.com | DNS only     | Auto |

## Troubleshooting

### Domain not verifying in Vercel

- Ensure CNAME is set to "DNS only" (gray cloud)
- Wait 5-10 minutes for DNS propagation
- Try using `dig` or `nslookup` to verify DNS record is live

### SSL certificate errors

- Check SSL/TLS mode is set to "Full" or "Full (strict)" in Cloudflare
- Ensure CNAME proxy status is "DNS only"
- Wait for Vercel to provision SSL (can take a few minutes)

### "Too many redirects" error

- Change Cloudflare SSL mode from "Flexible" to "Full"
- Ensure CNAME is not proxied (must be DNS only)

### DNS not propagating

- DNS changes can take up to 48 hours globally (usually 5-30 minutes)
- Use online DNS checkers: https://dnschecker.org
- Clear your local DNS cache:
  ```bash
  # macOS
  sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

  # Linux
  sudo systemd-resolve --flush-caches

  # Windows
  ipconfig /flushdns
  ```

## Additional Resources

- [Vercel Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
