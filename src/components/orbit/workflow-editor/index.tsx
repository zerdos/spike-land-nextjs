"use client";

import { useMemo } from "react";
import { ReactFlowProvider } from "reactflow";
import NodePalette from "./NodePalette";
import WorkflowCanvas from "./WorkflowCanvas";
import NodeConfigPanel from "./config/NodeConfigPanel";
import { useWorkflowEditor } from "./hooks/useWorkflowEditor";
import type { WorkflowNode } from "./types";

const WorkflowEditorContent = () => {
  const editor = useWorkflowEditor();

  const selectedNode = useMemo(() => {
    return editor.nodes.find((node) => node.selected) as WorkflowNode | null;
  }, [editor.nodes]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      <NodePalette />
      <WorkflowCanvas editor={editor} />
      <NodeConfigPanel
        selectedNode={selectedNode || null}
        onNodeChange={editor.updateNodeData}
      />
    </div>
  );
};

const WorkflowEditor = () => {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent />
    </ReactFlowProvider>
  );
};

export default WorkflowEditor;
