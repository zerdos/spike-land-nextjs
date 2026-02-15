import type { Fiber, FiberRoot, Hook, Update, UpdateQueue, Effect, FunctionComponentUpdateQueue } from './ReactFiberTypes.js';
import type { Lanes, Lane } from './ReactFiberLane.js';
import type { Dispatcher, ReactContext } from '../react/ReactTypes.js';
import type { Flags } from './ReactFiberFlags.js';
import {
  NoLanes,
  NoLane,
  SyncLane,
  mergeLanes,
  isSubsetOfLanes,
  removeLanes,
  includesBlockingLane,
  includesOnlyNonUrgentLanes,
} from './ReactFiberLane.js';
import {
  Passive as PassiveEffect,
  Update as UpdateEffect,
  LayoutStatic as LayoutStaticEffect,
  PassiveStatic as PassiveStaticEffect,
  StoreConsistency,
} from './ReactFiberFlags.js';
import ReactSharedInternals from '../react/ReactSharedInternals.js';
import { REACT_CONTEXT_TYPE } from '../react/ReactSymbols.js';
import { readContext } from './ReactFiberNewContext.js';
import objectIs from '../shared/objectIs.js';

// --- Hook Effect Tags ---
export const HookHasEffect = /*  */ 0b0001;
export const HookInsertion = /*  */ 0b0010;
export const HookLayout =    /*  */ 0b0100;
export const HookPassive =   /*  */ 0b1000;

// --- Effect Instance ---
interface EffectInstance {
  destroy: void | (() => void);
}

// --- Module-level state ---
let renderLanes: Lanes = NoLanes;
let currentlyRenderingFiber: Fiber = null as any;
let currentHook: Hook | null = null;
let workInProgressHook: Hook | null = null;
let didScheduleRenderPhaseUpdate: boolean = false;
let didScheduleRenderPhaseUpdateDuringThisPass: boolean = false;
let localIdCounter: number = 0;
let globalClientIdCounter: number = 0;

const RE_RENDER_LIMIT = 25;

// --- Exported functions for work loop interaction ---
// These will be set by the work loop to avoid circular dependencies
let scheduleUpdateOnFiberFn: ((root: FiberRoot, fiber: Fiber, lane: Lane) => void) | null = null;
let requestUpdateLaneFn: (() => Lane) | null = null;
let workInProgressRoot: FiberRoot | null = null;
let workInProgressRootRenderLanes: Lanes = NoLanes;
let markWorkInProgressReceivedUpdateFn: (() => void) | null = null;

export function setHooksExternals(externals: {
  scheduleUpdateOnFiber: (root: FiberRoot, fiber: Fiber, lane: Lane) => void;
  requestUpdateLane: () => Lane;
  markWorkInProgressReceivedUpdate: () => void;
}): void {
  scheduleUpdateOnFiberFn = externals.scheduleUpdateOnFiber;
  requestUpdateLaneFn = externals.requestUpdateLane;
  markWorkInProgressReceivedUpdateFn = externals.markWorkInProgressReceivedUpdate;
}

export function setWorkInProgressRoot(root: FiberRoot | null, lanes: Lanes): void {
  workInProgressRoot = root;
  workInProgressRootRenderLanes = lanes;
}

// --- Helper functions ---

function basicStateReducer<S>(state: S, action: S | ((s: S) => S)): S {
  return typeof action === 'function' ? (action as (s: S) => S)(state) : action;
}

