"use client";

import { useCallback, useRef, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  Node,
  NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";

import NodePalette from "./NodePalette";
import TriggerNode from "./nodes/TriggerNode";
import ActionNode from "./nodes/ActionNode";
import ConditionNode from "./nodes/ConditionNode";
import GroupNode from "./nodes/GroupNode";
import NodeConfigPanel from "./config/NodeConfigPanel";
import { WorkflowNodeData } from "./types";
import { useWorkflowEditor } from "./hooks/useWorkflowEditor";

// Define custom node types
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  group: GroupNode,
};

const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: "1",
    type: "trigger",
    position: { x: 250, y: 50 },
    data: { label: "Schedule Trigger", type: "trigger", config: { type: "schedule", cron: "0 9 * * *" } },
  },
];

const WorkflowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    nodes,
    edges,
    selectedNodeId,
    setSelectedNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDragOver,
    onDrop,
    updateNodeData,
  } = useWorkflowEditor(initialNodes);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
        // cast ref to required type or pass ref directly if hook handles types.
        // hook expects React.RefObject<HTMLDivElement>
        onDrop(event, reactFlowWrapper);
    },
    [onDrop]
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  return (
    <div className="flex h-screen w-full">
      <NodePalette />
      <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onInit={instance => instance.fitView()}
          onDrop={handleDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onChange={updateNodeData}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
};

const WorkflowEditor = () => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
};

export default WorkflowEditor;
