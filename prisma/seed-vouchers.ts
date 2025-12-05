import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const vouchers = [
    { code: "LAUNCH100", type: "FIXED_TOKENS" as const, value: 100, maxUses: 1000 },
    { code: "WELCOME50", type: "FIXED_TOKENS" as const, value: 50, maxUses: null },
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

  console.log("Seeded launch vouchers:", vouchers.map(v => v.code));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
