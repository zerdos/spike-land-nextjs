import { auth } from "@/auth";
import { WorkspaceProvider } from "@/components/orbit/WorkspaceContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { OrbitSidebar } from "./OrbitSidebar";

interface OrbitWorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function OrbitWorkspaceLayout({
  children,
  params,
}: OrbitWorkspaceLayoutProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Await params for Next.js 15
  const { workspaceSlug } = await params;

  return (
    <QueryProvider>
      <WorkspaceProvider>
        <div className="min-h-screen bg-background">
          <OrbitSidebar
            userEmail={session.user.email}
            userName={session.user.name}
            workspaceSlug={workspaceSlug}
          />
          <main className="min-h-screen lg:pl-64">
            <div className="container mx-auto p-4 lg:p-8">{children}</div>
          </main>
        </div>
      </WorkspaceProvider>
    </QueryProvider>
  );
}
