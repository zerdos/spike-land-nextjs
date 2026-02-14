"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { RefreshButton } from "../shared/RefreshButton";

interface WidgetShellProps {
  title: string;
  children: ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
  span?: 1 | 2 | 3;
}

export function WidgetShell({
  title,
  children,
  onRefresh,
  loading,
  className,
  span,
}: WidgetShellProps) {
  return (
    <Card
      variant="solid"
      className={cn(
        span === 2 && "md:col-span-2",
        span === 3 && "lg:col-span-3",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {onRefresh && <RefreshButton onRefresh={onRefresh} loading={loading} />}
      </CardHeader>
      <CardContent className="p-4 pt-0">{children}</CardContent>
    </Card>
  );
}
