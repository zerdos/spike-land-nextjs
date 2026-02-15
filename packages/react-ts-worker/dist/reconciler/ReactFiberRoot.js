import { createHostRootFiber } from './ReactFiber.js';
import { NoLane, NoLanes, createLaneMap } from './ReactFiberLane.js';
export function createFiberRoot(containerInfo, hostConfig) {
    const root = {
        containerInfo,
        current: null, // Will be set below
        finishedWork: null,
        callbackNode: null,
        callbackPriority: NoLane,
        pendingLanes: NoLanes,
        suspendedLanes: NoLanes,
        pingedLanes: NoLanes,
        expiredLanes: NoLanes,
        entangledLanes: NoLanes,
        entanglements: createLaneMap(NoLanes),
        hostConfig,
        pendingPassiveEffects: {
            unmount: [],
            mount: [],
            update: [],
        },
        identifierPrefix: '',
        identifierCount: 0,
    };
    // Create the host root fiber
    const uninitializedFiber = createHostRootFiber();
    root.current = uninitializedFiber;
    uninitializedFiber.stateNode = root;
    // Initialize the update queue for the root fiber
    const queue = {
        baseState: uninitializedFiber.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: {
            pending: null,
        },
        callbacks: null,
    };
    uninitializedFiber.updateQueue = queue;
    return root;
}
//# sourceMappingURL=ReactFiberRoot.js.map