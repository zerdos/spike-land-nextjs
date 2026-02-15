// Worker-side event dispatch.
// Receives TransferrableEventData from the main thread, resolves the target
// virtual node, and dispatches through the React handler chain (bubble phase).
function createSyntheticEvent(data, target) {
    const event = {
        type: data.type,
        bubbles: data.bubbles,
        cancelable: data.cancelable,
        target,
        currentTarget: null,
        timeStamp: data.timeStamp,
        clientX: data.clientX ?? 0,
        clientY: data.clientY ?? 0,
        pageX: data.pageX ?? 0,
        pageY: data.pageY ?? 0,
        button: data.button ?? 0,
        buttons: data.buttons ?? 0,
        key: data.key ?? '',
        code: data.code ?? '',
        keyCode: data.keyCode ?? 0,
        charCode: data.charCode ?? 0,
        which: data.which ?? 0,
        ctrlKey: data.ctrlKey ?? false,
        shiftKey: data.shiftKey ?? false,
        altKey: data.altKey ?? false,
        metaKey: data.metaKey ?? false,
        targetValue: data.targetValue,
        defaultPrevented: false,
        propagationStopped: false,
        preventDefault() {
            this.defaultPrevented = true;
        },
        stopPropagation() {
            this.propagationStopped = true;
        },
    };
    return event;
}
/** Converts a React prop name like "onClick" to the DOM event name "click". */
function propToEventName(propName) {
    if (!propName.startsWith('on') || propName.length <= 2)
        return null;
    // "onClick" -> "click", "onMouseDown" -> "mousedown"
    return propName.charAt(2).toLowerCase() + propName.slice(3).toLowerCase();
}
export class WorkerEventRegistry {
    // nodeId -> eventName -> handler
    handlers = new Map();
    setHandler(nodeId, reactPropName, handler) {
        const eventName = propToEventName(reactPropName);
        if (!eventName)
            return;
        let nodeHandlers = this.handlers.get(nodeId);
        if (!nodeHandlers) {
            nodeHandlers = new Map();
            this.handlers.set(nodeId, nodeHandlers);
        }
        nodeHandlers.set(eventName, handler);
    }
    removeHandler(nodeId, reactPropName) {
        const eventName = propToEventName(reactPropName);
        if (!eventName)
            return;
        const nodeHandlers = this.handlers.get(nodeId);
        if (!nodeHandlers)
            return;
        nodeHandlers.delete(eventName);
        if (nodeHandlers.size === 0) {
            this.handlers.delete(nodeId);
        }
    }
    dispatch(data, nodeMap) {
        const targetNode = nodeMap.get(data.target) ?? null;
        const syntheticEvent = createSyntheticEvent(data, targetNode);
        // Walk from target up the parent chain (bubble phase)
        let current = targetNode;
        while (current && !syntheticEvent.propagationStopped) {
            const nodeId = current.__nodeId;
            const nodeHandlers = this.handlers.get(nodeId);
            if (nodeHandlers) {
                const handler = nodeHandlers.get(data.type);
                if (handler) {
                    syntheticEvent.currentTarget = current;
                    handler(syntheticEvent);
                }
            }
            current = current.parentNode;
        }
    }
}
/** Sets up the worker's onmessage to dispatch incoming events. */
export function setupWorkerEventReceiver(registry, nodeMap) {
    self.addEventListener('message', (ev) => {
        if (ev.data.kind === 'event') {
            registry.dispatch(ev.data.event, nodeMap);
        }
    });
}
//# sourceMappingURL=worker-events.js.map