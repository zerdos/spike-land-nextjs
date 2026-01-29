import { Suspense } from "react";
import { auth } from "@/auth";

import { redirect } from "next/navigation";

/**
 * Role inheritance settings page
 * Configure parent-child workspace relationships
 */
export default async function InheritanceSettingsPage(
  // { params }: { params: { workspaceSlug: string } }
) {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Role Inheritance</h1>
        <p className="text-muted-foreground mt-2">
          Configure parent-child workspace relationships and role mapping
        </p>
      </div>

      <Suspense fallback={<div>Loading inheritance settings...</div>}>
        <div className="rounded-lg border p-8">
          <h2 className="text-xl font-semibold mb-4">
            Inheritance Configuration
          </h2>
          <p className="text-muted-foreground mb-4">
            Role inheritance allows agency workspaces to automatically grant
            permissions to client workspaces. When enabled, members of a parent
            workspace will have mapped roles in child workspaces.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-md bg-muted">
              <h3 className="font-medium mb-2">Parent Workspace</h3>
              <p className="text-sm text-muted-foreground">
                This workspace does not have a parent configured
              </p>
            </div>

            <div className="p-4 rounded-md bg-muted">
              <h3 className="font-medium mb-2">Child Workspaces</h3>
              <p className="text-sm text-muted-foreground">
                No child workspaces configured
              </p>
            </div>

            <p className="text-sm text-muted-foreground italic">
              Role inheritance configuration UI coming soon...
            </p>
          </div>
        </div>
      </Suspense>
    </div>
  );
}