function areHookInputsEqual(
  nextDeps: Array<any>,
  prevDeps: Array<any> | null,
): boolean {
  if (prevDeps === null) {
    return false;
  }
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (objectIs(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

function createEffectInstance(): EffectInstance {
  return { destroy: undefined };
}

function createFunctionComponentUpdateQueue(): FunctionComponentUpdateQueue {
  return {
    lastEffect: null,
    events: null,
    stores: null,
  };
}

// --- Hook infrastructure ---

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  };

  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}

function updateWorkInProgressHook(): Hook {
  let nextCurrentHook: Hook | null;
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    if (current !== null) {
      nextCurrentHook = current.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    nextCurrentHook = currentHook.next;
  }

  let nextWorkInProgressHook: Hook | null;
  if (workInProgressHook === null) {
    nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
  } else {
    nextWorkInProgressHook = workInProgressHook.next;
  }

  if (nextWorkInProgressHook !== null) {
    // Reuse existing work-in-progress hook
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;
    currentHook = nextCurrentHook;
  } else {
    // Clone from current hook
    if (nextCurrentHook === null) {
      throw new Error('Rendered more hooks than during the previous render.');
    }

    currentHook = nextCurrentHook;

    const newHook: Hook = {
      memoizedState: currentHook.memoizedState,
      baseState: currentHook.baseState,
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue,
      next: null,
    };

    if (workInProgressHook === null) {
      currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
    } else {
      workInProgressHook = workInProgressHook.next = newHook;
    }
  }
  return workInProgressHook;
}

// --- Effect push ---

function pushSimpleEffect(
  tag: number,
  inst: EffectInstance,
  create: () => (() => void) | void,
  deps: Array<any> | null,
): Effect {
  const effect: Effect = {
    tag,
    create,
    destroy: inst.destroy ?? null,
    deps,
    next: null,
  };
  return pushEffectImpl(effect);
}

function pushEffectImpl(effect: Effect): Effect {
  let componentUpdateQueue: FunctionComponentUpdateQueue | null =
    currentlyRenderingFiber.updateQueue as any;
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
  }
  const lastEffect = componentUpdateQueue.lastEffect;
  if (lastEffect === null) {
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const firstEffect = lastEffect.next;
    lastEffect.next = effect;
    effect.next = firstEffect;
    componentUpdateQueue.lastEffect = effect;
  }
  return effect;
}

// --- Update queue helpers ---

function isRenderPhaseUpdate(fiber: Fiber): boolean {
  const alternate = fiber.alternate;
  return (
    fiber === currentlyRenderingFiber ||
    (alternate !== null && alternate === currentlyRenderingFiber)
  );
}

function enqueueRenderPhaseUpdate<S, A>(
  queue: UpdateQueue<S, A>,
  update: Update<S, A>,
): void {
  didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
  const pending = queue.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;
}

function enqueueUpdate<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  update: Update<S, A>,
  lane: Lane,
): FiberRoot | null {
  // Concurrent update: append to the queue
  const pending = queue.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;

  // Mark the fiber and its return path with lanes
  return markUpdateLaneFromFiberToRoot(fiber, lane);
}

function markUpdateLaneFromFiberToRoot(
  fiber: Fiber,
  lane: Lane,
): FiberRoot | null {
  fiber.lanes = mergeLanes(fiber.lanes, lane);
  const alternate = fiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }

  // Walk to root
  let node = fiber.return;
  let root: FiberRoot | null = null;
  if (node === null && fiber.tag === 3 /* HostRoot */) {
    root = fiber.stateNode;
  } else {
    while (node !== null) {
      node.childLanes = mergeLanes(node.childLanes, lane);
      const nodeAlternate = node.alternate;
      if (nodeAlternate !== null) {
        nodeAlternate.childLanes = mergeLanes(nodeAlternate.childLanes, lane);
      }
      if (node.return === null && node.tag === 3 /* HostRoot */) {
        root = node.stateNode;
        break;
      }
      node = node.return;
    }
  }
  return root;
}

// --- State hooks ---

function mountStateImpl<S>(initialState: (() => S) | S): Hook {
  const hook = mountWorkInProgressHook();
  if (typeof initialState === 'function') {
    initialState = (initialState as () => S)();
  }
  hook.memoizedState = hook.baseState = initialState;
  const queue: UpdateQueue<S, any> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  return hook;
}

function mountState<S>(
  initialState: (() => S) | S,
): [S, (action: S | ((s: S) => S)) => void] {
  const hook = mountStateImpl(initialState);
  const queue = hook.queue!;
  const dispatch = (dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ) as any);
  queue.dispatch = dispatch;
  return [hook.memoizedState, dispatch];
}

