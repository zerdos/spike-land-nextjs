-- DropForeignKey
ALTER TABLE "mcp_generation_jobs" DROP CONSTRAINT IF EXISTS "mcp_generation_jobs_apiKeyId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "mcp_generation_jobs_apiKeyId_idx";

-- AlterTable
ALTER TABLE "mcp_generation_jobs" DROP COLUMN IF EXISTS "apiKeyId";

-- DropTable
DROP TABLE IF EXISTS "api_keys";
