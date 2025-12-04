-- Phase 3-5 Schema Migration
-- Adds: UserRole enum, role column, referral columns, voucher tables, referral tables, audit_logs table

-- CreateEnum for UserRole
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum for VoucherType
DO $$ BEGIN
    CREATE TYPE "VoucherType" AS ENUM ('FIXED_TOKENS', 'PERCENTAGE_BONUS', 'SUBSCRIPTION_TRIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum for VoucherStatus
DO $$ BEGIN
    CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'DEPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum for ReferralStatus
DO $$ BEGIN
    CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'INVALID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum for AuditAction
DO $$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM ('ROLE_CHANGE', 'TOKEN_ADJUSTMENT', 'VOUCHER_CREATE', 'VOUCHER_UPDATE', 'VOUCHER_DELETE', 'USER_DELETE', 'ADMIN_LOGIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Add referral columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCount" INTEGER NOT NULL DEFAULT 0;

-- Create unique index for referralCode (allows NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode") WHERE "referralCode" IS NOT NULL;

-- Add foreign key for referredById (self-referential)
DO $$ BEGIN
    ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable vouchers
CREATE TABLE IF NOT EXISTS "vouchers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "VoucherType" NOT NULL,
    "value" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable voucher_redemptions
CREATE TABLE IF NOT EXISTS "voucher_redemptions" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokensGranted" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable referrals
CREATE TABLE IF NOT EXISTS "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "tokensGranted" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for vouchers
CREATE UNIQUE INDEX IF NOT EXISTS "vouchers_code_key" ON "vouchers"("code");
CREATE INDEX IF NOT EXISTS "vouchers_code_idx" ON "vouchers"("code");
CREATE INDEX IF NOT EXISTS "vouchers_status_expiresAt_idx" ON "vouchers"("status", "expiresAt");

-- CreateIndexes for voucher_redemptions
CREATE UNIQUE INDEX IF NOT EXISTS "voucher_redemptions_voucherId_userId_key" ON "voucher_redemptions"("voucherId", "userId");
CREATE INDEX IF NOT EXISTS "voucher_redemptions_userId_redeemedAt_idx" ON "voucher_redemptions"("userId", "redeemedAt");
CREATE INDEX IF NOT EXISTS "voucher_redemptions_voucherId_idx" ON "voucher_redemptions"("voucherId");

-- CreateIndexes for referrals
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referrerId_refereeId_key" ON "referrals"("referrerId", "refereeId");
CREATE INDEX IF NOT EXISTS "referrals_referrerId_status_idx" ON "referrals"("referrerId", "status");
CREATE INDEX IF NOT EXISTS "referrals_refereeId_idx" ON "referrals"("refereeId");
CREATE INDEX IF NOT EXISTS "referrals_status_createdAt_idx" ON "referrals"("status", "createdAt");

-- CreateIndexes for audit_logs
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_targetId_idx" ON "audit_logs"("targetId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey for voucher_redemptions
DO $$ BEGIN
    ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey for referrals
DO $$ BEGIN
    ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey for audit_logs
DO $$ BEGIN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