function updateState<S>(
  _initialState: (() => S) | S,
): [S, (action: S | ((s: S) => S)) => void] {
  return updateReducer(basicStateReducer as any, _initialState as any);
}

function mountReducer<S, I, A>(
  reducer: (state: S, action: A) => S,
  initialArg: I,
  init?: (arg: I) => S,
): [S, (action: A) => void] {
  const hook = mountWorkInProgressHook();
  let initialState: S;
  if (init !== undefined) {
    initialState = init(initialArg);
  } else {
    initialState = initialArg as any as S;
  }
  hook.memoizedState = hook.baseState = initialState;
  const queue: UpdateQueue<S, A> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  const dispatch = (dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue as any,
  ) as any);
  queue.dispatch = dispatch;
  return [hook.memoizedState, dispatch];
}

function updateReducer<S, I, A>(
  reducer: (state: S, action: A) => S,
  _initialArg: I,
  _init?: (arg: I) => S,
): [S, (action: A) => void] {
  const hook = updateWorkInProgressHook();
  return updateReducerImpl(hook, currentHook as Hook, reducer);
}

function updateReducerImpl<S, A>(
  hook: Hook,
  current: Hook,
  reducer: (state: S, action: A) => S,
): [S, (action: A) => void] {
  const queue: UpdateQueue<S, A> = hook.queue!;
  queue.lastRenderedReducer = reducer;

  let baseQueue = hook.baseQueue;
  const pendingQueue = queue.pending;

  if (pendingQueue !== null) {
    // Merge pending queue and base queue
    if (baseQueue !== null) {
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }

  const baseState = hook.baseState;
  if (baseQueue === null) {
    hook.memoizedState = baseState;
  } else {
    const first = baseQueue.next;
    let newState: S = baseState;

    let newBaseState: S | null = null;
    let newBaseQueueFirst: Update<S, A> | null = null;
    let newBaseQueueLast: Update<S, A> | null = null;
    let update = first;

    do {
      const updateLane = update!.lane;

      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // Priority is insufficient. Skip this update.
        const clone: Update<S, A> = {
          lane: updateLane,
          action: update!.action,
          hasEagerState: update!.hasEagerState,
          eagerState: update!.eagerState,
          next: null,
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          (newBaseQueueLast as any).next = clone;
          newBaseQueueLast = clone;
        }
        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane,
        );
      } else {
        // This update has sufficient priority.
        if (newBaseQueueLast !== null) {
          const clone: Update<S, A> = {
            lane: NoLane,
            action: update!.action,
            hasEagerState: update!.hasEagerState,
            eagerState: update!.eagerState,
            next: null,
          };
          (newBaseQueueLast as any).next = clone;
          newBaseQueueLast = clone;
        }

        // Process the update
        const action = update!.action;
        if (update!.hasEagerState) {
          newState = update!.eagerState as S;
        } else {
          newState = reducer(newState, action);
        }
      }
      update = update!.next;
    } while (update !== null && update !== first);

    if (newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst!;
    }

    if (!objectIs(newState, hook.memoizedState)) {
      markWorkInProgressReceivedUpdateFn?.();
    }

    hook.memoizedState = newState;
    hook.baseState = newBaseState as S;
    hook.baseQueue = newBaseQueueLast;
    queue.lastRenderedState = newState;
  }

  const dispatch = queue.dispatch!;
  return [hook.memoizedState, dispatch];
}

// --- Ref hooks ---

function mountRef<T>(initialValue: T): { current: T } {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}

