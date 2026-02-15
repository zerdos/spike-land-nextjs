import type { WorkTag } from './ReactWorkTags.js';
import type { Flags } from './ReactFiberFlags.js';
import type { Lanes, Lane, LaneMap } from './ReactFiberLane.js';
import type { HostConfig } from '../host-config/HostConfigInterface.js';
import type { ReactContext } from '../react/ReactTypes.js';
export interface Fiber {
    tag: WorkTag;
    key: string | null;
    elementType: unknown;
    type: unknown;
    stateNode: unknown;
    return: Fiber | null;
    child: Fiber | null;
    sibling: Fiber | null;
    index: number;
    ref: unknown;
    refCleanup: (() => void) | null;
    pendingProps: unknown;
    memoizedProps: unknown;
    updateQueue: unknown;
    memoizedState: unknown;
    dependencies: Dependencies | null;
    flags: Flags;
    subtreeFlags: Flags;
    deletions: Array<Fiber> | null;
    lanes: Lanes;
    childLanes: Lanes;
    alternate: Fiber | null;
}
export interface ContextDependency<T = unknown> {
    context: ReactContext<T>;
    next: ContextDependency | null;
    memoizedValue: T;
}
export interface Dependencies {
    lanes: Lanes;
    firstContext: ContextDependency | null;
}
export interface FiberRoot {
    containerInfo: unknown;
    current: Fiber;
    finishedWork: Fiber | null;
    callbackNode: unknown;
    callbackPriority: Lane;
    pendingLanes: Lanes;
    suspendedLanes: Lanes;
    pingedLanes: Lanes;
    expiredLanes: Lanes;
    entangledLanes: Lanes;
    entanglements: LaneMap<Lanes>;
    hostConfig: HostConfig;
    pendingPassiveEffects: PendingPassiveEffects;
    identifierPrefix: string;
    identifierCount: number;
}
export interface PendingPassiveEffects {
    unmount: Array<Fiber>;
    mount: Array<Fiber>;
    update: Array<Fiber>;
}
export interface Hook {
    memoizedState: unknown;
    baseState: unknown;
    baseQueue: Update<unknown, unknown> | null;
    queue: UpdateQueue<unknown, unknown> | null;
    next: Hook | null;
}
export interface Update<S = unknown, A = unknown> {
    lane: Lane;
    action: A;
    hasEagerState: boolean;
    eagerState: S | null;
    next: Update<S, A> | null;
}
export interface UpdateQueue<S = unknown, A = unknown> {
    pending: Update<S, A> | null;
    lanes: Lanes;
    dispatch: ((action: A) => void) | null;
    lastRenderedReducer: ((state: S, action: A) => S) | null;
    lastRenderedState: S | null;
}
export interface ClassUpdateQueue<S = unknown> {
    baseState: S;
    firstBaseUpdate: ClassUpdate<S> | null;
    lastBaseUpdate: ClassUpdate<S> | null;
    shared: {
        pending: ClassUpdate<S> | null;
    };
    callbacks: Array<() => void> | null;
}
export interface ClassUpdate<S = unknown> {
    lane: Lane;
    tag: 0 | 1 | 2 | 3;
    payload: unknown;
    callback: (() => void) | null;
    next: ClassUpdate<S> | null;
}
export interface Effect {
    tag: number;
    create: () => (() => void) | void;
    destroy: (() => void) | void | null;
    deps: Array<unknown> | null;
    next: Effect | null;
}
export interface FunctionComponentUpdateQueue {
    lastEffect: Effect | null;
    events: Array<unknown> | null;
    stores: Array<StoreConsistencyCheck<unknown>> | null;
}
export interface StoreConsistencyCheck<T> {
    value: T;
    getSnapshot: () => T;
}
//# sourceMappingURL=ReactFiberTypes.d.ts.map