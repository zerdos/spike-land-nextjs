import React from "react";
import { Play, Zap, GitFork, BoxSelect } from "lucide-react";
import type { WorkflowNodeType } from "./types";

const NodePaletteItem = ({
  type,
  label,
  icon: Icon,
}: {
  type: WorkflowNodeType;
  label: string;
  icon: React.ElementType;
}) => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="flex items-center gap-2 p-3 mb-2 bg-white border rounded-md cursor-grab hover:bg-gray-50 hover:border-blue-300 transition-colors shadow-sm"
      onDragStart={(event) => onDragStart(event, type)}
      draggable
    >
      <Icon className="w-4 h-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
};

const NodePalette = () => {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Components</h2>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Triggers
        </h3>
        <NodePaletteItem type="trigger" label="Trigger" icon={Play} />
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Actions
        </h3>
        <NodePaletteItem type="action" label="Action" icon={Zap} />
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Logic
        </h3>
        <NodePaletteItem type="condition" label="Condition" icon={GitFork} />
        <NodePaletteItem type="group" label="Group" icon={BoxSelect} />
      </div>
    </div>
  );
};

export default NodePalette;
