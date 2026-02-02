import { useCallback } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import type {
  Connection,
  Edge,
  Node,
} from "reactflow";

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const useWorkflowEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback(
    (node: Node) => {
      setNodes((nds) => nds.concat(node));
    },
    [setNodes]
  );

  const updateNodeData = useCallback(
    (id: string, data: unknown) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, ...(data as object) } };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeData,
    setNodes,
    setEdges,
  };
};
