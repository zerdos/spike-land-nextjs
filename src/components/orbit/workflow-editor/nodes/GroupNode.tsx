import { memo } from "react";
import type { WorkflowNodeData } from "../types";

const GroupNode = ({ data }: { data: WorkflowNodeData }) => {
  return (
    <div className="w-full h-full min-w-[300px] min-h-[200px] rounded-md bg-gray-50/50 border-2 border-dashed border-gray-300 relative group">
      <div className="absolute -top-6 left-0 text-sm font-semibold text-gray-500 uppercase tracking-wider">
        {data.label}
      </div>
    </div>
  );
};

export default memo(GroupNode);
