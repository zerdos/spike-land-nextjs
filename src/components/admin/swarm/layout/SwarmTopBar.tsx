"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { Fragment, useMemo } from "react";
import { EnvironmentSwitcher } from "./EnvironmentSwitcher";

function segmentToLabel(segment: string): string {
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function SwarmTopBar() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const base = "/admin/swarm";
    const rest = pathname.replace(base, "").split("/").filter(Boolean);
    const items: Array<{ label: string; href: string }> = [
      { label: "Swarm", href: base },
    ];
    let current = base;
    for (const segment of rest) {
      current = `${current}/${segment}`;
      items.push({ label: segmentToLabel(segment), href: current });
    }
    return items;
  }, [pathname]);

  return (
    <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, i) => (
            <Fragment key={crumb.href}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {i === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <EnvironmentSwitcher />
    </div>
  );
}