function updateRef<T>(_initialValue: T): { current: T } {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

// --- Effect hooks ---

function mountEffectImpl(
  fiberFlags: Flags,
  hookFlags: number,
  create: () => (() => void) | void,
  deps: Array<any> | void | null,
): void {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushSimpleEffect(
    HookHasEffect | hookFlags,
    createEffectInstance(),
    create,
    nextDeps,
  );
}

function updateEffectImpl(
  fiberFlags: Flags,
  hookFlags: number,
  create: () => (() => void) | void,
  deps: Array<any> | void | null,
): void {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const effect: Effect = hook.memoizedState;
  const inst = createEffectInstance();
  inst.destroy = effect.destroy as any;

  if (currentHook !== null) {
    if (nextDeps !== null) {
      const prevEffect: Effect = currentHook.memoizedState;
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, nextDeps);
        return;
      }
    }
  }

  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushSimpleEffect(
    HookHasEffect | hookFlags,
    inst,
    create,
    nextDeps,
  );
}

function mountEffect(
  create: () => (() => void) | void,
  deps?: Array<any> | null,
): void {
  mountEffectImpl(
    PassiveEffect | PassiveStaticEffect,
    HookPassive,
    create,
    deps,
  );
}

function updateEffect(
  create: () => (() => void) | void,
  deps?: Array<any> | null,
): void {
  updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function mountLayoutEffect(
  create: () => (() => void) | void,
  deps?: Array<any> | null,
): void {
  mountEffectImpl(
    UpdateEffect | LayoutStaticEffect,
    HookLayout,
    create,
    deps,
  );
}

function updateLayoutEffect(
  create: () => (() => void) | void,
  deps?: Array<any> | null,
): void {
  updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}

function mountInsertionEffect(
  create: () => (() => void) | void,
  deps?: Array<any> | null,
): void {
  mountEffectImpl(UpdateEffect, HookInsertion, create, deps);
}

function updateInsertionEffect(
  create: () => (() => void) | void,
  deps?: Array<any> | null,
): void {
  updateEffectImpl(UpdateEffect, HookInsertion, create, deps);
}

// --- Imperative Handle ---

function imperativeHandleEffect<T>(
  create: () => T,
  ref: { current: T | null } | ((inst: T | null) => void) | null | undefined,
): void | (() => void) {
  if (typeof ref === 'function') {
    const refCallback = ref;
    const inst = create();
    refCallback(inst);
    return () => {
      refCallback(null);
    };
  } else if (ref !== null && ref !== undefined) {
    const refObject = ref;
    const inst = create();
    refObject.current = inst;
    return () => {
      refObject.current = null;
    };
  }
}

function mountImperativeHandle<T>(
  ref: { current: T | null } | ((inst: T | null) => void) | null | undefined,
  create: () => T,
  deps?: Array<any> | null,
): void {
  const effectDeps =
    deps !== null && deps !== undefined ? deps.concat([ref]) : null;
  mountEffectImpl(
    UpdateEffect | LayoutStaticEffect,
    HookLayout,
    imperativeHandleEffect.bind(null, create, ref as any),
    effectDeps,
  );
}

function updateImperativeHandle<T>(
  ref: { current: T | null } | ((inst: T | null) => void) | null | undefined,
  create: () => T,
  deps?: Array<any> | null,
): void {
  const effectDeps =
    deps !== null && deps !== undefined ? deps.concat([ref]) : null;
  updateEffectImpl(
    UpdateEffect,
    HookLayout,
    imperativeHandleEffect.bind(null, create, ref as any),
    effectDeps,
  );
}

// --- Callback and Memo hooks ---

function mountCallback<T>(callback: T, deps: Array<any> | void | null): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function updateCallback<T>(callback: T, deps: Array<any> | void | null): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (nextDeps !== null) {
    const prevDeps: Array<any> | null = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function mountMemo<T>(nextCreate: () => T, deps: Array<any> | void | null): T {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function updateMemo<T>(nextCreate: () => T, deps: Array<any> | void | null): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (nextDeps !== null) {
    const prevDeps: Array<any> | null = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0];
    }
  }
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

// --- Context hook ---

function mountContext<T>(context: ReactContext<T>): T {
  return readContext(context);
}

function updateContext<T>(context: ReactContext<T>): T {
  return readContext(context);
}

// --- Deferred Value hook ---

function mountDeferredValue<T>(value: T, _initialValue?: T): T {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = value;
  return value;
}

function updateDeferredValue<T>(value: T, _initialValue?: T): T {
  const hook = updateWorkInProgressHook();
  const prevValue: T = (currentHook as Hook).memoizedState;
  if (objectIs(value, prevValue)) {
    return value;
  }
  // Check if this is a non-urgent update; if so, defer
  if (!includesOnlyNonUrgentLanes(renderLanes)) {
    // Urgent update - keep previous value
    hook.memoizedState = prevValue;
    return prevValue;
  }
  // Non-urgent update - use new value
  markWorkInProgressReceivedUpdateFn?.();
  hook.memoizedState = value;
  return value;
}

// --- Transition hook ---

function mountTransition(): [boolean, (callback: () => void) => void] {
  const stateHook = mountStateImpl(false as boolean);
  const start = startTransition.bind(
    null,
    currentlyRenderingFiber,
    stateHook.queue!,
    true,
    false,
  );
  const hook = mountWorkInProgressHook();
  hook.memoizedState = start;
  return [false, start];
}

function updateTransition(): [boolean, (callback: () => void) => void] {
  const [booleanOrThenable] = updateState(false);
  const hook = updateWorkInProgressHook();
  const start = hook.memoizedState;
  const isPending =
    typeof booleanOrThenable === 'boolean' ? booleanOrThenable : false;
  return [isPending, start];
}

function startTransition(
  fiber: Fiber,
  queue: UpdateQueue<any, any>,
  pendingState: any,
  finishedState: any,
  callback: () => void,
): void {
  const lane = requestUpdateLaneFn?.() ?? SyncLane;

  // Set pending state
  const pendingUpdate: Update<any, any> = {
    lane,
    action: pendingState,
    hasEagerState: false,
    eagerState: null,
    next: null,
  };

  if (isRenderPhaseUpdate(fiber)) {
    enqueueRenderPhaseUpdate(queue, pendingUpdate);
  } else {
    const root = enqueueUpdate(fiber, queue, pendingUpdate, lane);
    if (root !== null && scheduleUpdateOnFiberFn) {
      scheduleUpdateOnFiberFn(root, fiber, lane);
    }
  }

  try {
    callback();
  } finally {
    // Set finished state
    const finishedUpdate: Update<any, any> = {
      lane,
      action: finishedState,
      hasEagerState: false,
      eagerState: null,
      next: null,
    };

    if (isRenderPhaseUpdate(fiber)) {
      enqueueRenderPhaseUpdate(queue, finishedUpdate);
    } else {
      const root = enqueueUpdate(fiber, queue, finishedUpdate, lane);
      if (root !== null && scheduleUpdateOnFiberFn) {
        scheduleUpdateOnFiberFn(root, fiber, lane);
      }
    }
  }
}

// --- SyncExternalStore hook ---

function subscribeToStore<T>(
  fiber: Fiber,
  inst: { value: T; getSnapshot: () => T },
  subscribe: (onStoreChange: () => void) => () => void,
): () => void {
  const handleStoreChange = () => {
    // Check if the value changed
    if (checkIfSnapshotChanged(inst)) {
      // Force a re-render
      const lane = SyncLane;
      const root = markUpdateLaneFromFiberToRoot(fiber, lane);
      if (root !== null && scheduleUpdateOnFiberFn) {
        scheduleUpdateOnFiberFn(root, fiber, lane);
      }
    }
  };
  return subscribe(handleStoreChange);
}

function checkIfSnapshotChanged<T>(inst: { value: T; getSnapshot: () => T }): boolean {
  const latestGetSnapshot = inst.getSnapshot;
  const prevValue = inst.value;
  try {
    const nextValue = latestGetSnapshot();
    return !objectIs(prevValue, nextValue);
  } catch {
    return true;
  }
}

function mountSyncExternalStore<T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
  _getServerSnapshot?: () => T,
): T {
  const fiber = currentlyRenderingFiber;
  const hook = mountWorkInProgressHook();

  const nextSnapshot = getSnapshot();
  hook.memoizedState = nextSnapshot;

  const inst = {
    value: nextSnapshot,
    getSnapshot,
  };
  hook.queue = inst as any;

  // Subscribe effect
  mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe) as any, [subscribe]);

  // Update store instance effect
  fiber.flags |= PassiveEffect;
  pushSimpleEffect(
    HookHasEffect | HookPassive,
    createEffectInstance(),
    updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot),
    null,
  );

  return nextSnapshot;
}

