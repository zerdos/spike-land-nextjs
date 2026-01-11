import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

import { getE2EDatabaseUrl } from "./lib/db-protection";

// Load environment variables
config({ path: ".env.local", quiet: true });

/**
 * Seed script for launch vouchers
 *
 * SAFETY: This script has production database protection.
 * It will refuse to run against production databases.
 * See prisma/lib/db-protection.ts for details.
 */

// Get connection string with production protection
const connectionString = getE2EDatabaseUrl();
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const vouchers = [
    {
      code: "LAUNCH100",
      type: "FIXED_TOKENS" as const,
      value: 100,
      maxUses: 1000,
    },
    {
      code: "WELCOME50",
      type: "FIXED_TOKENS" as const,
      value: 50,
      maxUses: null,
    },
    { code: "BETA25", type: "FIXED_TOKENS" as const, value: 25, maxUses: 500 },
  ];

  for (const voucher of vouchers) {
    await prisma.voucher.upsert({
      where: { code: voucher.code },
      update: {},
      create: {
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        maxUses: voucher.maxUses,
        status: "ACTIVE",
      },
    });
  }

  console.log("Seeded launch vouchers:", vouchers.map((v) => v.code));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
