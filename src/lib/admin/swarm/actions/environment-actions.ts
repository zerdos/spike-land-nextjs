"use server";

import { auth } from "@/auth";
import { verifyAdminAccess } from "@/lib/auth/admin-middleware";
import type { EnvironmentName } from "../types";

export async function deployToEnvironment(envName: EnvironmentName) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const hasAccess = await verifyAdminAccess(session);
  if (!hasAccess) throw new Error("Forbidden");

  // Placeholder: trigger actual deployment via Vercel API
  return { success: true, environment: envName, message: `Deployment to ${envName} initiated` };
}

export async function rollbackEnvironment(envName: EnvironmentName) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const hasAccess = await verifyAdminAccess(session);
  if (!hasAccess) throw new Error("Forbidden");

  // Placeholder: trigger rollback via Vercel API
  return { success: true, environment: envName, message: `Rollback on ${envName} initiated` };
}
