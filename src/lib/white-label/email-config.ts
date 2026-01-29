import prisma from '@/lib/prisma';

/**
 * Default email sender configuration for Spike Land
 */
const DEFAULT_SENDER = {
  name: 'Spike Land',
  email: 'noreply@spike.land',
  domain: 'spike.land',
};

/**
 * Get email sender information for a workspace
 * Returns custom sender info if configured and verified, otherwise returns defaults
 *
 * @param workspaceId - Workspace ID
 * @returns Sender name and email address
 */
export async function getEmailSenderInfo(workspaceId: string): Promise<{
  name: string;
  email: string;
  domain: string;
}> {
  try {
    const config = await prisma.workspaceWhiteLabelConfig.findUnique({
      where: { workspaceId },
      select: {
        emailSenderName: true,
        emailSenderDomain: true,
        emailSenderVerified: true,
      },
    });

    // Return custom sender info if configured and verified
    if (
      config?.emailSenderName &&
      config?.emailSenderDomain &&
      config?.emailSenderVerified
    ) {
      return {
        name: config.emailSenderName,
        email: `noreply@${config.emailSenderDomain}`,
        domain: config.emailSenderDomain,
      };
    }

    // Fall back to default Spike Land sender
    return DEFAULT_SENDER;
  } catch (error) {
    console.error('Error fetching email sender info:', error);
    return DEFAULT_SENDER;
  }
}

/**
 * Verify custom email domain via DKIM/SPF records
 * This is a placeholder - actual implementation depends on email provider (Resend, SendGrid, etc.)
 *
 * @param domain - Email domain to verify
 * @returns Verification status
 */
export async function verifyEmailDomain(domain: string): Promise<{
  success: boolean;
  verified: boolean;
  message?: string;
}> {
  try {
    // TODO: Implement actual email domain verification
    // For Resend: Use Resend domain verification API
    // For SendGrid: Use SendGrid domain authentication API

    // Placeholder implementation
    console.log(`Verifying email domain: ${domain}`);

    // In a real implementation, you would:
    // 1. Call email provider API to add domain
    // 2. Get DKIM/SPF records to add to DNS
    // 3. Verify DNS records are in place
    // 4. Return verification status

    return {
      success: true,
      verified: false,
      message: 'Email domain verification initiated. Please add the required DNS records.',
    };
  } catch (error) {
    console.error('Error verifying email domain:', error);
    return {
      success: false,
      verified: false,
      message: 'Failed to initiate email domain verification',
    };
  }
}

/**
 * Build email From address for a workspace
 * Format: "Sender Name" <email@domain.com>
 *
 * @param workspace - Workspace with white-label config
 * @returns Formatted From address
 */
export async function buildEmailFromAddress(workspaceId: string): Promise<string> {
  const senderInfo = await getEmailSenderInfo(workspaceId);
  return `"${senderInfo.name}" <${senderInfo.email}>`;
}

/**
 * Get email header logo URL for a workspace
 * Returns custom logo if configured, otherwise returns default Spike Land logo
 *
 * @param workspaceId - Workspace ID
 * @returns Logo URL
 */
export async function getEmailHeaderLogoUrl(workspaceId: string): Promise<string | null> {
  try {
    const config = await prisma.workspaceWhiteLabelConfig.findUnique({
      where: { workspaceId },
      select: {
        emailHeaderLogoUrl: true,
        logoUrl: true,
      },
    });

    // Return custom email header logo if configured
    if (config?.emailHeaderLogoUrl) {
      return config.emailHeaderLogoUrl;
    }

    // Fall back to regular logo
    if (config?.logoUrl) {
      return config.logoUrl;
    }

    // No custom logo configured
    return null;
  } catch (error) {
    console.error('Error fetching email header logo:', error);
    return null;
  }
}

/**
 * Get email footer text for a workspace
 * Returns custom footer if configured, otherwise returns default
 *
 * @param workspaceId - Workspace ID
 * @returns Footer text
 */
export async function getEmailFooterText(workspaceId: string): Promise<string> {
  try {
    const config = await prisma.workspaceWhiteLabelConfig.findUnique({
      where: { workspaceId },
      select: {
        emailFooterText: true,
        showPoweredBySpikeLand: true,
      },
    });

    let footerText = config?.emailFooterText || '';

    // Add "Powered by Spike Land" if enabled
    if (config?.showPoweredBySpikeLand !== false) {
      const poweredBy = 'Powered by Spike Land';
      footerText = footerText
        ? `${footerText}\n\n${poweredBy}`
        : poweredBy;
    }

    return footerText;
  } catch (error) {
    console.error('Error fetching email footer text:', error);
    return 'Powered by Spike Land';
  }
}

/**
 * Get complete email branding configuration for a workspace
 *
 * @param workspaceId - Workspace ID
 * @returns Complete email branding config
 */
export async function getEmailBrandingConfig(workspaceId: string): Promise<{
  fromAddress: string;
  senderName: string;
  senderEmail: string;
  headerLogoUrl: string | null;
  footerText: string;
  showPoweredBy: boolean;
}> {
  const [fromAddress, senderInfo, headerLogoUrl, footerText, config] = await Promise.all([
    buildEmailFromAddress(workspaceId),
    getEmailSenderInfo(workspaceId),
    getEmailHeaderLogoUrl(workspaceId),
    getEmailFooterText(workspaceId),
    prisma.workspaceWhiteLabelConfig.findUnique({
      where: { workspaceId },
      select: { showPoweredBySpikeLand: true },
    }),
  ]);

  return {
    fromAddress,
    senderName: senderInfo.name,
    senderEmail: senderInfo.email,
    headerLogoUrl,
    footerText,
    showPoweredBy: config?.showPoweredBySpikeLand ?? true,
  };
}

/**
 * Check if a workspace has custom email branding configured
 *
 * @param workspaceId - Workspace ID
 * @returns True if custom branding is configured
 */
export async function hasCustomEmailBranding(workspaceId: string): Promise<boolean> {
  const config = await prisma.workspaceWhiteLabelConfig.findUnique({
    where: { workspaceId },
    select: {
      emailSenderName: true,
      emailSenderDomain: true,
      emailSenderVerified: true,
      emailHeaderLogoUrl: true,
      emailFooterText: true,
    },
  });

  return !!(
    config &&
    (config.emailSenderVerified ||
      config.emailHeaderLogoUrl ||
      config.emailFooterText)
  );
}