function updateStoreInstance<T>(
  fiber: Fiber,
  inst: { value: T; getSnapshot: () => T },
  nextSnapshot: T,
  getSnapshot: () => T,
): void {
  inst.value = nextSnapshot;
  inst.getSnapshot = getSnapshot;
}

function updateSyncExternalStore<T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
  _getServerSnapshot?: () => T,
): T {
  const fiber = currentlyRenderingFiber;
  const hook = updateWorkInProgressHook();

  const nextSnapshot = getSnapshot();
  const prevSnapshot = (currentHook || hook).memoizedState;
  const snapshotChanged = !objectIs(prevSnapshot, nextSnapshot);

  if (snapshotChanged) {
    hook.memoizedState = nextSnapshot;
    markWorkInProgressReceivedUpdateFn?.();
  }

  const inst = hook.queue as any as { value: T; getSnapshot: () => T };
  updateEffect(subscribeToStore.bind(null, fiber, inst, subscribe) as any, [subscribe]);

  if (
    inst.getSnapshot !== getSnapshot ||
    snapshotChanged
  ) {
    fiber.flags |= PassiveEffect;
    pushSimpleEffect(
      HookHasEffect | HookPassive,
      createEffectInstance(),
      updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot),
      null,
    );
  }

  return nextSnapshot;
}

