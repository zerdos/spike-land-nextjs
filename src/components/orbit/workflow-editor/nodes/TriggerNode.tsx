import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../types";

const TriggerNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => {
  return (
    <Card
      className={`min-w-[200px] border-2 ${selected ? "border-primary" : "border-border"}`}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-blue-100 p-1 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
            <Zap className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm font-medium">
            {data["label"] || "Trigger"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs text-muted-foreground">
        {String(data["config"]?.["description"] ?? "Starts the workflow")}
      </CardContent>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 !bg-muted-foreground"
      />
    </Card>
  );
};

export default memo(TriggerNode);
