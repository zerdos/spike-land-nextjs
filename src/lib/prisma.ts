import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // If we're in a build environment (like Vercel), the DB might not be available.
    // Instead of throwing, we'll return a mock client. This allows the build to
    // succeed. If any code *actually* tries to query the DB during build, it will
    // fail, which is the desired behavior.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn(
        "DATABASE_URL not available during build. Using mocked Prisma Client.",
      );
      return new Proxy(
        {},
        {
          get: (_, prop) => {
            // This proxy will throw an error if any prisma method is called.
            throw new Error(
              `Attempted to access Prisma a build time (property: ${
                String(
                  prop,
                )
              }), but DATABASE_URL was not provided.`,
            );
          },
        },
      ) as PrismaClient;
    }

    throw new Error(
      "DATABASE_URL environment variable is required for database access. " +
        "Please ensure it is set in your environment.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
