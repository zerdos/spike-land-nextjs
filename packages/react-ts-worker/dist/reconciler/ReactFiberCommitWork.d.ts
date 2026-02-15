import type { Fiber, FiberRoot } from './ReactFiberTypes.js';
export declare function commitBeforeMutationEffects(root: FiberRoot, finishedWork: Fiber): void;
export declare function commitMutationEffects(root: FiberRoot, finishedWork: Fiber): void;
export declare function commitLayoutEffects(root: FiberRoot, finishedWork: Fiber): void;
export declare function commitPassiveUnmountEffects(fiber: Fiber): void;
export declare function commitPassiveMountEffects(root: FiberRoot, fiber: Fiber): void;
//# sourceMappingURL=ReactFiberCommitWork.d.ts.map