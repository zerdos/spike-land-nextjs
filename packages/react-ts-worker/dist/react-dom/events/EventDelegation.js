// Event Delegation - Attach listeners at root container, walk fiber tree to dispatch
import { createSyntheticEvent } from './SyntheticEvent.js';
import { getReactNamesForNativeEvent, getAllNativeEvents, isNonBubblingEvent, } from './EventRegistry.js';
// We store the fiber on DOM nodes via this property
const FIBER_KEY = '__reactFiber$';
const PROPS_KEY = '__reactProps$';
export function setFiberOnNode(node, fiber) {
    node[FIBER_KEY] = fiber;
}
export function setPropsOnNode(node, props) {
    node[PROPS_KEY] = props;
}
function getFiberFromNode(node) {
    return node[FIBER_KEY] || null;
}
function getPropsFromNode(node) {
    return node[PROPS_KEY] || null;
}
function collectListeners(targetFiber, reactName, isCapture) {
    const listeners = [];
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
                        handler: handler,
                        currentTarget: fiber.stateNode,
                    });
                }
            }
        }
        fiber = fiber.return;
    }
    return listeners;
}
function dispatchEvent(nativeEventName, nativeEvent, _container) {
    const target = nativeEvent.target || nativeEvent.srcElement;
    if (!target)
        return;
    // Find the fiber for the target node
    let targetNode = target;
    let targetFiber = null;
    // Walk up from event target to find a node with a fiber
    while (targetNode !== null) {
        targetFiber = getFiberFromNode(targetNode);
        if (targetFiber !== null)
            break;
        targetNode = targetNode.parentNode;
    }
    // Get React event names for this native event
    const reactNames = getReactNamesForNativeEvent(nativeEventName);
    for (const reactName of reactNames) {
        const syntheticEvent = createSyntheticEvent(reactName, nativeEvent, target);
        // Capture phase - dispatch from root to target
        const captureListeners = collectListeners(targetFiber, reactName, true);
        for (let i = captureListeners.length - 1; i >= 0; i--) {
            if (syntheticEvent.isPropagationStopped())
                break;
            const { handler, currentTarget } = captureListeners[i];
            syntheticEvent.currentTarget = currentTarget;
            handler(syntheticEvent);
        }
        // Bubble phase - dispatch from target to root
        if (!syntheticEvent.isPropagationStopped()) {
            const bubbleListeners = collectListeners(targetFiber, reactName, false);
            for (let i = 0; i < bubbleListeners.length; i++) {
                if (syntheticEvent.isPropagationStopped())
                    break;
                const { handler, currentTarget } = bubbleListeners[i];
                syntheticEvent.currentTarget = currentTarget;
                handler(syntheticEvent);
            }
        }
        syntheticEvent.currentTarget = null;
    }
}
const listeningContainers = new WeakSet();
export function listenToAllSupportedEvents(container) {
    if (listeningContainers.has(container))
        return;
    listeningContainers.add(container);
    const allNativeEvents = getAllNativeEvents();
    for (const nativeEventName of allNativeEvents) {
        const useCapture = isNonBubblingEvent(nativeEventName);
        container.addEventListener(nativeEventName, (nativeEvent) => {
            dispatchEvent(nativeEventName, nativeEvent, container);
        }, useCapture);
        // Also listen in capture phase for bubbling events
        if (!useCapture) {
            container.addEventListener(nativeEventName, (nativeEvent) => {
                dispatchEvent(nativeEventName, nativeEvent, container);
            }, true);
        }
    }
}
//# sourceMappingURL=EventDelegation.js.map