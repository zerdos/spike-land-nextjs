import prisma from "@/lib/prisma";

/**
 * Comprehensive list of disposable email providers
 * This list contains 200+ known temporary/disposable email domains
 * that are commonly used for fraudulent signups.
 *
 * To add custom blocked domains, set the BLOCKED_EMAIL_DOMAINS environment
 * variable as a comma-separated list (e.g., "domain1.com,domain2.com")
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  // Original list
  "tempmail.com",
  "throwaway.email",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "maildrop.cc",
  "temp-mail.org",
  "getnada.com",
  "trashmail.com",
  "fakeinbox.com",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamail.net",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.org",
  "spam4.me",
  "tempinbox.com",
  "mailnesia.com",
  "emailondeck.com",
  // Extended list - Popular services
  "dispostable.com",
  "getairmail.com",
  "mohmal.com",
  "tempail.com",
  "tempm.com",
  "tempr.email",
  "discard.email",
  "discardmail.com",
  "spamgourmet.com",
  "mytrashmail.com",
  "mailcatch.com",
  "mailexpire.com",
  "mailmoat.com",
  "spamex.com",
  "mintemail.com",
  "jetable.org",
  "trash-mail.com",
  "getonemail.com",
  "anonymbox.com",
  "emkei.cz",
  // Guerrilla Mail variants
  "guerrillamail.de",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam.la",
  // 10 Minute Mail variants
  "10minutemail.net",
  "10minutemail.org",
  "10minutemail.de",
  "10minemail.com",
  // Temp mail variants
  "tempmailo.com",
  "tempmailaddress.com",
  "temp-mail.io",
  "tempmails.net",
  // Other popular services
  "disposableemailaddresses.com",
  "emailsensei.com",
  "fakemailgenerator.com",
  "throwawaymail.com",
  "incognitomail.org",
  "incognitomail.com",
  "anonymousemail.me",
  "hidemail.de",
  "mailtemp.info",
  "tempemailco.com",
  "nada.email",
  "inboxkitten.com",
  "tempmailbox.net",
  "tmpmail.net",
  "tmpmail.org",
  "moakt.com",
  "mohmal.im",
  "disbox.net",
  "disbox.org",
  "mailsac.com",
  "mailslite.com",
  "eyepaste.com",
  "emailfake.com",
  "crazymailing.com",
  "spamobox.com",
  "tempomail.fr",
  "mailforspam.com",
  "spamfree24.org",
  "spamfree24.de",
  "spamfree24.info",
  "spambox.us",
  "spambox.xyz",
  "mailhazard.com",
  "mailhazard.us",
  "emailtemporar.ro",
  "emailtemporario.com.br",
  // German services
  "wegwerfemail.de",
  "einmalmail.de",
  "spoofmail.de",
  "trash-mail.de",
  // French services
  "jetable.com",
  "jetable.net",
  // Russian services
  "mailforspam.com",
  "temp-mail.ru",
  // Spanish services
  "correo-temporal.com",
  "emailtemporal.org",
  // Other international
  "tempemailbox.net",
  "tempemail.net",
  "tempemail.biz",
  "tempemail.com",
  // Additional common domains
  "binkmail.com",
  "bobmail.info",
  "bodypiercing.com",
  "bugmenot.com",
  "bumpymail.com",
  "casualdx.com",
  "centermail.com",
  "cheatmail.de",
  "consumerriot.com",
  "cool.fr.nf",
  "correo.blogos.net",
  "cosmorph.com",
  "courrieltemporaire.com",
  "curryworld.de",
  "cust.in",
  "dacoolest.com",
  "dandikmail.com",
  "dayrep.com",
  "deadaddress.com",
  "deadspam.com",
  "despam.it",
  "despammed.com",
  "devnullmail.com",
  "dfgh.net",
  "digitalsanctuary.com",
  "discardmail.de",
  "disposableaddress.com",
  "disposableemailaddresses.com",
  "disposableinbox.com",
  "dispose.it",
  "disposeamail.com",
  "disposemail.com",
  "dispostable.com",
  "dm.w3internet.co.ukexample.com",
  "dodgeit.com",
  "dodgit.com",
  "dodgit.org",
  "dontreg.com",
  "dontsendmespam.de",
  "drdrb.com",
  "e4ward.com",
  "einmalmail.de",
  "email60.com",
  "emaildienst.de",
  "emailias.com",
  "emaillime.com",
  "emailmiser.com",
  "emailsensei.com",
  "emailtemporario.com.br",
  "emailthe.net",
  "emailtmp.com",
  "emailto.de",
  "emailwarden.com",
  "emailx.at.hm",
  "emailxfer.com",
  "emz.net",
  "enterto.com",
  "ephemail.net",
  "etranquil.com",
  "etranquil.net",
  "etranquil.org",
  "evopo.com",
  "explodemail.com",
  "fakeinbox.cf",
  "fakeinbox.ga",
  "fakeinbox.ml",
  "fakeinbox.tk",
  "fakeinformation.com",
  "fansworldwide.de",
  "fastacura.com",
  "fastchevy.com",
  "fastchrysler.com",
  "fastkawasaki.com",
  "fastmazda.com",
  "fastmitsubishi.com",
  "fastnissan.com",
  "fastsubaru.com",
  "fastsuzuki.com",
  "fasttoyota.com",
  "fastyamaha.com",
  "filzmail.com",
  "fixmail.tk",
  "fizmail.com",
  "flyspam.com",
  "fr33mail.info",
  "frapmail.com",
  "friendlymail.co.uk",
  "front14.org",
  "fuckingduh.com",
  "fudgerub.com",
  "garliclife.com",
  "gehensiull.com",
  "get1mail.com",
  "get2mail.fr",
  "getonemail.com",
  "getonemail.net",
  "ghosttexter.de",
  "gishpuppy.com",
  "goemailgo.com",
  "gotmail.com",
  "gotmail.net",
  "gotmail.org",
  "gotti.otherinbox.com",
  "gowikibooks.com",
  "gowikicampus.com",
  "gowikicars.com",
  "gowikifilms.com",
  "gowikigames.com",
  "gowikimusic.com",
  "gowikinetwork.com",
  "gowikitravel.com",
  "gowikitv.com",
  "grandmamail.com",
  "grandmasmail.com",
  "great-host.in",
  "greensloth.com",
];

/**
 * Get the complete list of blocked email domains including custom domains from env
 */
