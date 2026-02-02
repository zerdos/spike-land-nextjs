import { Card } from "@/components/ui/card";
import { GitFork } from "lucide-react";
import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../types";

const ConditionNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 !bg-muted-foreground"
      />
      <Card
        className={`w-[150px] rotate-45 border-2 ${
          selected ? "border-primary" : "border-border"
        } flex items-center justify-center p-4`}
      >
        <div className="-rotate-45 text-center">
          <GitFork className="mx-auto mb-1 h-5 w-5 text-purple-500" />
          <p className="text-xs font-medium">{data.label || "Condition"}</p>
        </div>
      </Card>

      {/* True Output */}
      <div className="absolute -bottom-2 -left-2 text-xs font-bold text-green-600">Yes</div>
      <Handle
        type="source"
        position={Position.Left}
        id="true"
        className="h-3 w-3 !bg-green-500"
      />

      {/* False Output */}
      <div className="absolute -bottom-2 -right-2 text-xs font-bold text-red-600">No</div>
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="h-3 w-3 !bg-red-500"
      />
    </div>
  );
};

export default memo(ConditionNode);
