import React, { memo } from "react";
import type { NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../types";

const GroupNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => {
  return (
    <div
      className={`min-h-[200px] min-w-[300px] rounded-lg border-2 border-dashed bg-muted/20 p-4 ${
        selected ? "border-primary" : "border-muted-foreground/30"
      }`}
    >
      <div className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {data.label || "Group"}
      </div>
    </div>
  );
};

export default memo(GroupNode);
