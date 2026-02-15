import { NoLanes, NoLane, SyncLane, mergeLanes, isSubsetOfLanes, removeLanes, includesOnlyNonUrgentLanes, } from './ReactFiberLane.js';
import { Passive as PassiveEffect, Update as UpdateEffect, LayoutStatic as LayoutStaticEffect, PassiveStatic as PassiveStaticEffect, } from './ReactFiberFlags.js';
import ReactSharedInternals from '../react/ReactSharedInternals.js';
import { REACT_CONTEXT_TYPE } from '../react/ReactSymbols.js';
import { readContext } from './ReactFiberNewContext.js';
import objectIs from '../shared/objectIs.js';
// --- Hook Effect Tags ---
export const HookHasEffect = /*  */ 0b0001;
export const HookInsertion = /*  */ 0b0010;
export const HookLayout = /*  */ 0b0100;
export const HookPassive = /*  */ 0b1000;
// --- Module-level state ---
let renderLanes = NoLanes;
let currentlyRenderingFiber = null;
let currentHook = null;
let workInProgressHook = null;
let _didScheduleRenderPhaseUpdate = false;
let didScheduleRenderPhaseUpdateDuringThisPass = false;
const _localIdCounter = 0;
let globalClientIdCounter = 0;
const RE_RENDER_LIMIT = 25;
// --- Exported functions for work loop interaction ---
// These will be set by the work loop to avoid circular dependencies
let scheduleUpdateOnFiberFn = null;
let requestUpdateLaneFn = null;
let workInProgressRoot = null;
let _workInProgressRootRenderLanes = NoLanes;
let markWorkInProgressReceivedUpdateFn = null;
export function setHooksExternals(externals) {
    scheduleUpdateOnFiberFn = externals.scheduleUpdateOnFiber;
    requestUpdateLaneFn = externals.requestUpdateLane;
    markWorkInProgressReceivedUpdateFn = externals.markWorkInProgressReceivedUpdate;
}
export function setWorkInProgressRoot(root, lanes) {
    workInProgressRoot = root;
    _workInProgressRootRenderLanes = lanes;
}
// --- Helper functions ---
function basicStateReducer(state, action) {
    return typeof action === 'function' ? action(state) : action;
}
function areHookInputsEqual(nextDeps, prevDeps) {
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
function createEffectInstance() {
    return { destroy: undefined };
}
function createFunctionComponentUpdateQueue() {
    return {
        lastEffect: null,
        events: null,
        stores: null,
    };
}
// --- Hook infrastructure ---
function mountWorkInProgressHook() {
    const hook = {
        memoizedState: null,
        baseState: null,
        baseQueue: null,
        queue: null,
        next: null,
    };
    if (workInProgressHook === null) {
        currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
    }
    else {
        workInProgressHook = workInProgressHook.next = hook;
    }
    return workInProgressHook;
}
function updateWorkInProgressHook() {
    let nextCurrentHook;
    if (currentHook === null) {
        const current = currentlyRenderingFiber.alternate;
        if (current !== null) {
            nextCurrentHook = current.memoizedState;
        }
        else {
            nextCurrentHook = null;
        }
    }
    else {
        nextCurrentHook = currentHook.next;
    }
    let nextWorkInProgressHook;
    if (workInProgressHook === null) {
        nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
    }
    else {
        nextWorkInProgressHook = workInProgressHook.next;
    }
    if (nextWorkInProgressHook !== null) {
        // Reuse existing work-in-progress hook
        workInProgressHook = nextWorkInProgressHook;
        nextWorkInProgressHook = workInProgressHook.next;
        currentHook = nextCurrentHook;
    }
    else {
        // Clone from current hook
        if (nextCurrentHook === null) {
            throw new Error('Rendered more hooks than during the previous render.');
        }
        currentHook = nextCurrentHook;
        const newHook = {
            memoizedState: currentHook.memoizedState,
            baseState: currentHook.baseState,
            baseQueue: currentHook.baseQueue,
            queue: currentHook.queue,
            next: null,
        };
        if (workInProgressHook === null) {
            currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
        }
        else {
            workInProgressHook = workInProgressHook.next = newHook;
        }
    }
    return workInProgressHook;
}
// --- Effect push ---
function pushSimpleEffect(tag, inst, create, deps) {
    const effect = {
        tag,
        create,
        destroy: inst.destroy ?? null,
        deps,
        next: null,
    };
    return pushEffectImpl(effect);
}
function pushEffectImpl(effect) {
    let componentUpdateQueue = currentlyRenderingFiber.updateQueue;
    if (componentUpdateQueue === null) {
        componentUpdateQueue = createFunctionComponentUpdateQueue();
        currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    }
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
        componentUpdateQueue.lastEffect = effect.next = effect;
    }
    else {
        const firstEffect = lastEffect.next;
        lastEffect.next = effect;
        effect.next = firstEffect;
        componentUpdateQueue.lastEffect = effect;
    }
    return effect;
}
// --- Update queue helpers ---
function isRenderPhaseUpdate(fiber) {
    const alternate = fiber.alternate;
    return (fiber === currentlyRenderingFiber ||
        (alternate !== null && alternate === currentlyRenderingFiber));
}
function enqueueRenderPhaseUpdate(queue, update) {
    didScheduleRenderPhaseUpdateDuringThisPass = _didScheduleRenderPhaseUpdate = true;
    const pending = queue.pending;
    if (pending === null) {
        update.next = update;
    }
    else {
        update.next = pending.next;
        pending.next = update;
    }
    queue.pending = update;
}
function enqueueUpdate(fiber, queue, update, lane) {
    // Concurrent update: append to the queue
    const pending = queue.pending;
    if (pending === null) {
        update.next = update;
    }
    else {
        update.next = pending.next;
        pending.next = update;
    }
    queue.pending = update;
    // Mark the fiber and its return path with lanes
    return markUpdateLaneFromFiberToRoot(fiber, lane);
}
function markUpdateLaneFromFiberToRoot(fiber, lane) {
    fiber.lanes = mergeLanes(fiber.lanes, lane);
    const alternate = fiber.alternate;
    if (alternate !== null) {
        alternate.lanes = mergeLanes(alternate.lanes, lane);
    }
    // Walk to root
    let node = fiber.return;
    let root = null;
    if (node === null && fiber.tag === 3 /* HostRoot */) {
        root = fiber.stateNode;
    }
    else {
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
function mountStateImpl(initialState) {
    const hook = mountWorkInProgressHook();
    if (typeof initialState === 'function') {
        initialState = initialState();
    }
    hook.memoizedState = hook.baseState = initialState;
    const queue = {
        pending: null,
        lanes: NoLanes,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialState,
    };
    hook.queue = queue;
    return hook;
}
function mountState(initialState) {
    const hook = mountStateImpl(initialState);
    const queue = hook.queue;
    const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
    queue.dispatch = dispatch;
    return [hook.memoizedState, dispatch];
}
function updateState(_initialState) {
    return updateReducer(basicStateReducer, _initialState);
}
function mountReducer(reducer, initialArg, init) {
    const hook = mountWorkInProgressHook();
    let initialState;
    if (init !== undefined) {
        initialState = init(initialArg);
    }
    else {
        initialState = initialArg;
    }
    hook.memoizedState = hook.baseState = initialState;
    const queue = {
        pending: null,
        lanes: NoLanes,
        dispatch: null,
        lastRenderedReducer: reducer,
        lastRenderedState: initialState,
    };
    hook.queue = queue;
    const dispatch = dispatchReducerAction.bind(null, currentlyRenderingFiber, queue);
    queue.dispatch = dispatch;
    return [hook.memoizedState, dispatch];
}
function updateReducer(reducer, _initialArg, _init) {
    const hook = updateWorkInProgressHook();
    return updateReducerImpl(hook, currentHook, reducer);
}
function updateReducerImpl(hook, current, reducer) {
    const queue = hook.queue;
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
    }
    else {
        const first = baseQueue.next;
        let newState = baseState;
        let newBaseState = null;
        let newBaseQueueFirst = null;
        let newBaseQueueLast = null;
        let update = first;
        do {
            const updateLane = update.lane;
            if (!isSubsetOfLanes(renderLanes, updateLane)) {
                // Priority is insufficient. Skip this update.
                const clone = {
                    lane: updateLane,
                    action: update.action,
                    hasEagerState: update.hasEagerState,
                    eagerState: update.eagerState,
                    next: null,
                };
                if (newBaseQueueLast === null) {
                    newBaseQueueFirst = newBaseQueueLast = clone;
                    newBaseState = newState;
                }
                else {
                    newBaseQueueLast.next = clone;
                    newBaseQueueLast = clone;
                }
                currentlyRenderingFiber.lanes = mergeLanes(currentlyRenderingFiber.lanes, updateLane);
            }
            else {
                // This update has sufficient priority.
                if (newBaseQueueLast !== null) {
                    const clone = {
                        lane: NoLane,
                        action: update.action,
                        hasEagerState: update.hasEagerState,
                        eagerState: update.eagerState,
                        next: null,
                    };
                    newBaseQueueLast.next = clone;
                    newBaseQueueLast = clone;
                }
                // Process the update
                const action = update.action;
                if (update.hasEagerState) {
                    newState = update.eagerState;
                }
                else {
                    newState = reducer(newState, action);
                }
            }
            update = update.next;
        } while (update !== null && update !== first);
        if (newBaseQueueLast === null) {
            newBaseState = newState;
        }
        else {
            newBaseQueueLast.next = newBaseQueueFirst;
        }
        if (!objectIs(newState, hook.memoizedState)) {
            markWorkInProgressReceivedUpdateFn?.();
        }
        hook.memoizedState = newState;
        hook.baseState = newBaseState;
        hook.baseQueue = newBaseQueueLast;
        queue.lastRenderedState = newState;
    }
    const dispatch = queue.dispatch;
    return [hook.memoizedState, dispatch];
}
// --- Ref hooks ---
function mountRef(initialValue) {
    const hook = mountWorkInProgressHook();
    const ref = { current: initialValue };
    hook.memoizedState = ref;
    return ref;
}
function updateRef(_initialValue) {
    const hook = updateWorkInProgressHook();
    return hook.memoizedState;
}
// --- Effect hooks ---
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
    const hook = mountWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    currentlyRenderingFiber.flags |= fiberFlags;
    hook.memoizedState = pushSimpleEffect(HookHasEffect | hookFlags, createEffectInstance(), create, nextDeps);
}
function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
    const hook = updateWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    const effect = hook.memoizedState;
    const inst = createEffectInstance();
    inst.destroy = effect.destroy;
    if (currentHook !== null) {
        if (nextDeps !== null) {
            const prevEffect = currentHook.memoizedState;
            const prevDeps = prevEffect.deps;
            if (areHookInputsEqual(nextDeps, prevDeps)) {
                hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, nextDeps);
                return;
            }
        }
    }
    currentlyRenderingFiber.flags |= fiberFlags;
    hook.memoizedState = pushSimpleEffect(HookHasEffect | hookFlags, inst, create, nextDeps);
}
function mountEffect(create, deps) {
    mountEffectImpl(PassiveEffect | PassiveStaticEffect, HookPassive, create, deps);
}
function updateEffect(create, deps) {
    updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}