export function getBlockedEmailDomains(): string[] {
  const customDomains = process.env.BLOCKED_EMAIL_DOMAINS;
  if (customDomains) {
    const additionalDomains = customDomains
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);
    return [...DISPOSABLE_EMAIL_DOMAINS, ...additionalDomains];
  }
  return DISPOSABLE_EMAIL_DOMAINS;
}

const SAME_IP_WINDOW_HOURS = 24;
const MAX_REFERRALS_PER_DAY = 10;

export interface FraudCheckResult {
  passed: boolean;
  reasons: string[];
}

/**
 * Check if email is from a disposable email provider
 * Uses both the hardcoded list and any custom domains from BLOCKED_EMAIL_DOMAINS env var
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return false;
  }

  const blockedDomains = getBlockedEmailDomains();
  return blockedDomains.includes(domain);
}

/**
 * Check if IP address was used for another referral recently
 */
export async function checkSameIpReferral(
  ipAddress: string,
  referrerId: string,
): Promise<boolean> {
  if (!ipAddress) {
    return false; // Cannot check without IP
  }

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - SAME_IP_WINDOW_HOURS);

  const recentReferral = await prisma.referral.findFirst({
    where: {
      referrerId,
      ipAddress,
      createdAt: {
        gte: cutoffTime,
      },
    },
  });

  return recentReferral !== null;
}

/**
 * Check if referrer has exceeded daily referral limit
 */
