import type { WorkflowActionType } from "@/lib/workflows/actions/action-types";
import { type DragEvent, type RefObject, useCallback, useState } from "react";
import { addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow } from "reactflow";
import type { Edge, Node, OnConnect, OnEdgesChange, OnNodesChange } from "reactflow";
import type { WorkflowNodeData, WorkflowNodeType } from "../types";

export const useWorkflowEditor = (initialNodes: Node<WorkflowNodeData>[] = []) => {
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { project } = useReactFlow();

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent, reactFlowWrapper: RefObject<HTMLDivElement | null>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow/type") as WorkflowNodeType;
      const actionType = event.dataTransfer.getData(
        "application/reactflow/actionType",
      ) as WorkflowActionType;

      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowWrapper.current
        ? project({
          x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
          y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
        })
        : { x: event.clientX, y: event.clientY };

      const newNode: Node<WorkflowNodeData> = {
        id: crypto.randomUUID(),
        type,
        position,
        data: {
          label: actionType ? actionType.replace(/_/g, " ") : `${type} node`,
          type,
          actionType,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id);
    },
    [project],
  );

  const updateNodeData = useCallback((nodeId: string, newData: Partial<WorkflowNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          };
        }
        return node;
      })
    );
  }, []);

  return {
    nodes,
    edges,
    selectedNodeId,
    setNodes,
    setEdges,
    setSelectedNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDragOver,
    onDrop,
    updateNodeData,
  };
};
