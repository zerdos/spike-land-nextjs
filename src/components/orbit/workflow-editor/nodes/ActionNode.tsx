import { Card } from "@/components/ui/card";
import { ACTION_REGISTRY } from "@/lib/workflows/actions/metadata";
import * as Icons from "lucide-react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../types";

export const ActionNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => {
  // Find metadata based on type. type in data is WorkflowStepType which matches WorkflowActionType for actions.
  // Ideally, data.type should be specific action type, but Prisma StepType is just "ACTION".
  // So data.config.actionType holds the real action type.

  const actionType =
    (data.config?.["actionType"] as string) || data.type.toLowerCase();
  const metadata = ACTION_REGISTRY.find((m) => m.type === actionType);

  // Dynamic icon
  const IconComponent =
    metadata &&
    (Icons[metadata.icon as keyof typeof Icons] as React.ElementType);
  const FallbackIcon = Icons.Activity;
  const Icon = (IconComponent || FallbackIcon) as any;

  return (
    <Card
      className={`min-w-[240px] border transition-colors ${
        selected ? "border-primary shadow-md" : "border-border"
      } ${data.isValid === false ? "border-destructive" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-3 !h-3"
      />

      <div className="p-3 flex items-center gap-3">
        <div className="p-2 rounded-md bg-secondary text-secondary-foreground shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-sm font-medium truncate">
            {data.label || metadata?.label || "Action"}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {metadata?.description || actionType}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-muted-foreground !w-3 !h-3"
      />
    </Card>
  );
};
