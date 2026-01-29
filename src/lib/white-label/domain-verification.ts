import { randomBytes } from 'crypto';
import { promises as dns } from 'dns';
import type { SslCertificateStatus } from '@/types/white-label';

/**
 * Generate a unique verification token for DNS TXT record
 * Format: spike-land-verify=<random-hex-32>
 */
export function generateVerificationToken(): string {
  const randomHex = randomBytes(16).toString('hex');
  return `spike-land-verify=${randomHex}`;
}

/**
 * Verify domain ownership by checking for TXT record with verification token
 * @param domain - The domain to verify (e.g., example.com)
 * @param expectedToken - The verification token to look for
 * @returns True if the token is found in DNS TXT records
 */
export async function verifyDomainOwnership(
  domain: string,
  expectedToken: string
): Promise<boolean> {
  try {
    // Query TXT records for the domain
    const txtRecords = await dns.resolveTxt(domain);

    // Flatten the TXT record array (each record can be an array of strings)
    const flattenedRecords = txtRecords.flat();

    // Check if any record matches the expected token
    return flattenedRecords.some((record) => record === expectedToken);
  } catch (error) {
    console.error('Error verifying domain ownership:', error);
    return false;
  }
}

/**
 * Get DNS verification instructions for a domain
 * @param domain - The domain to verify
 * @param verificationToken - The token to add to DNS
 */
export function getVerificationInstructions(domain: string, verificationToken: string) {
  return {
    recordType: 'TXT' as const,
    host: domain,
    value: verificationToken,
    ttl: 3600, // 1 hour (standard TTL)
  };
}

/**
 * Initiate SSL certificate provisioning via Vercel or Cloudflare API
 * This is a placeholder - actual implementation depends on hosting provider
 *
 * @param domain - The verified domain to provision SSL for
 * @returns Status of SSL provisioning request
 */
export async function initiateSslProvisioning(
  domain: string
): Promise<{ success: boolean; status: SslCertificateStatus }> {
  try {
    // TODO: Implement actual SSL provisioning
    // For Vercel: Use Vercel Domains API
    // For Cloudflare: Use Cloudflare API

    // Placeholder implementation
    console.log(`Initiating SSL provisioning for domain: ${domain}`);

    // In a real implementation, you would:
    // 1. Call Vercel/Cloudflare API to request certificate
    // 2. Wait for Let's Encrypt to issue the certificate
    // 3. Return the provisioning status

    return {
      success: true,
      status: 'PROVISIONING',
    };
  } catch (error) {
    console.error('Error initiating SSL provisioning:', error);
    return {
      success: false,
      status: 'FAILED',
    };
  }
}

/**
 * Check SSL certificate status for a domain
 * This is a placeholder - actual implementation depends on hosting provider
 *
 * @param domain - The domain to check SSL status for
 * @returns Current SSL certificate status and expiration info
 */
export async function checkSslStatus(domain: string): Promise<{
  status: SslCertificateStatus;
  issuedAt?: Date;
  expiresAt?: Date;
  daysUntilExpiration?: number;
}> {
  try {
    // TODO: Implement actual SSL status check
    // For Vercel: Use Vercel Domains API
    // For Cloudflare: Use Cloudflare API

    // Placeholder implementation
    console.log(`Checking SSL status for domain: ${domain}`);

    // In a real implementation, you would:
    // 1. Call Vercel/Cloudflare API to get certificate info
    // 2. Parse issuance and expiration dates
    // 3. Calculate days until expiration

    return {
      status: 'PENDING',
    };
  } catch (error) {
    console.error('Error checking SSL status:', error);
    return {
      status: 'FAILED',
    };
  }
}

/**
 * Calculate days until SSL certificate expiration
 * @param expiresAt - Certificate expiration date
 * @returns Number of days until expiration, or null if expired/invalid
 */
export function calculateDaysUntilExpiration(expiresAt: Date | null | undefined): number | null {
  if (!expiresAt) return null;

  const now = new Date();
  const expiration = new Date(expiresAt);
  const diffMs = expiration.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Determine SSL certificate status based on expiration date
 * @param expiresAt - Certificate expiration date
 * @returns Appropriate SSL certificate status
 */
export function getSslStatusFromExpiration(
  expiresAt: Date | null | undefined
): SslCertificateStatus {
  if (!expiresAt) return 'PENDING';

  const daysUntilExpiration = calculateDaysUntilExpiration(expiresAt);

  if (daysUntilExpiration === null) return 'EXPIRED';
  if (daysUntilExpiration <= 0) return 'EXPIRED';
  if (daysUntilExpiration <= 30) return 'EXPIRING_SOON';

  return 'ACTIVE';
}

/**
 * Validate domain format
 * @param domain - Domain to validate
 * @returns True if domain format is valid
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}
