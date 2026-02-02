import { GitFork } from "lucide-react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { WorkflowNodeData } from "../types";

export const ConditionNode = ({ data, selected }: NodeProps<WorkflowNodeData>) => {
  return (
    <div className="relative flex flex-col items-center justify-center w-[200px] h-[100px]">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-3 !h-3"
      />

      {/* Diamond Shape */}
      <div
        className={`w-16 h-16 transform rotate-45 flex items-center justify-center border-2 bg-card transition-colors ${
          selected ? "border-amber-500 shadow-md" : "border-amber-500/50"
        }`}
      >
        <div className="-rotate-45 text-amber-500">
          <GitFork className="h-6 w-6" />
        </div>
      </div>

      {/* Label underneath */}
      <div className="absolute bottom-0 text-center w-full">
         <span className="text-xs font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded border">
           {data.label || "Condition"}
         </span>
      </div>

      {/* True Handle (Right) */}
      <Handle
        id="true"
        type="source"
        position={Position.Right}
        className="!bg-green-500 !w-3 !h-3"
        style={{ right: '82px', top: '50%' }} // Adjust based on w-16 (64px) + padding
      />
      {/* Since the diamond is 64px wide, centered in 200px container.
          Center is 100px. Diamond extends from 68px to 132px.
          Right handle should be at 132px approx.
          Actually, let's just position handles absolute on the diamond div? No, handle must be direct child of Node usually or use specific positioning.
          ReactFlow handles are positioned relative to the node container (the div above).
      */}

      {/* Let's try explicit positioning based on the container */}
       <div className="absolute right-[4rem] top-1/2 -translate-y-1/2 text-[10px] text-green-500 font-bold translate-x-full pl-1 pointer-events-none">
        YES
      </div>
       <Handle
        id="true"
        type="source"
        position={Position.Right}
        className="!bg-green-500 !w-3 !h-3"
        style={{ right: 'calc(50% - 40px)' }} // 64px width / 2 = 32px. + offset
      />

      {/* False Handle (Left) */}
       <div className="absolute left-[4rem] top-1/2 -translate-y-1/2 text-[10px] text-red-500 font-bold -translate-x-full pr-1 pointer-events-none">
        NO
      </div>
      <Handle
        id="false"
        type="source"
        position={Position.Left}
        className="!bg-red-500 !w-3 !h-3"
        style={{ left: 'calc(50% - 40px)' }}
      />
    </div>
  );
};
