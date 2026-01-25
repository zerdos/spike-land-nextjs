/**
 * Early setup file - loaded first before any other E2E files
 *
 * This file is named with "00-" prefix to ensure it loads before other support files.
 * It configures dotenv BEFORE any step definitions or world files run, ensuring
 * DATABASE_URL and other environment variables are available when Prisma initializes.
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables immediately at module load time
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log("[E2E Setup] Loaded environment from .env.local");
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("[E2E Setup] Loaded environment from .env");
} else {
  console.warn("[E2E Setup] No .env file found - environment may be incomplete");
}
