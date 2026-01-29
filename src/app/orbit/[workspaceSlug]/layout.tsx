import { auth } from "@/auth";
import { WorkspaceProvider } from "@/components/orbit/WorkspaceContext";
import { SidebarWrapper } from "@/components/orbit/SidebarWrapper";
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
        <SidebarWrapper
          sidebar={
            <OrbitSidebar
              userEmail={session.user.email}
              userName={session.user.name}
              workspaceSlug={workspaceSlug}
            />
          }
        >
          {children}
        </SidebarWrapper>
      </WorkspaceProvider>
    </QueryProvider>
  );
}
