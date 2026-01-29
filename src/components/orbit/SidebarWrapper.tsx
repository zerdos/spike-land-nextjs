import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import type { ReactNode } from "react"

interface SidebarWrapperProps {
  sidebar: ReactNode
  children: ReactNode
}

export function SidebarWrapper({ sidebar, children }: SidebarWrapperProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        {sidebar}
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4 lg:hidden">
            <SidebarTrigger className="-ml-1" />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 lg:p-8">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