// --- Id hook ---

function mountId(): string {
  const hook = mountWorkInProgressHook();

  const root = workInProgressRoot;
  const identifierPrefix = root ? root.identifierPrefix : '';
  const globalClientId = globalClientIdCounter++;
  const id = '_' + identifierPrefix + 'r_' + globalClientId.toString(32) + '_';

  hook.memoizedState = id;
  return id;
}

function updateId(): string {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

// --- Debug Value ---

function mountDebugValue<T>(_value: T, _formatterFn?: (value: T) => any): void {
  // No-op
}

const updateDebugValue = mountDebugValue;

// --- use hook ---

function use<T>(usable: any): T {
  if (usable !== null && typeof usable === 'object') {
    if (typeof usable.then === 'function') {
      throw usable; // Suspend (throw the thenable)
    } else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
      return readContext(usable);
    }
  }
  throw new Error('An unsupported type was passed to use(): ' + String(usable));
}

// --- Optimistic hook (simplified) ---

function mountOptimistic<S, A>(
  passthrough: S,
  _reducer?: (state: S, action: A) => S,
): [S, (action: A) => void] {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = hook.baseState = passthrough;
  const queue: UpdateQueue<S, A> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: null,
    lastRenderedState: null,
  };
  hook.queue = queue;
  const dispatch = ((action: A) => {
    // Simplified: dispatch optimistic update
    dispatchSetState(currentlyRenderingFiber, queue as any, action as any);
  }) as (action: A) => void;
  queue.dispatch = dispatch as any;
  return [passthrough, dispatch];
}

function updateOptimistic<S, A>(
  passthrough: S,
  reducer?: (state: S, action: A) => S,
): [S, (action: A) => void] {
  const hook = updateWorkInProgressHook();
  hook.baseState = passthrough;
  const resolvedReducer = typeof reducer === 'function' ? reducer : basicStateReducer as any;
  return updateReducerImpl(hook, currentHook as Hook, resolvedReducer);
}

// --- Action State (simplified) ---

