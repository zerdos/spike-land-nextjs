import type { ReactContext } from '../react/ReactTypes.js';
import type { Fiber } from './ReactFiberTypes.js';
import type { Lanes } from './ReactFiberLane.js';
export declare function resetContextDependencies(): void;
export declare function pushProvider<T>(providerFiber: Fiber, context: ReactContext<T>, nextValue: T): void;
export declare function popProvider(context: ReactContext<any>, _providerFiber?: Fiber): void;
export declare function readContext<T>(context: ReactContext<T>): T;
export declare function prepareToReadContext(workInProgress: Fiber, renderLanes: Lanes): void;
export declare function propagateContextChange(workInProgress: Fiber, context: ReactContext<any>, renderLanes: Lanes): void;
//# sourceMappingURL=ReactFiberNewContext.d.ts.map