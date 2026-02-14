import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAIProviders } from "./actions";
import { AIProvidersClient } from "./AIProvidersClient";

export default async function AITokensPage() {
  const session = await auth();

  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SUPER_ADMIN)) {
    redirect("/");
  }

  const providers = await getAIProviders();
  const mapped = providers.map((p) => ({
    ...p,
    config: p.config as Record<string, unknown> | null,
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">AI Token Management</h2>
      </div>
      <AIProvidersClient initialProviders={mapped} />
    </div>
  );
}
