import React from "react";
import { WorkflowNode } from "../types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import TriggerConfigForm from "./TriggerConfigForm";
import ActionConfigForm from "./ActionConfigForm";
import ConditionConfigForm from "./ConditionConfigForm";

interface NodeConfigPanelProps {
  selectedNode: WorkflowNode | null;
  onNodeChange: (id: string, data: any) => void;
}

const NodeConfigPanel = ({ selectedNode, onNodeChange }: NodeConfigPanelProps) => {
  if (!selectedNode) {
    return (
      <div className="w-80 border-l bg-gray-50 p-4 flex items-center justify-center text-muted-foreground text-sm">
        Select a node to configure
      </div>
    );
  }

  const handleDataChange = (newData: any) => {
    onNodeChange(selectedNode.id, newData);
  };

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full overflow-y-auto">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-lg">Configuration</CardTitle>
        <div className="text-xs text-muted-foreground font-mono mt-1">
          ID: {selectedNode.id}
        </div>
      </CardHeader>
      <div className="p-4">
        {selectedNode.type === "trigger" && (
          <TriggerConfigForm node={selectedNode} onChange={handleDataChange} />
        )}
        {selectedNode.type === "action" && (
          <ActionConfigForm node={selectedNode} onChange={handleDataChange} />
        )}
        {selectedNode.type === "condition" && (
          <ConditionConfigForm node={selectedNode} onChange={handleDataChange} />
        )}
        {selectedNode.type === "group" && (
             <div className="text-sm text-muted-foreground">Group configuration not implemented yet.</div>
        )}
      </div>
    </div>
  );
};

export default NodeConfigPanel;
