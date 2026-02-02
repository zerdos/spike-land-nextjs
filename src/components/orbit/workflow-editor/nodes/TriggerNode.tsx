import { Card } from "@/components/ui/card";
import { TRIGGER_REGISTRY } from "@/lib/workflows/actions/metadata";
import * as Icons from "lucide-react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../types";

export const TriggerNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => {
  // Try to determine trigger type from config or fallback
  // Safely access triggerType from data.config if it exists
  const config = data.config as Record<string, unknown> | undefined;
  const triggerType = (config?.["triggerType"] as string) || "schedule";
  const metadata = TRIGGER_REGISTRY.find((m) => m.type === triggerType);

  const IconComponent =
    metadata &&
    (Icons[metadata.icon as keyof typeof Icons] as React.ElementType);
  const FallbackIcon = Icons.Zap;
  // Use 'any' cast here to satisfy TypeScript when assigning to a React component variable
  // This is safe because we know it's a valid component from Lucide or the fallback
  const Icon = (IconComponent || FallbackIcon) as any;

  return (
    <Card
      className={`min-w-[240px] border-2 transition-colors ${
        selected ? "border-primary shadow-md" : "border-primary/50"
      }`}
    >
      <div className="p-3 flex items-center gap-3 bg-primary/5 rounded-xl">
        <div className="p-2 rounded-md bg-primary text-primary-foreground shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-sm font-medium truncate">
            {data.label || metadata?.label || "Trigger"}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {metadata?.description || "Workflow Start"}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !w-3 !h-3"
      />
    </Card>
  );
};