function mountLayoutEffect(create, deps) {
    mountEffectImpl(UpdateEffect | LayoutStaticEffect, HookLayout, create, deps);
}
function updateLayoutEffect(create, deps) {
    updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}
function mountInsertionEffect(create, deps) {
    mountEffectImpl(UpdateEffect, HookInsertion, create, deps);
}
function updateInsertionEffect(create, deps) {
    updateEffectImpl(UpdateEffect, HookInsertion, create, deps);
}
// --- Imperative Handle ---
function imperativeHandleEffect(create, ref) {
    if (typeof ref === 'function') {
        const refCallback = ref;
        const inst = create();
        refCallback(inst);
        return () => {
            refCallback(null);
        };
    }
    else if (ref !== null && ref !== undefined) {
        const refObject = ref;
        const inst = create();
        refObject.current = inst;
        return () => {
            refObject.current = null;
        };
    }
}
function mountImperativeHandle(ref, create, deps) {
    const effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
    mountEffectImpl(UpdateEffect | LayoutStaticEffect, HookLayout, (imperativeHandleEffect).bind(null, create, ref), effectDeps);
}
function updateImperativeHandle(ref, create, deps) {
    const effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
    updateEffectImpl(UpdateEffect, HookLayout, (imperativeHandleEffect).bind(null, create, ref), effectDeps);
}
// --- Callback and Memo hooks ---
function mountCallback(callback, deps) {
    const hook = mountWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    hook.memoizedState = [callback, nextDeps];
    return callback;
}
function updateCallback(callback, deps) {
    const hook = updateWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    const prevState = hook.memoizedState;
    if (nextDeps !== null) {
        const prevDeps = prevState[1];
        if (areHookInputsEqual(nextDeps, prevDeps)) {
            return prevState[0];
        }
    }
    hook.memoizedState = [callback, nextDeps];
    return callback;
}
function mountMemo(nextCreate, deps) {
    const hook = mountWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    const nextValue = nextCreate();
    hook.memoizedState = [nextValue, nextDeps];
    return nextValue;
}
function updateMemo(nextCreate, deps) {
    const hook = updateWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    const prevState = hook.memoizedState;
    if (nextDeps !== null) {
        const prevDeps = prevState[1];
        if (areHookInputsEqual(nextDeps, prevDeps)) {
            return prevState[0];
        }
    }
    const nextValue = nextCreate();
    hook.memoizedState = [nextValue, nextDeps];
    return nextValue;
}
// --- Context hook ---
function mountContext(context) {
    return readContext(context);
}
function updateContext(context) {
    return readContext(context);
}
// --- Deferred Value hook ---
function mountDeferredValue(value, _initialValue) {
    const hook = mountWorkInProgressHook();
    hook.memoizedState = value;
    return value;
}
function updateDeferredValue(value, _initialValue) {
    const hook = updateWorkInProgressHook();
    const prevValue = currentHook.memoizedState;
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
function mountTransition() {
    const stateHook = mountStateImpl(false);
    const start = startTransition.bind(null, currentlyRenderingFiber, stateHook.queue, true, false);
    const hook = mountWorkInProgressHook();
    hook.memoizedState = start;
    return [false, start];
}
function updateTransition() {
    const [booleanOrThenable] = updateState(false);
    const hook = updateWorkInProgressHook();
    const start = hook.memoizedState;
    const isPending = typeof booleanOrThenable === 'boolean' ? booleanOrThenable : false;
    return [isPending, start];
}
function startTransition(fiber, queue, pendingState, finishedState, callback) {
    const lane = requestUpdateLaneFn?.() ?? SyncLane;
    // Set pending state
    const pendingUpdate = {
        lane,
        action: pendingState,
        hasEagerState: false,
        eagerState: null,
        next: null,
    };
    if (isRenderPhaseUpdate(fiber)) {
        enqueueRenderPhaseUpdate(queue, pendingUpdate);
    }
    else {
        const root = enqueueUpdate(fiber, queue, pendingUpdate, lane);
        if (root !== null && scheduleUpdateOnFiberFn) {
            scheduleUpdateOnFiberFn(root, fiber, lane);
        }
    }
    try {
        callback();
    }
    finally {
        // Set finished state
        const finishedUpdate = {
            lane,
            action: finishedState,
            hasEagerState: false,
            eagerState: null,
            next: null,
        };
        if (isRenderPhaseUpdate(fiber)) {
            enqueueRenderPhaseUpdate(queue, finishedUpdate);
        }
        else {
            const root = enqueueUpdate(fiber, queue, finishedUpdate, lane);
            if (root !== null && scheduleUpdateOnFiberFn) {
                scheduleUpdateOnFiberFn(root, fiber, lane);
            }
        }
    }
}
// --- SyncExternalStore hook ---
function subscribeToStore(fiber, inst, subscribe) {
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
function checkIfSnapshotChanged(inst) {
    const latestGetSnapshot = inst.getSnapshot;
    const prevValue = inst.value;
    try {
        const nextValue = latestGetSnapshot();
        return !objectIs(prevValue, nextValue);
    }
    catch {
        return true;
    }
}
function mountSyncExternalStore(subscribe, getSnapshot, _getServerSnapshot) {
    const fiber = currentlyRenderingFiber;
    const hook = mountWorkInProgressHook();
    const nextSnapshot = getSnapshot();
    hook.memoizedState = nextSnapshot;
    const inst = {
        value: nextSnapshot,
        getSnapshot,
    };
    hook.queue = inst;
    // Subscribe effect
    mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [subscribe]);
    // Update store instance effect
    fiber.flags |= PassiveEffect;
    pushSimpleEffect(HookHasEffect | HookPassive, createEffectInstance(), updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot), null);
    return nextSnapshot;
}
function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
    inst.value = nextSnapshot;
    inst.getSnapshot = getSnapshot;
}
function updateSyncExternalStore(subscribe, getSnapshot, _getServerSnapshot) {
    const fiber = currentlyRenderingFiber;
    const hook = updateWorkInProgressHook();
    const nextSnapshot = getSnapshot();
    const prevSnapshot = (currentHook || hook).memoizedState;
    const snapshotChanged = !objectIs(prevSnapshot, nextSnapshot);
    if (snapshotChanged) {
        hook.memoizedState = nextSnapshot;
        markWorkInProgressReceivedUpdateFn?.();
    }
    const inst = hook.queue;
    updateEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [subscribe]);
    if (inst.getSnapshot !== getSnapshot ||
        snapshotChanged) {
        fiber.flags |= PassiveEffect;
        pushSimpleEffect(HookHasEffect | HookPassive, createEffectInstance(), updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot), null);
    }
    return nextSnapshot;
}
// --- Id hook ---
function mountId() {
    const hook = mountWorkInProgressHook();
    const root = workInProgressRoot;
    const identifierPrefix = root ? root.identifierPrefix : '';
    const globalClientId = globalClientIdCounter++;
    const id = '_' + identifierPrefix + 'r_' + globalClientId.toString(32) + '_';
    hook.memoizedState = id;
    return id;
}
function updateId() {
    const hook = updateWorkInProgressHook();
    return hook.memoizedState;
}
// --- Debug Value ---
function mountDebugValue(_value, _formatterFn) {
    // No-op
}
const updateDebugValue = mountDebugValue;
// --- use hook ---
function use(usable) {
    if (usable !== null && typeof usable === 'object') {
        const obj = usable;
        if (typeof obj.then === 'function') {
            throw usable; // Suspend (throw the thenable)
        }
        else if (obj.$$typeof === REACT_CONTEXT_TYPE) {
            return readContext(usable);
        }
    }
    throw new Error('An unsupported type was passed to use(): ' + String(usable));
}
// --- Optimistic hook (simplified) ---
function mountOptimistic(passthrough, _reducer) {
    const hook = mountWorkInProgressHook();
    hook.memoizedState = hook.baseState = passthrough;
    const queue = {
        pending: null,
        lanes: NoLanes,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null,
    };
    hook.queue = queue;
    const dispatch = ((action) => {
        // Simplified: dispatch optimistic update
        dispatchSetState(currentlyRenderingFiber, queue, action);
    });
    queue.dispatch = dispatch;
    return [passthrough, dispatch];
}
function updateOptimistic(passthrough, reducer) {
    const hook = updateWorkInProgressHook();
    hook.baseState = passthrough;
    const resolvedReducer = typeof reducer === 'function' ? reducer : basicStateReducer;
    return updateReducerImpl(hook, currentHook, resolvedReducer);
}
// --- Action State (simplified) ---
function mountActionState(_action, initialState, _permalink) {
    const stateHook = mountWorkInProgressHook();
    stateHook.memoizedState = stateHook.baseState = initialState;
    const stateQueue = {
        pending: null,
        lanes: NoLanes,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialState,
    };
    stateHook.queue = stateQueue;
    const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, stateQueue);
    stateQueue.dispatch = dispatch;
    // pending hook
    const pendingHook = mountWorkInProgressHook();
    pendingHook.memoizedState = false;
    // action hook
    const actionHook = mountWorkInProgressHook();
    actionHook.memoizedState = _action;
    return [initialState, dispatch, false];
}
function updateActionState(_action, _initialState, _permalink) {
    const [state, dispatch] = updateReducer(basicStateReducer, null);
    // pending
    const [isPending] = updateReducer(basicStateReducer, null);
    // action
    const actionHook = updateWorkInProgressHook();
    actionHook.memoizedState = _action;
    return [state, dispatch, isPending ? true : false];
}
// --- Dispatch functions ---
function dispatchSetState(fiber, queue, action) {
    const lane = requestUpdateLaneFn?.() ?? SyncLane;
    const update = {
        lane,
        action,
        hasEagerState: false,
        eagerState: null,
        next: null,
    };
    if (isRenderPhaseUpdate(fiber)) {
        enqueueRenderPhaseUpdate(queue, update);
    }
    else {
        // Try eager state computation
        const alternate = fiber.alternate;
        if (fiber.lanes === NoLanes &&
            (alternate === null || alternate.lanes === NoLanes)) {
            const lastRenderedReducer = queue.lastRenderedReducer;
            if (lastRenderedReducer !== null) {
                try {
                    const currentState = queue.lastRenderedState;
                    const eagerState = lastRenderedReducer(currentState, action);
                    update.hasEagerState = true;
                    update.eagerState = eagerState;
                    if (objectIs(eagerState, currentState)) {
                        // Fast path: bail out without scheduling
                        // Still enqueue the update in case we need to rebase later
                        enqueueUpdate(fiber, queue, update, lane);
                        return;
                    }
                }
                catch {
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
function dispatchReducerAction(fiber, queue, action) {
    const lane = requestUpdateLaneFn?.() ?? SyncLane;
    const update = {
        lane,
        action,
        hasEagerState: false,
        eagerState: null,
        next: null,
    };
    if (isRenderPhaseUpdate(fiber)) {
        enqueueRenderPhaseUpdate(queue, update);
    }
    else {
        const root = enqueueUpdate(fiber, queue, update, lane);
        if (root !== null && scheduleUpdateOnFiberFn) {
            scheduleUpdateOnFiberFn(root, fiber, lane);
        }
    }
}
// --- Dispatchers ---
const HooksDispatcherOnMount = {
    useState: mountState,
    useReducer: mountReducer,
    useEffect: mountEffect,
    useLayoutEffect: mountLayoutEffect,
    useInsertionEffect: mountInsertionEffect,
    useCallback: mountCallback,
    useMemo: mountMemo,
    useRef: mountRef,
    useContext: mountContext,
    useImperativeHandle: mountImperativeHandle,
    useDebugValue: mountDebugValue,
    useDeferredValue: mountDeferredValue,
    useTransition: mountTransition,
    useSyncExternalStore: mountSyncExternalStore,
    useId: mountId,
    use,
    useOptimistic: mountOptimistic,
    useActionState: mountActionState,
};
const HooksDispatcherOnUpdate = {
    useState: updateState,
    useReducer: updateReducer,
    useEffect: updateEffect,
    useLayoutEffect: updateLayoutEffect,
    useInsertionEffect: updateInsertionEffect,
    useCallback: updateCallback,
    useMemo: updateMemo,
    useRef: updateRef,
    useContext: updateContext,
    useImperativeHandle: updateImperativeHandle,
    useDebugValue: updateDebugValue,
    useDeferredValue: updateDeferredValue,
    useTransition: updateTransition,
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    use,
    useOptimistic: updateOptimistic,
    useActionState: updateActionState,
};
const ContextOnlyDispatcher = {
    useState: throwInvalidHookError,
    useReducer: throwInvalidHookError,
    useEffect: throwInvalidHookError,
    useLayoutEffect: throwInvalidHookError,
    useInsertionEffect: throwInvalidHookError,
    useCallback: throwInvalidHookError,
    useMemo: throwInvalidHookError,
    useRef: throwInvalidHookError,
    useContext: throwInvalidHookError,
    useImperativeHandle: throwInvalidHookError,
    useDebugValue: throwInvalidHookError,
    useDeferredValue: throwInvalidHookError,
    useTransition: throwInvalidHookError,
    useSyncExternalStore: throwInvalidHookError,
    useId: throwInvalidHookError,
    use: throwInvalidHookError,
    useOptimistic: throwInvalidHookError,
    useActionState: throwInvalidHookError,
};
function throwInvalidHookError() {
    throw new Error('Invalid hook call. Hooks can only be called inside of the body of a function component.');
}
// --- renderWithHooks ---
export function renderWithHooks(current, workInProgress, Component, props, secondArg, nextRenderLanes) {
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
function renderWithHooksAgain(workInProgress, Component, props, secondArg) {
    let children;
    let numberOfReRenders = 0;
    do {
        didScheduleRenderPhaseUpdateDuringThisPass = false;
        if (numberOfReRenders >= RE_RENDER_LIMIT) {
            throw new Error('Too many re-renders. React limits the number of renders to prevent ' +
                'an infinite loop.');
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
function finishRenderingHooks(_current, _workInProgress) {
    ReactSharedInternals.H = ContextOnlyDispatcher;
    renderLanes = NoLanes;
    currentlyRenderingFiber = null;
    currentHook = null;
    workInProgressHook = null;
    _didScheduleRenderPhaseUpdate = false;
}
// --- Bailout hooks ---
export function bailoutHooks(current, workInProgress, lanes) {
    workInProgress.updateQueue = current.updateQueue;
    workInProgress.flags &= ~(PassiveEffect | UpdateEffect);
    current.lanes = removeLanes(current.lanes, lanes);
}
// Export for use by work loop
export function resetHooksAfterThrow() {
    currentlyRenderingFiber = null;
    currentHook = null;
    workInProgressHook = null;
    _didScheduleRenderPhaseUpdate = false;
    didScheduleRenderPhaseUpdateDuringThisPass = false;
    ReactSharedInternals.H = ContextOnlyDispatcher;
}
//# sourceMappingURL=ReactFiberHooks.js.map