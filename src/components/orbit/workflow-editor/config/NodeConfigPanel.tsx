import type { WorkflowNode } from "../types";
import { ActionConfigForm } from "./ActionConfigForm";
import { TriggerConfigForm } from "./TriggerConfigForm";

interface NodeConfigPanelProps {
  selectedNode: WorkflowNode | null;
}

export const NodeConfigPanel = ({ selectedNode }: NodeConfigPanelProps) => {
  if (!selectedNode) {
    return (
      <aside className="w-80 border-l bg-background p-4 hidden lg:block">
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          Select a node to configure
        </div>
      </aside>
    );
  }

  // Determine which form to show based on node type
  // ReactFlow type: trigger, action, condition, group
  const nodeType = selectedNode.type;

  return (
    <aside className="w-80 border-l bg-background p-4 overflow-y-auto h-full shadow-lg z-10">
      {nodeType === "trigger" && <TriggerConfigForm node={selectedNode} />}

      {(nodeType === "action" || nodeType === "group") && (
        <ActionConfigForm node={selectedNode} />
      )}

      {nodeType === "condition" && <ActionConfigForm node={selectedNode} />}
    </aside>
  );
};
