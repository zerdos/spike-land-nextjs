import type { NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../types";

export const GroupNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => {
  return (
    <div
      className={`min-w-[300px] min-h-[300px] rounded-lg border-2 border-dashed bg-muted/20 p-4 transition-colors ${
        selected ? "border-primary" : "border-muted-foreground/20"
      }`}
    >
      <div className="mb-2">
        <span className="bg-background px-2 py-1 text-xs font-medium text-muted-foreground rounded border shadow-sm">
          {data.label || "Group"}
        </span>
      </div>
    </div>
  );
};
