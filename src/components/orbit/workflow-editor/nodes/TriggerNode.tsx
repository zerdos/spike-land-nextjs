import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Play } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { WorkflowNodeData } from "../types";

const TriggerNode = ({ data }: { data: WorkflowNodeData }) => {
  return (
    <Card className="min-w-[200px] border-l-4 border-l-blue-500 shadow-sm">
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-1 rounded-md">
            <Play className="h-4 w-4 text-blue-600" />
          </div>
          <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2 text-xs text-muted-foreground">
        {data.description || "Starts the workflow"}
      </CardContent>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
    </Card>
  );
};

export default memo(TriggerNode);
