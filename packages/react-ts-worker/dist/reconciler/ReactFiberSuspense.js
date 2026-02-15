import { SuspenseComponent } from './ReactWorkTags.js';
// Find the nearest Suspense boundary above this fiber
export function findNearestSuspenseBoundary(fiber) {
    let node = fiber.return;
    while (node !== null) {
        if (node.tag === SuspenseComponent) {
            return node;
        }
        node = node.return;
    }
    return null;
}
// Check if a Suspense boundary is showing fallback content
export function isSuspenseBoundaryShowingFallback(fiber) {
    const memoizedState = fiber.memoizedState;
    return memoizedState !== null;
}
// Get the primary child fragment from a Suspense boundary
export function getSuspensePrimaryChild(fiber) {
    return fiber.child;
}
// Get the fallback child fragment from a Suspense boundary
export function getSuspenseFallbackChild(fiber) {
    const primaryChild = fiber.child;
    if (primaryChild !== null) {
        return primaryChild.sibling;
    }
    return null;
}
// Create the initial Suspense state
export function mountSuspenseState() {
    return {
        dehydrated: null,
        retryLane: 0,
    };
}
// Check if a thrown value is a thenable (Promise-like)
export function isThenable(value) {
    return (typeof value === 'object' &&
        value !== null &&
        typeof value.then === 'function');
}
//# sourceMappingURL=ReactFiberSuspense.js.map