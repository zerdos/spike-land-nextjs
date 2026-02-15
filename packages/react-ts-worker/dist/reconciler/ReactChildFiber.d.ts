import type { Fiber } from './ReactFiberTypes.js';
import type { Lanes } from './ReactFiberLane.js';
export declare const reconcileChildFibers: (returnFiber: Fiber, currentFirstChild: Fiber | null, newChild: unknown, lanes: Lanes) => Fiber | null;
export declare const mountChildFibers: (returnFiber: Fiber, currentFirstChild: Fiber | null, newChild: unknown, lanes: Lanes) => Fiber | null;
export declare function cloneChildFibers(current: Fiber | null, workInProgress: Fiber): void;
//# sourceMappingURL=ReactChildFiber.d.ts.map