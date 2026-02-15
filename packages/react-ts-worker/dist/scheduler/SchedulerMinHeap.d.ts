export interface HeapNode {
    id: number;
    sortIndex: number;
}
type Heap<T extends HeapNode> = T[];
export declare function push<T extends HeapNode>(heap: Heap<T>, node: T): void;
export declare function peek<T extends HeapNode>(heap: Heap<T>): T | null;
export declare function pop<T extends HeapNode>(heap: Heap<T>): T | null;
export {};
//# sourceMappingURL=SchedulerMinHeap.d.ts.map