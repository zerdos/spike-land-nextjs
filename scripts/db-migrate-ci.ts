#!/usr/bin/env tsx
/**
 * Non-interactive Prisma migration script for CI/Jules environments
 *
 * Usage:
 *   yarn db:migrate:ci <migration_name>
 *   yarn db:migrate:ci add_user_preferences
 *
 * This script creates a migration without interactive prompts,
 * suitable for use in async coding agents like Jules.
 */

import { execSync } from "child_process";

const migrationName = process.argv[2];

if (!migrationName) {
  console.log("Usage: yarn db:migrate:ci <migration_name>");
  console.log("");
  console.log("Examples:");
  console.log("  yarn db:migrate:ci add_user_preferences");
  console.log("  yarn db:migrate:ci update_brand_settings");
  console.log("");
  console.log("After creating the migration, run:");
  console.log("  yarn db:migrate:deploy    # Apply migrations");
  process.exit(1);
}

// Validate migration name format (snake_case, alphanumeric)
if (!/^[a-z][a-z0-9_]*$/.test(migrationName)) {
  console.error("Error: Migration name must be snake_case (e.g., add_user_preferences)");
  console.error("  - Start with a lowercase letter");
  console.error("  - Only lowercase letters, numbers, and underscores");
  process.exit(1);
}

console.log(`Creating migration: ${migrationName}`);
console.log("");

try {
  // --create-only creates migration file without applying it
  // --name provides the migration name non-interactively
  execSync(`yarn prisma migrate dev --name ${migrationName} --create-only`, {
    stdio: "inherit",
    env: process.env,
  });

  console.log("");
  console.log("Migration file created successfully!");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Review the generated migration in prisma/migrations/");
  console.log("  2. Run 'yarn db:migrate:deploy' to apply the migration");
  console.log("  3. Run 'yarn db:generate' to regenerate the Prisma client");
} catch {
  console.error("");
  console.error("Migration creation failed. Check the error above.");
  process.exit(1);
}
