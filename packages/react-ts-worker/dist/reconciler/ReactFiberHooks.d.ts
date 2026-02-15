import type { Fiber, FiberRoot } from './ReactFiberTypes.js';
import type { Lanes, Lane } from './ReactFiberLane.js';
export declare const HookHasEffect = 1;
export declare const HookInsertion = 2;
export declare const HookLayout = 4;
export declare const HookPassive = 8;
export declare function setHooksExternals(externals: {
    scheduleUpdateOnFiber: (root: FiberRoot, fiber: Fiber, lane: Lane) => void;
    requestUpdateLane: () => Lane;
    markWorkInProgressReceivedUpdate: () => void;
}): void;
export declare function setWorkInProgressRoot(root: FiberRoot | null, lanes: Lanes): void;
export declare function renderWithHooks<Props>(current: Fiber | null, workInProgress: Fiber, Component: (props: Props, secondArg?: unknown) => unknown, props: Props, secondArg: unknown, nextRenderLanes: Lanes): unknown;
export declare function bailoutHooks(current: Fiber, workInProgress: Fiber, lanes: Lanes): void;
export declare function resetHooksAfterThrow(): void;
//# sourceMappingURL=ReactFiberHooks.d.ts.map