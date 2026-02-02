import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkflowNode, WorkflowNodeData } from "../types";
import TriggerConfigForm from "./TriggerConfigForm";
import ActionConfigForm from "./ActionConfigForm";

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  onChange: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onClose: () => void;
}

const NodeConfigPanel = ({ node, onChange, onClose }: NodeConfigPanelProps) => {
  if (!node) return null;

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(node.id, { label: e.target.value });
  };

  const handleDataChange = (newData: Partial<WorkflowNodeData>) => {
    onChange(node.id, newData);
  };

  return (
    <div className="flex h-full w-80 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Configuration</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Node Label</Label>
            <Input
              value={node.data.label}
              onChange={handleLabelChange}
              placeholder="Name this step"
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Settings
            </h4>

            {node.type === "trigger" && (
              <TriggerConfigForm data={node.data} onChange={handleDataChange} />
            )}

            {node.type === "action" && (
              <ActionConfigForm data={node.data} onChange={handleDataChange} />
            )}

            {node.type === "condition" && (
              <div className="text-sm text-muted-foreground">
                Condition logic configuration here.
              </div>
            )}

            {node.type === "group" && (
              <div className="text-sm text-muted-foreground">
                Group configuration here.
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default NodeConfigPanel;
