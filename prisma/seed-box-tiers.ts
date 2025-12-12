import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL not found");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Box Tiers...");

  const tiers = [
    {
      name: "Standard",
      description: "2 vCPU, 4GB RAM - Good for basic browsing",
      cpu: 2,
      ram: 4096,
      storage: 20,
      pricePerHour: 10,
      pricePerMonth: 0,
      sortOrder: 1,
    },
    {
      name: "Pro",
      description: "4 vCPU, 8GB RAM - Better for multitasking",
      cpu: 4,
      ram: 8192,
      storage: 40,
      pricePerHour: 20,
      pricePerMonth: 0,
      sortOrder: 2,
    },
    {
      name: "Ultra",
      description: "8 vCPU, 16GB RAM - Power user",
      cpu: 8,
      ram: 16384,
      storage: 80,
      pricePerHour: 40,
      pricePerMonth: 0,
      sortOrder: 3,
    },
  ];

  for (const tier of tiers) {
    const existing = await prisma.boxTier.findFirst({
      where: { name: tier.name },
    });

    if (!existing) {
      await prisma.boxTier.create({
        data: tier,
      });
      console.log(`Created tier: ${tier.name}`);
    } else {
      console.log(`Tier already exists: ${tier.name}`);
    }
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
