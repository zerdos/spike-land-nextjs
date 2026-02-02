import { useCallback, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowEditor } from "./hooks/useWorkflowEditor";
import { ActionNode } from "./nodes/ActionNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { GroupNode } from "./nodes/GroupNode";
import { TriggerNode } from "./nodes/TriggerNode";
import type { WorkflowNode } from "./types";

const nodeTypes = {
  action: ActionNode,
  trigger: TriggerNode,
  condition: ConditionNode,
  group: GroupNode,
};

interface WorkflowCanvasProps {
  editor: ReturnType<typeof useWorkflowEditor>;
}

// Simple fallback UUID generator
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      // Cast to satisfy TypeScript that crypto is defined here
      const safeCrypto = crypto as any;
      return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (
          Number(c) ^
          (safeCrypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
        ).toString(16),
      );
  }

  // Fallback for no crypto (e.g. non-secure context or old envs)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const WorkflowCanvasContent = ({ editor }: WorkflowCanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(
    null,
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const type = event.dataTransfer.getData("application/reactflow/type");
      const actionType = event.dataTransfer.getData("application/reactflow/actionType");

      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
        y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
      });

      const newNode: WorkflowNode = {
        id: generateUUID(),
        type,
        position,
        data: {
          label: actionType || type,
          type: "ACTION", // Default, updated below
          config: { actionType, triggerType: actionType },
        },
      };

      if (type === "trigger") newNode.data.type = "TRIGGER";
      if (type === "condition") newNode.data.type = "CONDITION";
      if (type === "action") newNode.data.type = "ACTION";
      if (type === "group") newNode.data.type = "ACTION"; // Groups as actions for now

      editor.addNode(newNode);
    },
    [reactFlowInstance, editor],
  );

  return (
    <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={editor.nodes}
        edges={editor.edges}
        onNodesChange={editor.onNodesChange}
        onEdgesChange={editor.onEdgesChange}
        onConnect={editor.onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export const WorkflowCanvas = WorkflowCanvasContent;
