import type { Fiber } from './ReactFiberTypes.js';
import type { Lanes } from './ReactFiberLane.js';
export interface SuspenseState {
    dehydrated: any;
    retryLane: Lanes;
}
export declare function findNearestSuspenseBoundary(fiber: Fiber): Fiber | null;
export declare function isSuspenseBoundaryShowingFallback(fiber: Fiber): boolean;
export declare function getSuspensePrimaryChild(fiber: Fiber): Fiber | null;
export declare function getSuspenseFallbackChild(fiber: Fiber): Fiber | null;
export declare function mountSuspenseState(): SuspenseState;
export interface SuspenseException {
    then(onFulfill: () => void, onReject: () => void): void;
}
export declare function isThenable(value: any): value is SuspenseException;
//# sourceMappingURL=ReactFiberSuspense.d.ts.map