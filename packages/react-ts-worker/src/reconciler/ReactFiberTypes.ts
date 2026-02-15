import type { WorkTag } from './ReactWorkTags.js';
import type { Flags } from './ReactFiberFlags.js';
import type { Lanes, Lane, LaneMap } from './ReactFiberLane.js';
import type { HostConfig } from '../host-config/HostConfigInterface.js';
import type { ReactContext } from '../react/ReactTypes.js';

// A Fiber is work on a Component that needs to be done or was done.
export interface Fiber {
  tag: WorkTag;
  key: string | null;
  elementType: any;
  type: any;
  stateNode: any;

  // Fiber tree structure
  return: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  index: number;

  ref: any;
  refCleanup: (() => void) | null;

  // Props & state
  pendingProps: any;
  memoizedProps: any;
  updateQueue: any;
  memoizedState: any;

  // Context dependencies
  dependencies: Dependencies | null;

  // Effects
  flags: Flags;
  subtreeFlags: Flags;
  deletions: Array<Fiber> | null;

  // Lanes
  lanes: Lanes;
  childLanes: Lanes;

  // Double-buffering
  alternate: Fiber | null;
}

// Dependencies for context
export interface ContextDependency<T = any> {
  context: ReactContext<T>;
  next: ContextDependency | null;
  memoizedValue: T;
}

export interface Dependencies {
  lanes: Lanes;
  firstContext: ContextDependency | null;
}

// FiberRoot is the root of a React tree
export interface FiberRoot {
  containerInfo: any;
  current: Fiber;
  finishedWork: Fiber | null;

  // Scheduler
  callbackNode: any;
  callbackPriority: Lane;

  // Lanes
  pendingLanes: Lanes;
  suspendedLanes: Lanes;
  pingedLanes: Lanes;
  expiredLanes: Lanes;
  entangledLanes: Lanes;
  entanglements: LaneMap<Lanes>;

  // Host config reference
  hostConfig: HostConfig;

  // Passive effects
  pendingPassiveEffects: PendingPassiveEffects;

  // Id generation
  identifierPrefix: string;
  identifierCount: number;
}

export interface PendingPassiveEffects {
  unmount: Array<Fiber>;
  mount: Array<Fiber>;
  update: Array<Fiber>;
}

// Hook is a linked list node
export interface Hook {
  memoizedState: any;
  baseState: any;
  baseQueue: Update<any, any> | null;
  queue: UpdateQueue<any, any> | null;
  next: Hook | null;
}

// Update object for state updates
export interface Update<S = any, A = any> {
  lane: Lane;
  action: A;
  hasEagerState: boolean;
  eagerState: S | null;
  next: Update<S, A> | null;
}

// UpdateQueue for state updates (used by hooks and class components)
export interface UpdateQueue<S = any, A = any> {
  pending: Update<S, A> | null;
  lanes: Lanes;
  dispatch: ((action: A) => void) | null;
  lastRenderedReducer: ((state: S, action: A) => S) | null;
  lastRenderedState: S | null;
}

// Class component update queue
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
  tag: 0 | 1 | 2 | 3; // UpdateState, ReplaceState, ForceUpdate, CaptureUpdate
  payload: any;
  callback: (() => void) | null;
  next: ClassUpdate<S> | null;
}

// Effect (for useEffect, useLayoutEffect, etc.)
export interface Effect {
  tag: number;
  create: () => (() => void) | void;
  destroy: (() => void) | void | null;
  deps: Array<any> | null;
  next: Effect | null;
}

// Effect list stored on fiber's updateQueue for function components
export interface FunctionComponentUpdateQueue {
  lastEffect: Effect | null;
  events: Array<any> | null;
  stores: Array<StoreConsistencyCheck<any>> | null;
}

export interface StoreConsistencyCheck<T> {
  value: T;
  getSnapshot: () => T;
}
