import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local for local development only
// In production, DATABASE_URL is set via environment variables
if (process.env.NODE_ENV !== "production") {
  config({ path: ".env.local" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
