import { memo } from "react";
import { Handle, Position } from "reactflow";
import { GitFork } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { WorkflowNodeData } from "../types";

const ConditionNode = ({ data }: { data: WorkflowNodeData }) => {
  return (
    <Card className="min-w-[200px] border-l-4 border-l-orange-500 shadow-sm relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          <div className="bg-orange-100 p-1 rounded-md">
            <GitFork className="h-4 w-4 text-orange-600" />
          </div>
          <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2 text-xs text-muted-foreground">
        {data.description || "Checks a condition"}
      </CardContent>

      {/* True Path */}
      <div className="absolute -bottom-6 left-1/4 transform -translate-x-1/2 text-[10px] font-bold text-green-600">
        TRUE
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 bg-green-500 border-2 border-white left-1/4"
      />

      {/* False Path */}
      <div className="absolute -bottom-6 right-1/4 transform translate-x-1/2 text-[10px] font-bold text-red-600">
        FALSE
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 bg-red-500 border-2 border-white right-1/4"
      />
    </Card>
  );
};

export default memo(ConditionNode);
