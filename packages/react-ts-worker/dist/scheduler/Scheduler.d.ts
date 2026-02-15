import type { PriorityLevel } from './SchedulerPriorities.js';
import { ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from './SchedulerPriorities.js';
import type { HeapNode } from './SchedulerMinHeap.js';
export type Callback = (didTimeout: boolean) => Callback | null | undefined | boolean | void;
export interface Task extends HeapNode {
    id: number;
    callback: Callback | null;
    priorityLevel: PriorityLevel;
    startTime: number;
    expirationTime: number;
    sortIndex: number;
}
declare let getCurrentTime: () => number;
export declare function scheduleCallback(priorityLevel: PriorityLevel, callback: Callback, options?: {
    delay: number;
}): Task;
export declare function cancelCallback(task: Task): void;
export declare function shouldYield(): boolean;
export declare function getCurrentPriorityLevel(): PriorityLevel;
export declare function forceFrameRate(fps: number): void;
export { getCurrentTime, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority };
//# sourceMappingURL=Scheduler.d.ts.map