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
        id: crypto.randomUUID(),
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
