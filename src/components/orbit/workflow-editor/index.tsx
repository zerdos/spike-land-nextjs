"use client";

import { ReactFlowProvider } from "reactflow";
import { CanvasToolbar } from "./CanvasToolbar";
import NodePalette from "./NodePalette";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { NodeConfigPanel } from "./config/NodeConfigPanel";
import { useWorkflowEditor } from "./hooks/useWorkflowEditor";

const WorkflowEditor = () => {
  const editor = useWorkflowEditor();

  // Find the currently selected node
  const selectedNode = editor.nodes.find((n) => n.selected) || null;

  return (
    <ReactFlowProvider>
      <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-between border-b px-4 py-2">
           <div className="flex items-center gap-2">
             <h2 className="text-sm font-semibold">Workflow Editor</h2>
           </div>
           <CanvasToolbar />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <NodePalette />
          <div className="relative flex-1">
            <WorkflowCanvas editor={editor} />
          </div>
          <NodeConfigPanel selectedNode={selectedNode} />
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default WorkflowEditor;
