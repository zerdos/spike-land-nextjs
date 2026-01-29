-- Add Pinterest and Snapchat to SocialPlatform enum
-- Note: PostgreSQL enum values can only be added, not removed or reordered

ALTER TYPE "SocialPlatform" ADD VALUE IF NOT EXISTS 'PINTEREST';
ALTER TYPE "SocialPlatform" ADD VALUE IF NOT EXISTS 'SNAPCHAT';
