export type Lanes = number;
export type Lane = number;
export type LaneMap<T> = Array<T>;
export declare const TotalLanes = 31;
export declare const NoLanes: Lanes;
export declare const NoLane: Lane;
export declare const SyncLane: Lane;
export declare const InputContinuousLane: Lane;
export declare const DefaultLane: Lane;
export declare const SyncUpdateLanes: Lanes;
export declare const IdleLane: Lane;
export declare const OffscreenLane: Lane;
export declare const DeferredLane: Lane;
export declare const NoTimestamp = -1;
export declare function getHighestPriorityLane(lanes: Lanes): Lane;
export declare function includesSomeLane(a: Lanes | Lane, b: Lanes | Lane): boolean;
export declare function isSubsetOfLanes(set: Lanes, subset: Lanes | Lane): boolean;
export declare function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes;
export declare function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes;
export declare function intersectLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes;
export declare function laneToLanes(lane: Lane): Lanes;
export declare function includesNonIdleWork(lanes: Lanes): boolean;
export declare function includesBlockingLane(lanes: Lanes): boolean;
export declare function includesTransitionLane(lanes: Lanes): boolean;
export declare function includesOnlyNonUrgentLanes(lanes: Lanes): boolean;
export declare function includesOnlyTransitions(lanes: Lanes): boolean;
export declare function claimNextTransitionLane(): Lane;
export declare function claimNextRetryLane(): Lane;
export declare function pickArbitraryLane(lanes: Lanes): Lane;
export declare function createLaneMap<T>(initial: T): LaneMap<T>;
export declare function markRootUpdated(root: {
    pendingLanes: Lanes;
    suspendedLanes: Lanes;
    pingedLanes: Lanes;
}, updateLane: Lane): void;
export declare function markRootFinished(root: {
    pendingLanes: Lanes;
    suspendedLanes: Lanes;
    pingedLanes: Lanes;
    entangledLanes: Lanes;
    expiredLanes: Lanes;
}, remainingLanes: Lanes): void;
export declare function getNextLanes(root: {
    pendingLanes: Lanes;
    suspendedLanes: Lanes;
    pingedLanes: Lanes;
}, wipLanes: Lanes): Lanes;
export declare function getEntangledLanes(root: {
    entangledLanes: Lanes;
    entanglements: LaneMap<Lanes>;
}, renderLanes: Lanes): Lanes;
export declare function markRootPinged(root: {
    pingedLanes: Lanes;
    suspendedLanes: Lanes;
}, pingedLanes: Lanes): void;
export declare function higherPriorityLane(a: Lane, b: Lane): Lane;
//# sourceMappingURL=ReactFiberLane.d.ts.map