import type { TransferrableEventData } from '../events.js';
import type { WorkerNodeImpl } from './worker-document.js';
type EventHandler = (event: WorkerSyntheticEvent) => void;
export interface WorkerSyntheticEvent {
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    target: WorkerNodeImpl | null;
    currentTarget: WorkerNodeImpl | null;
    timeStamp: number;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    button: number;
    buttons: number;
    key: string;
    code: string;
    keyCode: number;
    charCode: number;
    which: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    targetValue?: string;
    defaultPrevented: boolean;
    propagationStopped: boolean;
    preventDefault(): void;
    stopPropagation(): void;
}
export declare class WorkerEventRegistry {
    private handlers;
    setHandler(nodeId: number, reactPropName: string, handler: EventHandler): void;
    removeHandler(nodeId: number, reactPropName: string): void;
    dispatch(data: TransferrableEventData & {
        targetValue?: string;
    }, nodeMap: Map<number, WorkerNodeImpl>): void;
}
/** Sets up the worker's onmessage to dispatch incoming events. */
export declare function setupWorkerEventReceiver(registry: WorkerEventRegistry, nodeMap: Map<number, WorkerNodeImpl>): void;
export {};
//# sourceMappingURL=worker-events.d.ts.map