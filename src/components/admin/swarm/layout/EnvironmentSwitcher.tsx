"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSwarmStore } from "@/lib/admin/swarm/store";
import type { EnvironmentName } from "@/lib/admin/swarm/types";

const ENV_OPTIONS: Array<{ value: EnvironmentName | "all"; label: string }> = [
  { value: "all", label: "All Environments" },
  { value: "dev", label: "Development" },
  { value: "preview", label: "Preview" },
  { value: "prod", label: "Production" },
];

export function EnvironmentSwitcher() {
  const { activeEnvironment, setActiveEnvironment } = useSwarmStore();

  return (
    <Select
      value={activeEnvironment}
      onValueChange={(v) => setActiveEnvironment(v as EnvironmentName | "all")}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Environment" />
      </SelectTrigger>
      <SelectContent>
        {ENV_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