export async function checkReferralRateLimit(
  referrerId: string,
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayReferralCount = await prisma.referral.count({
    where: {
      referrerId,
      createdAt: {
        gte: today,
      },
    },
  });

  return todayReferralCount >= MAX_REFERRALS_PER_DAY;
}

/**
 * Check if user's email is verified
 */
export async function checkEmailVerified(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  if (!user) {
    return false;
  }

  return user.emailVerified !== null;
}

/**
 * Perform comprehensive fraud checks on a referral
 */
export async function performFraudChecks(
  refereeId: string,
  referrerId: string,
  ipAddress?: string,
): Promise<FraudCheckResult> {
  const reasons: string[] = [];

  // Get referee details
  const referee = await prisma.user.findUnique({
    where: { id: refereeId },
    select: { email: true, emailVerified: true },
  });

  if (!referee) {
    reasons.push("Referee user not found");
    return { passed: false, reasons };
  }

  // Check 1: Disposable email
  if (referee.email && isDisposableEmail(referee.email)) {
    reasons.push("Disposable email address detected");
  }

  // Check 2: Email verification (require verification for reward)
  if (!referee.emailVerified) {
    reasons.push("Email not verified");
  }

  // Check 3: Same IP address
  if (ipAddress) {
    const sameIp = await checkSameIpReferral(ipAddress, referrerId);
    if (sameIp) {
      reasons.push("Same IP address used within 24 hours");
    }
  }

  // Check 4: Rate limiting
  const rateLimited = await checkReferralRateLimit(referrerId);
  if (rateLimited) {
    reasons.push("Referrer exceeded daily referral limit");
  }

  // Check 5: Self-referral (should be caught earlier, but double-check)
  if (refereeId === referrerId) {
    reasons.push("Self-referral not allowed");
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Validate and process referral after signup
 * This should be called after user verifies their email
 */
export async function validateReferralAfterVerification(
  refereeId: string,
): Promise<{
  success: boolean;
  referralId?: string;
  shouldGrantRewards: boolean;
  error?: string;
}> {
  try {
    // Find pending referral for this user
    const referral = await prisma.referral.findFirst({
      where: {
        refereeId,
        status: "PENDING",
      },
      include: {
        referrer: { select: { id: true } },
      },
    });

    if (!referral) {
      return {
        success: false,
        shouldGrantRewards: false,
        error: "No pending referral found",
      };
    }

    // Perform fraud checks
    const fraudCheck = await performFraudChecks(
      refereeId,
      referral.referrerId,
      referral.ipAddress ?? undefined,
    );

    if (!fraudCheck.passed) {
      // Mark as invalid
      await prisma.referral.update({
        where: { id: referral.id },
        data: { status: "INVALID" },
      });

      return {
        success: true,
        referralId: referral.id,
        shouldGrantRewards: false,
        error: `Fraud checks failed: ${fraudCheck.reasons.join(", ")}`,
      };
    }

    // All checks passed - ready for reward
    return {
      success: true,
      referralId: referral.id,
      shouldGrantRewards: true,
    };
  } catch (error) {
    console.error("Failed to validate referral:", error);
    return {
      success: false,
      shouldGrantRewards: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get fraud detection statistics for admin dashboard
 */
export async function getFraudStats(): Promise<{
  totalReferrals: number;
  validReferrals: number;
  invalidReferrals: number;
  pendingReferrals: number;
  invalidReasons: Record<string, number>;
}> {
  const [total, valid, invalid, pending] = await Promise.all([
    prisma.referral.count(),
    prisma.referral.count({ where: { status: "COMPLETED" } }),
    prisma.referral.count({ where: { status: "INVALID" } }),
    prisma.referral.count({ where: { status: "PENDING" } }),
  ]);

  // In a real implementation, you would store invalid reasons in the database
  // For now, return a placeholder
  const invalidReasons: Record<string, number> = {};

  return {
    totalReferrals: total,
    validReferrals: valid,
    invalidReferrals: invalid,
    pendingReferrals: pending,
    invalidReasons,
  };
}
