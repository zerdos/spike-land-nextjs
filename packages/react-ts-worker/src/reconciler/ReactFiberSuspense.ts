import type { Fiber } from './ReactFiberTypes.js';
import type { Lanes } from './ReactFiberLane.js';
import { SuspenseComponent } from './ReactWorkTags.js';

export interface SuspenseState {
  dehydrated: unknown;
  retryLane: Lanes;
}

// Find the nearest Suspense boundary above this fiber
export function findNearestSuspenseBoundary(
  fiber: Fiber,
): Fiber | null {
  let node: Fiber | null = fiber.return;
  while (node !== null) {
    if (node.tag === SuspenseComponent) {
      return node;
    }
    node = node.return;
  }
  return null;
}

// Check if a Suspense boundary is showing fallback content
export function isSuspenseBoundaryShowingFallback(
  fiber: Fiber,
): boolean {
  const memoizedState: SuspenseState | null = fiber.memoizedState;
  return memoizedState !== null;
}

// Get the primary child fragment from a Suspense boundary
export function getSuspensePrimaryChild(fiber: Fiber): Fiber | null {
  return fiber.child;
}

// Get the fallback child fragment from a Suspense boundary
export function getSuspenseFallbackChild(fiber: Fiber): Fiber | null {
  const primaryChild = fiber.child;
  if (primaryChild !== null) {
    return primaryChild.sibling;
  }
  return null;
}

// Create the initial Suspense state
export function mountSuspenseState(): SuspenseState {
  return {
    dehydrated: null,
    retryLane: 0,
  };
}

// Interface for thrown objects that represent a suspense boundary
export interface SuspenseException {
  then(onFulfill: () => void, onReject: () => void): void;
}

// Check if a thrown value is a thenable (Promise-like)
export function isThenable(value: unknown): value is SuspenseException {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.then === 'function'
  );
}
