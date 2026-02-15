// Work Loop - Scheduling and execution of React render and commit phases
import { NoLanes, NoLane, SyncLane, mergeLanes, getHighestPriorityLane, markRootUpdated, markRootFinished, getNextLanes, } from './ReactFiberLane.js';
import { NoFlags, MutationMask, LayoutMask, PassiveMask, } from './ReactFiberFlags.js';
import { createWorkInProgress } from './ReactFiber.js';
import { beginWork } from './ReactFiberBeginWork.js';
import { completeWork } from './ReactFiberCompleteWork.js';
import { commitBeforeMutationEffects, commitMutationEffects, commitLayoutEffects, commitPassiveUnmountEffects, commitPassiveMountEffects, } from './ReactFiberCommitWork.js';
import { scheduleCallback, cancelCallback, shouldYield, NormalPriority, ImmediatePriority, } from '../scheduler/Scheduler.js';
import { setHooksExternals, setWorkInProgressRoot } from './ReactFiberHooks.js';
import { markWorkInProgressReceivedUpdate } from './ReactFiberBeginWork.js';
// Work-in-progress state
let workInProgressRoot = null;
let workInProgress = null;
let workInProgressRenderLanes = NoLanes;
// Initialize hooks externals to break circular dependency
function requestUpdateLane() {
    return SyncLane;
}
setHooksExternals({
    scheduleUpdateOnFiber,
    requestUpdateLane,
    markWorkInProgressReceivedUpdate,
});
// Root-level scheduling state
let rootDoesHavePassiveEffects = false;
let rootWithPendingPassiveEffects = null;
export function scheduleUpdateOnFiber(root, fiber, lane) {
    // Mark the fiber and root as having pending work
    markRootUpdated(root, lane);
    // Schedule work on the root
    ensureRootIsScheduled(root);
}
function ensureRootIsScheduled(root) {
    const nextLanes = getNextLanes(root, NoLanes);
    if (nextLanes === NoLanes) {
        // No pending work
        if (root.callbackNode !== null) {
            cancelCallback(root.callbackNode);
            root.callbackNode = null;
        }
        root.callbackPriority = NoLane;
        return;
    }
    const newCallbackPriority = getHighestPriorityLane(nextLanes);
    // Check if there's already a scheduled callback with the same priority
    const existingCallbackPriority = root.callbackPriority;
    if (existingCallbackPriority === newCallbackPriority) {
        return; // Already scheduled
    }
    // Cancel existing callback if different priority
    if (root.callbackNode !== null) {
        cancelCallback(root.callbackNode);
    }
    // Schedule new callback
    let newCallbackNode;
    if (newCallbackPriority === SyncLane) {
        // Sync work - schedule immediately
        scheduleSyncCallback(() => performSyncWorkOnRoot(root));
        newCallbackNode = null;
    }
    else {
        // Async work
        const priority = laneToPriority(newCallbackPriority);
        newCallbackNode = scheduleCallback(priority, () => {
            performConcurrentWorkOnRoot(root);
        });
    }
    root.callbackNode = newCallbackNode;
    root.callbackPriority = newCallbackPriority;
}
function laneToPriority(lane) {
    if (lane === SyncLane)
        return ImmediatePriority;
    return NormalPriority;
}
// Sync callbacks queue
let syncQueue = null;
let isFlushingSyncQueue = false;
function scheduleSyncCallback(callback) {
    if (syncQueue === null) {
        syncQueue = [callback];
        // Schedule a microtask to flush
        queueMicrotask(flushSyncCallbacks);
    }
    else {
        syncQueue.push(callback);
    }
}
function flushSyncCallbacks() {
    if (isFlushingSyncQueue)
        return;
    isFlushingSyncQueue = true;
    const queue = syncQueue;
    syncQueue = null;
    if (queue !== null) {
        for (let i = 0; i < queue.length; i++) {
            queue[i]();
        }
    }
    isFlushingSyncQueue = false;
}
// ─── Sync Work ──────────────────────────────────────────────────────────
export function performSyncWorkOnRoot(root) {
    const lanes = getNextLanes(root, NoLanes);
    if (lanes === NoLanes)
        return;
    // Render phase
    renderRootSync(root, lanes);
    // Commit phase
    const finishedWork = root.current.alternate;
    if (finishedWork !== null) {
        root.finishedWork = finishedWork;
        commitRoot(root);
    }
    ensureRootIsScheduled(root);
}
// ─── Concurrent Work ────────────────────────────────────────────────────
function performConcurrentWorkOnRoot(root) {
    // For now, just do sync work
    // Full concurrent mode would use workLoopConcurrent with shouldYield()
    performSyncWorkOnRoot(root);
}
// ─── Render Phase ───────────────────────────────────────────────────────
function renderRootSync(root, lanes) {
    // Prepare fresh stack
    if (workInProgressRoot !== root || workInProgressRenderLanes !== lanes) {
        prepareFreshStack(root, lanes);
    }
    // Work loop
    workLoopSync();
    // Done rendering
    workInProgressRoot = null;
    workInProgressRenderLanes = NoLanes;
    setWorkInProgressRoot(null, NoLanes);
}
function prepareFreshStack(root, lanes) {
    root.finishedWork = null;
    workInProgressRoot = root;
    const rootWorkInProgress = createWorkInProgress(root.current, null);
    workInProgress = rootWorkInProgress;
    workInProgressRenderLanes = lanes;
    // Sync hooks with current WIP root and lanes
    setWorkInProgressRoot(root, lanes);
}
function workLoopSync() {
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}
function workLoopConcurrent() {
    while (workInProgress !== null && !shouldYield()) {
        performUnitOfWork(workInProgress);
    }
}
function performUnitOfWork(unitOfWork) {
    const current = unitOfWork.alternate;
    // BeginWork returns the next child to work on, or null
    const next = beginWork(current, unitOfWork, workInProgressRenderLanes);
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    if (next === null) {
        // No more children - complete this unit
        completeUnitOfWork(unitOfWork);
    }
    else {
        workInProgress = next;
    }
}
function completeUnitOfWork(unitOfWork) {
    let completedWork = unitOfWork;
    do {
        const current = completedWork.alternate;
        const returnFiber = completedWork.return;
        // Complete the work for this fiber
        const next = completeWork(current, completedWork, workInProgressRenderLanes);
        if (next !== null) {
            // Completing this fiber spawned new work
            workInProgress = next;
            return;
        }
        // Move to sibling
        const siblingFiber = completedWork.sibling;
        if (siblingFiber !== null) {
            workInProgress = siblingFiber;
            return;
        }
        // No sibling - go up to parent
        completedWork = returnFiber;
        workInProgress = completedWork;
    } while (completedWork !== null);
}
// ─── Commit Phase ───────────────────────────────────────────────────────
function commitRoot(root) {
    const finishedWork = root.finishedWork;
    if (finishedWork === null)
        return;
    root.finishedWork = null;
    root.callbackNode = null;
    root.callbackPriority = NoLane;
    // Check for passive effects
    if ((finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
        (finishedWork.flags & PassiveMask) !== NoFlags) {
        if (!rootDoesHavePassiveEffects) {
            rootDoesHavePassiveEffects = true;
            scheduleCallback(NormalPriority, () => {
                flushPassiveEffects();
            });
        }
    }
    // Check if there are any effects to commit
    const subtreeHasEffects = (finishedWork.subtreeFlags & (MutationMask | LayoutMask | PassiveMask)) !== NoFlags;
    const rootHasEffect = (finishedWork.flags & (MutationMask | LayoutMask | PassiveMask)) !== NoFlags;
    if (subtreeHasEffects || rootHasEffect) {
        const hostConfig = root.hostConfig;
        // Before mutation phase
        const previousState = hostConfig.prepareForCommit(root.containerInfo);
        commitBeforeMutationEffects(root, finishedWork);
        // Mutation phase - modify the DOM
        commitMutationEffects(root, finishedWork);
        // Swap the current tree
        root.current = finishedWork;
        // Layout phase
        commitLayoutEffects(root, finishedWork);
        hostConfig.resetAfterCommit(root.containerInfo);
    }
    else {
        // No effects - just swap the tree
        root.current = finishedWork;
    }
    // Handle passive effects
    if (rootDoesHavePassiveEffects) {
        rootDoesHavePassiveEffects = false;
        rootWithPendingPassiveEffects = root;
    }
    // Mark lanes as finished
    const remainingLanes = mergeLanes(finishedWork.lanes, finishedWork.childLanes);
    markRootFinished(root, remainingLanes);
    // Schedule any remaining work
    ensureRootIsScheduled(root);
}
export function flushPassiveEffects() {
    if (rootWithPendingPassiveEffects === null)
        return;
    const root = rootWithPendingPassiveEffects;
    rootWithPendingPassiveEffects = null;
    const finishedWork = root.current;
    // Unmount old effects
    commitPassiveUnmountEffects(finishedWork);
    // Mount new effects
    commitPassiveMountEffects(root, finishedWork);
    // Flush any sync work scheduled by effects
    flushSyncCallbacks();
}
// ─── Public flush for testing ────────────────────────────────────────────
export function flushSync(fn) {
    if (fn) {
        fn();
    }
    flushSyncCallbacks();
}
//# sourceMappingURL=ReactFiberWorkLoop.js.map