// Event Delegation - Attach listeners at root container, walk fiber tree to dispatch

import { createSyntheticEvent } from './SyntheticEvent.js';
import {
  getReactNamesForNativeEvent,
  getAllNativeEvents,
  isNonBubblingEvent,
} from './EventRegistry.js';

// We store the fiber on DOM nodes via this property
const FIBER_KEY = '__reactFiber$';
const PROPS_KEY = '__reactProps$';

// Internal fiber type - minimal interface needed for event dispatch
interface MinimalFiber {
  tag: number;
  stateNode: any;
  return: MinimalFiber | null;
  memoizedProps: Record<string, any> | null;
}

export function setFiberOnNode(node: Node, fiber: any): void {
  (node as any)[FIBER_KEY] = fiber;
}

export function setPropsOnNode(node: Node, props: Record<string, any>): void {
  (node as any)[PROPS_KEY] = props;
}

function getFiberFromNode(node: Node): MinimalFiber | null {
  return (node as any)[FIBER_KEY] || null;
}

function getPropsFromNode(node: Node): Record<string, any> | null {
  return (node as any)[PROPS_KEY] || null;
}

// Collect all React event listeners along the fiber path (from target to root)
interface DispatchListener {
  fiber: MinimalFiber;
  handler: (event: any) => void;
  currentTarget: EventTarget;
}

function collectListeners(
  targetFiber: MinimalFiber | null,
  reactName: string,
  isCapture: boolean,
): DispatchListener[] {
  const listeners: DispatchListener[] = [];
  let fiber = targetFiber;

  while (fiber !== null) {
    // Only HostComponent fibers (tag=5) have DOM nodes with event props
    if (fiber.tag === 5 && fiber.stateNode) {
      const props = getPropsFromNode(fiber.stateNode) || fiber.memoizedProps;
      if (props) {
        const propName = isCapture ? reactName + 'Capture' : reactName;
        const handler = props[propName];
        if (typeof handler === 'function') {
          listeners.push({
            fiber,
            handler,
            currentTarget: fiber.stateNode,
          });
        }
      }
    }
    fiber = fiber.return;
  }

  return listeners;
}

function dispatchEvent(
  nativeEventName: string,
  nativeEvent: Event,
  container: Element,
): void {
  const target = nativeEvent.target || nativeEvent.srcElement;
  if (!target) return;

  // Find the fiber for the target node
  let targetNode: Node | null = target as Node;
  let targetFiber: MinimalFiber | null = null;

  // Walk up from event target to find a node with a fiber
  while (targetNode !== null) {
    targetFiber = getFiberFromNode(targetNode);
    if (targetFiber !== null) break;
    targetNode = targetNode.parentNode;
  }

  // Get React event names for this native event
  const reactNames = getReactNamesForNativeEvent(nativeEventName);

  for (const reactName of reactNames) {
    const syntheticEvent = createSyntheticEvent(
      reactName,
      nativeEvent,
      target,
    );

    // Capture phase - dispatch from root to target
    const captureListeners = collectListeners(targetFiber, reactName, true);
    for (let i = captureListeners.length - 1; i >= 0; i--) {
      if (syntheticEvent.isPropagationStopped()) break;
      const { handler, currentTarget } = captureListeners[i];
      syntheticEvent.currentTarget = currentTarget;
      handler(syntheticEvent);
    }

    // Bubble phase - dispatch from target to root
    if (!syntheticEvent.isPropagationStopped()) {
      const bubbleListeners = collectListeners(targetFiber, reactName, false);
      for (let i = 0; i < bubbleListeners.length; i++) {
        if (syntheticEvent.isPropagationStopped()) break;
        const { handler, currentTarget } = bubbleListeners[i];
        syntheticEvent.currentTarget = currentTarget;
        handler(syntheticEvent);
      }
    }

    syntheticEvent.currentTarget = null;
  }
}

const listeningContainers = new WeakSet<Element>();

export function listenToAllSupportedEvents(container: Element): void {
  if (listeningContainers.has(container)) return;
  listeningContainers.add(container);

  const allNativeEvents = getAllNativeEvents();

  for (const nativeEventName of allNativeEvents) {
    const useCapture = isNonBubblingEvent(nativeEventName);

    container.addEventListener(
      nativeEventName,
      (nativeEvent: Event) => {
        dispatchEvent(nativeEventName, nativeEvent, container);
      },
      useCapture,
    );

    // Also listen in capture phase for bubbling events
    if (!useCapture) {
      container.addEventListener(
        nativeEventName,
        (nativeEvent: Event) => {
          dispatchEvent(nativeEventName, nativeEvent, container);
        },
        true,
      );
    }
  }
}