function mountActionState<S, P>(
  _action: (state: Awaited<S>, payload: P) => S,
  initialState: Awaited<S>,
  _permalink?: string,
): [Awaited<S>, (payload: P) => void, boolean] {
  const stateHook = mountWorkInProgressHook();
  stateHook.memoizedState = stateHook.baseState = initialState;

  const stateQueue: UpdateQueue<any, any> = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  };
  stateHook.queue = stateQueue;
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, stateQueue) as any;
  stateQueue.dispatch = dispatch;

  // pending hook
  const pendingHook = mountWorkInProgressHook();
  pendingHook.memoizedState = false;

  // action hook
  const actionHook = mountWorkInProgressHook();
  actionHook.memoizedState = _action;

  return [initialState, dispatch, false];
}

function updateActionState<S, P>(
  _action: (state: Awaited<S>, payload: P) => S,
  _initialState: Awaited<S>,
  _permalink?: string,
): [Awaited<S>, (payload: P) => void, boolean] {
  const [state, dispatch] = updateReducer(basicStateReducer as any, null);
  // pending
  const [isPending] = updateReducer(basicStateReducer as any, null);
  // action
  const actionHook = updateWorkInProgressHook();
  actionHook.memoizedState = _action;

  return [state as Awaited<S>, dispatch, isPending ? true : false];
}

// --- Dispatch functions ---

function dispatchSetState<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
): void {
  const lane = requestUpdateLaneFn?.() ?? SyncLane;

  const update: Update<S, A> = {
    lane,
    action,
    hasEagerState: false,
    eagerState: null,
    next: null,
  };

  if (isRenderPhaseUpdate(fiber)) {
    enqueueRenderPhaseUpdate(queue, update);
  } else {
    // Try eager state computation
    const alternate = fiber.alternate;
    if (
      fiber.lanes === NoLanes &&
      (alternate === null || alternate.lanes === NoLanes)
    ) {
      const lastRenderedReducer = queue.lastRenderedReducer;
      if (lastRenderedReducer !== null) {
        try {
          const currentState: S = queue.lastRenderedState as S;
          const eagerState = lastRenderedReducer(currentState, action);
          update.hasEagerState = true;
          update.eagerState = eagerState;
          if (objectIs(eagerState, currentState)) {
            // Fast path: bail out without scheduling
            // Still enqueue the update in case we need to rebase later
            enqueueUpdate(fiber, queue, update, lane);
            return;
          }
        } catch {
          // Suppress the error, it will throw again in render
        }
      }
    }

    const root = enqueueUpdate(fiber, queue, update, lane);
    if (root !== null && scheduleUpdateOnFiberFn) {
      scheduleUpdateOnFiberFn(root, fiber, lane);
    }
  }
}

function dispatchReducerAction<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
): void {
  const lane = requestUpdateLaneFn?.() ?? SyncLane;

  const update: Update<S, A> = {
    lane,
    action,
    hasEagerState: false,
    eagerState: null,
    next: null,
  };

  if (isRenderPhaseUpdate(fiber)) {
    enqueueRenderPhaseUpdate(queue, update);
  } else {
    const root = enqueueUpdate(fiber, queue, update, lane);
    if (root !== null && scheduleUpdateOnFiberFn) {
      scheduleUpdateOnFiberFn(root, fiber, lane);
    }
  }
}

// --- Dispatchers ---

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useReducer: mountReducer as any,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
  useInsertionEffect: mountInsertionEffect,
  useCallback: mountCallback as any,
  useMemo: mountMemo as any,
  useRef: mountRef,
  useContext: mountContext,
  useImperativeHandle: mountImperativeHandle as any,
  useDebugValue: mountDebugValue,
  useDeferredValue: mountDeferredValue,
  useTransition: mountTransition,
  useSyncExternalStore: mountSyncExternalStore,
  useId: mountId,
  use,
  useOptimistic: mountOptimistic as any,
  useActionState: mountActionState as any,
};

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useReducer: updateReducer as any,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
  useInsertionEffect: updateInsertionEffect,
  useCallback: updateCallback as any,
  useMemo: updateMemo as any,
  useRef: updateRef,
  useContext: updateContext,
  useImperativeHandle: updateImperativeHandle as any,
  useDebugValue: updateDebugValue,
  useDeferredValue: updateDeferredValue,
  useTransition: updateTransition,
  useSyncExternalStore: updateSyncExternalStore,
  useId: updateId,
  use,
  useOptimistic: updateOptimistic as any,
  useActionState: updateActionState as any,
};

