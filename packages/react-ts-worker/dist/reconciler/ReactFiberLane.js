export const TotalLanes = 31;
export const NoLanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane = /*                        */ 0b0000000000000000000000000000000;
export const SyncLane = /*                        */ 0b0000000000000000000000000000010;
export const InputContinuousLane = /*                */ 0b0000000000000000000000000001000;
export const DefaultLane = /*                        */ 0b0000000000000000000000000100000;
export const SyncUpdateLanes = SyncLane | InputContinuousLane | DefaultLane;
const TransitionLanes = /*                        */ 0b0000000001111111111111100000000;
const TransitionLane1 = /*                        */ 0b0000000000000000000000100000000;
const RetryLanes = /*                        */ 0b0000011110000000000000000000000;
const RetryLane1 = /*                        */ 0b0000000010000000000000000000000;
export const IdleLane = /*                        */ 0b0010000000000000000000000000000;
export const OffscreenLane = /*                      */ 0b0100000000000000000000000000000;
export const DeferredLane = /*                       */ 0b1000000000000000000000000000000;
const NonIdleLanes = /*                        */ 0b0000111111111111111111111111111;
export const NoTimestamp = -1;
let nextTransitionLane = TransitionLane1;
let nextRetryLane = RetryLane1;
export function getHighestPriorityLane(lanes) {
    return lanes & -lanes;
}
export function includesSomeLane(a, b) {
    return (a & b) !== NoLanes;
}
export function isSubsetOfLanes(set, subset) {
    return (set & subset) === subset;
}
export function mergeLanes(a, b) {
    return a | b;
}
export function removeLanes(set, subset) {
    return set & ~subset;
}
export function intersectLanes(a, b) {
    return a & b;
}
export function laneToLanes(lane) {
    return lane;
}
export function includesNonIdleWork(lanes) {
    return (lanes & NonIdleLanes) !== NoLanes;
}
export function includesBlockingLane(lanes) {
    const SyncDefaultLanes = SyncLane | InputContinuousLane | DefaultLane;
    return (lanes & SyncDefaultLanes) !== NoLanes;
}
export function includesTransitionLane(lanes) {
    return (lanes & TransitionLanes) !== NoLanes;
}
export function includesOnlyNonUrgentLanes(lanes) {
    const UrgentLanes = SyncLane | InputContinuousLane | DefaultLane;
    return (lanes & UrgentLanes) === NoLanes;
}
export function includesOnlyTransitions(lanes) {
    return (lanes & TransitionLanes) === lanes;
}
export function claimNextTransitionLane() {
    const lane = nextTransitionLane;
    nextTransitionLane <<= 1;
    if ((nextTransitionLane & TransitionLanes) === NoLanes) {
        nextTransitionLane = TransitionLane1;
    }
    return lane;
}
export function claimNextRetryLane() {
    const lane = nextRetryLane;
    nextRetryLane <<= 1;
    if ((nextRetryLane & RetryLanes) === NoLanes) {
        nextRetryLane = RetryLane1;
    }
    return lane;
}
export function pickArbitraryLane(lanes) {
    return getHighestPriorityLane(lanes);
}
export function createLaneMap(initial) {
    const laneMap = [];
    for (let i = 0; i < TotalLanes; i++) {
        laneMap.push(initial);
    }
    return laneMap;
}
export function markRootUpdated(root, updateLane) {
    root.pendingLanes |= updateLane;
    if (updateLane !== IdleLane) {
        root.suspendedLanes = NoLanes;
        root.pingedLanes = NoLanes;
    }
}
export function markRootFinished(root, remainingLanes) {
    root.pendingLanes = remainingLanes;
    root.suspendedLanes = NoLanes;
    root.pingedLanes = NoLanes;
    root.expiredLanes &= remainingLanes;
    root.entangledLanes &= remainingLanes;
}
export function getNextLanes(root, wipLanes) {
    const pendingLanes = root.pendingLanes;
    if (pendingLanes === NoLanes) {
        return NoLanes;
    }
    let nextLanes = NoLanes;
    const nonIdlePendingLanes = pendingLanes & NonIdleLanes;
    if (nonIdlePendingLanes !== NoLanes) {
        const nonIdleUnblockedLanes = nonIdlePendingLanes & ~root.suspendedLanes;
        if (nonIdleUnblockedLanes !== NoLanes) {
            nextLanes = getHighestPriorityLane(nonIdleUnblockedLanes);
        }
        else {
            const nonIdlePingedLanes = nonIdlePendingLanes & root.pingedLanes;
            if (nonIdlePingedLanes !== NoLanes) {
                nextLanes = getHighestPriorityLane(nonIdlePingedLanes);
            }
        }
    }
    else {
        const unblockedLanes = pendingLanes & ~root.suspendedLanes;
        if (unblockedLanes !== NoLanes) {
            nextLanes = getHighestPriorityLane(unblockedLanes);
        }
        else {
            if (root.pingedLanes !== NoLanes) {
                nextLanes = getHighestPriorityLane(root.pingedLanes);
            }
        }
    }
    if (nextLanes === NoLanes) {
        return NoLanes;
    }
    return nextLanes;
}
export function getEntangledLanes(root, renderLanes) {
    let entangledLanes = renderLanes;
    if ((entangledLanes & InputContinuousLane) !== NoLanes) {
        entangledLanes |= entangledLanes & DefaultLane;
    }
    const allEntangledLanes = root.entangledLanes;
    if (allEntangledLanes !== NoLanes) {
        const entanglements = root.entanglements;
        let lanes = entangledLanes & allEntangledLanes;
        while (lanes > 0) {
            const index = 31 - Math.clz32(lanes);
            const lane = 1 << index;
            entangledLanes |= entanglements[index];
            lanes &= ~lane;
        }
    }
    return entangledLanes;
}
export function markRootPinged(root, pingedLanes) {
    root.pingedLanes |= root.suspendedLanes & pingedLanes;
}
export function higherPriorityLane(a, b) {
    return a !== NoLane && a < b ? a : b;
}
//# sourceMappingURL=ReactFiberLane.js.map