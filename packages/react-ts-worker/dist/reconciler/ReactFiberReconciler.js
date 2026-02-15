// ReactFiberReconciler - Public API for creating and updating containers
import { createFiberRoot } from './ReactFiberRoot.js';
import { SyncLane } from './ReactFiberLane.js';
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop.js';
export function createContainer(containerInfo, hostConfig) {
    return createFiberRoot(containerInfo, hostConfig);
}
export function updateContainer(element, container) {
    const current = container.current;
    const lane = SyncLane;
    // Enqueue the update
    const update = {
        element,
    };
    current.memoizedState = update;
    current.lanes = lane;
    scheduleUpdateOnFiber(container, current, lane);
}
export function getPublicRootInstance(container) {
    const containerFiber = container.current;
    if (!containerFiber.child) {
        return null;
    }
    return containerFiber.child.stateNode;
}
//# sourceMappingURL=ReactFiberReconciler.js.map