const ContextOnlyDispatcher: Dispatcher = {
  useState: throwInvalidHookError as any,
  useReducer: throwInvalidHookError as any,
  useEffect: throwInvalidHookError as any,
  useLayoutEffect: throwInvalidHookError as any,
  useInsertionEffect: throwInvalidHookError as any,
  useCallback: throwInvalidHookError as any,
  useMemo: throwInvalidHookError as any,
  useRef: throwInvalidHookError as any,
  useContext: throwInvalidHookError as any,
  useImperativeHandle: throwInvalidHookError as any,
  useDebugValue: throwInvalidHookError as any,
  useDeferredValue: throwInvalidHookError as any,
  useTransition: throwInvalidHookError as any,
  useSyncExternalStore: throwInvalidHookError as any,
  useId: throwInvalidHookError as any,
  use: throwInvalidHookError as any,
  useOptimistic: throwInvalidHookError as any,
  useActionState: throwInvalidHookError as any,
};

function throwInvalidHookError(): never {
  throw new Error(
    'Invalid hook call. Hooks can only be called inside of the body of a function component.',
  );
}

// --- renderWithHooks ---

export function renderWithHooks<Props>(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: (props: Props, secondArg?: any) => any,
  props: Props,
  secondArg: any,
  nextRenderLanes: Lanes,
): any {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;

  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = NoLanes;

  // Set dispatcher based on mount vs update
  ReactSharedInternals.H =
    current === null || current.memoizedState === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;

  let children = Component(props, secondArg);

  // Check for render phase updates
  if (didScheduleRenderPhaseUpdateDuringThisPass) {
    children = renderWithHooksAgain(workInProgress, Component, props, secondArg);
  }

  finishRenderingHooks(current, workInProgress);

  return children;
}

function renderWithHooksAgain<Props>(
  workInProgress: Fiber,
  Component: (props: Props, secondArg?: any) => any,
  props: Props,
  secondArg: any,
): any {
  let children;
  let numberOfReRenders = 0;

  do {
    didScheduleRenderPhaseUpdateDuringThisPass = false;

    if (numberOfReRenders >= RE_RENDER_LIMIT) {
      throw new Error(
        'Too many re-renders. React limits the number of renders to prevent ' +
          'an infinite loop.',
      );
    }

    numberOfReRenders += 1;

    // Start over from the beginning of the list
    currentHook = null;
    workInProgressHook = null;

    workInProgress.updateQueue = null;

    ReactSharedInternals.H = HooksDispatcherOnUpdate;

    children = Component(props, secondArg);
  } while (didScheduleRenderPhaseUpdateDuringThisPass);

  return children;
}

function finishRenderingHooks(
  _current: Fiber | null,
  _workInProgress: Fiber,
): void {
  ReactSharedInternals.H = ContextOnlyDispatcher;

  renderLanes = NoLanes;
  currentlyRenderingFiber = null as any;

  currentHook = null;
  workInProgressHook = null;

  didScheduleRenderPhaseUpdate = false;
}

// --- Bailout hooks ---

export function bailoutHooks(
  current: Fiber,
  workInProgress: Fiber,
  lanes: Lanes,
): void {
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.flags &= ~(PassiveEffect | UpdateEffect);
  current.lanes = removeLanes(current.lanes, lanes);
}

// Export for use by work loop
export function resetHooksAfterThrow(): void {
  currentlyRenderingFiber = null as any;
  currentHook = null;
  workInProgressHook = null;
  didScheduleRenderPhaseUpdate = false;
  didScheduleRenderPhaseUpdateDuringThisPass = false;
  ReactSharedInternals.H = ContextOnlyDispatcher;
}
