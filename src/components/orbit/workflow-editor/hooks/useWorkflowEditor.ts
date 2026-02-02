import { useCallback } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Edge,
  type OnConnect,
} from "reactflow";
import type { WorkflowNode } from "../types";

export function useWorkflowEditor(
  initialNodes: WorkflowNode[] = [],
  initialEdges: Edge[] = [],
) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const addNode = useCallback(
    (node: WorkflowNode) => {
      setNodes((nds) => [...nds, node]);
    },
    [setNodes],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    addNode,
  };
}
