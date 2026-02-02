import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowNodeData } from "../types";

const ActionNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => {
  return (
    <Card
      className={`min-w-[200px] border-2 ${
        selected ? "border-primary" : "border-border"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 !bg-muted-foreground"
      />
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-orange-100 p-1 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
            <Activity className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-medium">
            {data.label || "Action"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs text-muted-foreground">
        {data.config?.description || "Performs a task"}
      </CardContent>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 !bg-muted-foreground"
      />
    </Card>
  );
};

export default memo(ActionNode);
