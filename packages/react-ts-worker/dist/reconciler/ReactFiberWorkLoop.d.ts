import type { Fiber, FiberRoot } from './ReactFiberTypes.js';
import type { Lane } from './ReactFiberLane.js';
export declare function scheduleUpdateOnFiber(root: FiberRoot, fiber: Fiber, lane: Lane): void;
export declare function performSyncWorkOnRoot(root: FiberRoot): void;
export declare function flushPassiveEffects(): void;
export declare function flushSync(fn?: () => void): void;
//# sourceMappingURL=ReactFiberWorkLoop.d.ts.map