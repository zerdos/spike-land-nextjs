import type { WorkTag } from './ReactWorkTags.js';
import type { Flags } from './ReactFiberFlags.js';
import type { Lanes, Lane, LaneMap } from './ReactFiberLane.js';
import type { HostConfig } from '../host-config/HostConfigInterface.js';
import type { ReactContext } from '../react/ReactTypes.js';
export interface Fiber {
    tag: WorkTag;
    key: string | null;
    elementType: any;
    type: any;
    stateNode: any;
    return: Fiber | null;
    child: Fiber | null;
    sibling: Fiber | null;
    index: number;
    ref: any;
    refCleanup: (() => void) | null;
    pendingProps: any;
    memoizedProps: any;
    updateQueue: any;
    memoizedState: any;
    dependencies: Dependencies | null;
    flags: Flags;
    subtreeFlags: Flags;
    deletions: Array<Fiber> | null;
    lanes: Lanes;
    childLanes: Lanes;
    alternate: Fiber | null;
}
export interface ContextDependency<T = any> {
    context: ReactContext<T>;
    next: ContextDependency | null;
    memoizedValue: T;
}
export interface Dependencies {
    lanes: Lanes;
    firstContext: ContextDependency | null;
}
export interface FiberRoot {
    containerInfo: any;
    current: Fiber;
    finishedWork: Fiber | null;
    callbackNode: any;
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
    memoizedState: any;
    baseState: any;
    baseQueue: Update<any, any> | null;
    queue: UpdateQueue<any, any> | null;
    next: Hook | null;
}
export interface Update<S = any, A = any> {
    lane: Lane;
    action: A;
    hasEagerState: boolean;
    eagerState: S | null;
    next: Update<S, A> | null;
}
export interface UpdateQueue<S = any, A = any> {
    pending: Update<S, A> | null;
    lanes: Lanes;
    dispatch: ((action: A) => void) | null;
    lastRenderedReducer: ((state: S, action: A) => S) | null;
    lastRenderedState: S | null;
}
export interface ClassUpdateQueue<S = any> {
    baseState: S;
    firstBaseUpdate: ClassUpdate<S> | null;
    lastBaseUpdate: ClassUpdate<S> | null;
    shared: {
        pending: ClassUpdate<S> | null;
    };
    callbacks: Array<() => void> | null;
}
export interface ClassUpdate<S = any> {
    lane: Lane;
    tag: 0 | 1 | 2 | 3;
    payload: any;
    callback: (() => void) | null;
    next: ClassUpdate<S> | null;
}
export interface Effect {
    tag: number;
    create: () => (() => void) | void;
    destroy: (() => void) | void | null;
    deps: Array<any> | null;
    next: Effect | null;
}
export interface FunctionComponentUpdateQueue {
    lastEffect: Effect | null;
    events: Array<any> | null;
    stores: Array<StoreConsistencyCheck<any>> | null;
}
export interface StoreConsistencyCheck<T> {
    value: T;
    getSnapshot: () => T;
}
//# sourceMappingURL=ReactFiberTypes.d.ts.map