import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWorkflowEditor } from "./useWorkflowEditor";

describe("useWorkflowEditor", () => {
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useWorkflowEditor());

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
  });

  it("should add a node", () => {
    const { result } = renderHook(() => useWorkflowEditor());

    const newNode = {
      id: "1",
      position: { x: 0, y: 0 },
      data: {
        label: "Test Node",
        type: "ACTION" as const,
        config: {},
      },
    };

    act(() => {
      result.current.addNode(newNode);
    });

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0]).toEqual(newNode);
  });
});
