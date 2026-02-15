// Class Component Lifecycle Management
import { Update, Snapshot, Callback } from './ReactFiberFlags.js';
import { SyncLane } from './ReactFiberLane.js';
import assign from '../shared/assign.js';
// Update tags
const UpdateState = 0;
const ReplaceState = 1;
const ForceUpdate = 2;
const CaptureUpdate = 3;
export function initializeClassUpdateQueue(fiber) {
    const queue = {
        baseState: fiber.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: {
            pending: null,
        },
        callbacks: null,
    };
    fiber.updateQueue = queue;
}
export function createClassUpdate(lane) {
    return {
        lane,
        tag: UpdateState,
        payload: null,
        callback: null,
        next: null,
    };
}
export function enqueueClassUpdate(fiber, update) {
    const updateQueue = fiber.updateQueue;
    if (updateQueue === null)
        return;
    const sharedQueue = updateQueue.shared;
    const pending = sharedQueue.pending;
    if (pending === null) {
        update.next = update;
    }
    else {
        update.next = pending.next;
        pending.next = update;
    }
    sharedQueue.pending = update;
}
export function processClassUpdateQueue(fiber, props, instance, renderLanes) {
    const queue = fiber.updateQueue;
    if (!queue)
        return;
    let firstBaseUpdate = queue.firstBaseUpdate;
    let lastBaseUpdate = queue.lastBaseUpdate;
    // Move pending updates to base queue
    const pendingQueue = queue.shared.pending;
    if (pendingQueue !== null) {
        queue.shared.pending = null;
        const lastPendingUpdate = pendingQueue;
        const firstPendingUpdate = lastPendingUpdate.next;
        lastPendingUpdate.next = null;
        if (lastBaseUpdate === null) {
            firstBaseUpdate = firstPendingUpdate;
        }
        else {
            lastBaseUpdate.next = firstPendingUpdate;
        }
        lastBaseUpdate = lastPendingUpdate;
    }
    if (firstBaseUpdate !== null) {
        let newState = queue.baseState;
        let newBaseState = newState;
        let newFirstBaseUpdate = null;
        let newLastBaseUpdate = null;
        let update = firstBaseUpdate;
        do {
            // Process update
            if (update.tag === UpdateState) {
                const payload = update.payload;
                if (typeof payload === 'function') {
                    newState = payload.call(instance, newState, props);
                }
                else {
                    newState = assign({}, newState, payload);
                }
            }
            else if (update.tag === ReplaceState) {
                newState = update.payload;
            }
            else if (update.tag === ForceUpdate) {
                // Force update doesn't change state
            }
            if (update.callback !== null) {
                fiber.flags |= Callback;
                if (queue.callbacks === null) {
                    queue.callbacks = [];
                }
                queue.callbacks.push(update.callback);
            }
            update = update.next;
            if (update === null)
                break;
        } while (true);
        queue.baseState = newBaseState;
        queue.firstBaseUpdate = newFirstBaseUpdate;
        queue.lastBaseUpdate = newLastBaseUpdate;
        fiber.memoizedState = newState;
    }
}
export function constructClassInstance(fiber, Component, props) {
    const context = {};
    const instance = new Component(props, context);
    const state = instance.state !== undefined ? instance.state : null;
    fiber.memoizedState = state;
    instance.props = props;
    instance.state = state;
    instance.refs = {};
    instance.context = context;
    // Set up updater
    instance.updater = {
        isMounted: () => true,
        enqueueSetState: (inst, payload, callback) => {
            const update = createClassUpdate(SyncLane);
            update.payload = payload;
            if (callback)
                update.callback = callback;
            enqueueClassUpdate(fiber, update);
        },
        enqueueReplaceState: (inst, payload, callback) => {
            const update = createClassUpdate(SyncLane);
            update.tag = ReplaceState;
            update.payload = payload;
            if (callback)
                update.callback = callback;
            enqueueClassUpdate(fiber, update);
        },
        enqueueForceUpdate: (inst, callback) => {
            const update = createClassUpdate(SyncLane);
            update.tag = ForceUpdate;
            if (callback)
                update.callback = callback;
            enqueueClassUpdate(fiber, update);
        },
    };
    fiber.stateNode = instance;
    // Store fiber reference on instance for setState
    instance._reactInternals = fiber;
    return instance;
}
export function mountClassInstance(fiber, Component, nextProps, renderLanes) {
    const instance = fiber.stateNode;
    instance.props = nextProps;
    instance.state = fiber.memoizedState;
    instance.refs = {};
    initializeClassUpdateQueue(fiber);
    processClassUpdateQueue(fiber, nextProps, instance, renderLanes);
    instance.state = fiber.memoizedState;
    // Call getDerivedStateFromProps
    const getDerivedStateFromProps = Component.getDerivedStateFromProps;
    if (typeof getDerivedStateFromProps === 'function') {
        const partialState = getDerivedStateFromProps(nextProps, instance.state);
        if (partialState != null) {
            instance.state = assign({}, instance.state, partialState);
            fiber.memoizedState = instance.state;
        }
    }
    // Mark for lifecycle effects
    if (typeof instance.componentDidMount === 'function') {
        fiber.flags |= Update;
    }
}
export function updateClassInstance(current, fiber, Component, nextProps, renderLanes) {
    const instance = fiber.stateNode;
    const oldProps = fiber.memoizedProps;
    const oldState = fiber.memoizedState;
    instance.props = oldProps;
    // Call getDerivedStateFromProps
    let newState = oldState;
    const getDerivedStateFromProps = Component.getDerivedStateFromProps;
    if (typeof getDerivedStateFromProps === 'function') {
        const partialState = getDerivedStateFromProps(nextProps, oldState);
        if (partialState != null) {
            newState = assign({}, oldState, partialState);
        }
    }
    processClassUpdateQueue(fiber, nextProps, instance, renderLanes);
    const processedState = fiber.memoizedState;
    if (processedState !== oldState) {
        newState = assign({}, newState, processedState);
    }
    // shouldComponentUpdate check
    const shouldUpdate = typeof instance.shouldComponentUpdate === 'function'
        ? instance.shouldComponentUpdate(nextProps, newState, {})
        : true;
    if (shouldUpdate) {
        if (typeof instance.componentDidUpdate === 'function') {
            fiber.flags |= Update;
        }
        if (typeof instance.getSnapshotBeforeUpdate === 'function') {
            fiber.flags |= Snapshot;
        }
    }
    instance.props = nextProps;
    instance.state = newState;
    fiber.memoizedState = newState;
    fiber.memoizedProps = nextProps;
    return shouldUpdate;
}
//# sourceMappingURL=ReactFiberClassComponent.js.map