// Worker-DOM Host Config
// Uses worker-dom's Document/Element/Text classes directly.
// Worker-dom auto-batches mutations via MutationTransfer.transfer() -> postMessage to main thread.
const PROP_TO_ATTRIBUTE = {
    className: 'class',
    htmlFor: 'for',
    httpEquiv: 'http-equiv',
    acceptCharset: 'accept-charset',
};
const BOOLEAN_ATTRS = new Set([
    'checked', 'disabled', 'hidden', 'multiple', 'readOnly', 'required',
    'selected', 'autoFocus', 'autoPlay', 'controls',
]);
function setWorkerProps(element, props, eventRegistry) {
    for (const key in props) {
        if (!props.hasOwnProperty(key))
            continue;
        const value = props[key];
        if (value == null || key === 'children' || key === 'key' || key === 'ref')
            continue;
        if (key === 'style') {
            if (typeof value === 'object') {
                for (const styleProp in value) {
                    element.style[styleProp] = value[styleProp] == null ? '' : String(value[styleProp]);
                }
            }
        }
        else if (key.startsWith('on')) {
            // Register event handler with the worker event bridge
            if (typeof value === 'function' && eventRegistry && '__nodeId' in element) {
                eventRegistry.setHandler(element.__nodeId, key, value);
            }
        }
        else {
            const attrName = PROP_TO_ATTRIBUTE[key] || key;
            if (BOOLEAN_ATTRS.has(key)) {
                if (value) {
                    element.setAttribute(attrName, '');
                }
                else {
                    element.removeAttribute(attrName);
                }
            }
            else {
                element.setAttribute(attrName, String(value));
            }
        }
    }
}
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
export function createWorkerDOMHostConfig(workerDocument, eventRegistry) {
    return {
        supportsMutation: true,
        isPrimaryRenderer: true,
        createInstance(type, props, _rootContainer, hostContext) {
            let element;
            if (hostContext.namespace === SVG_NAMESPACE) {
                element = workerDocument.createElementNS(SVG_NAMESPACE, type);
            }
            else if (hostContext.namespace === MATH_NAMESPACE) {
                element = workerDocument.createElementNS(MATH_NAMESPACE, type);
            }
            else {
                element = workerDocument.createElement(type);
            }
            setWorkerProps(element, props, eventRegistry);
            return element;
        },
        createTextInstance(text, _rootContainer, _hostContext) {
            return workerDocument.createTextNode(text);
        },
        appendChild(parent, child) {
            parent.appendChild(child);
        },
        appendChildToContainer(container, child) {
            container.appendChild(child);
        },
        appendInitialChild(parent, child) {
            parent.appendChild(child);
        },
        insertBefore(parent, child, before) {
            parent.insertBefore(child, before);
        },
        insertInContainerBefore(container, child, before) {
            container.insertBefore(child, before);
        },
        removeChild(parent, child) {
            parent.removeChild(child);
        },
        removeChildFromContainer(container, child) {
            container.removeChild(child);
        },
        commitUpdate(instance, _type, oldProps, newProps) {
            for (const key in oldProps) {
                if (key === 'children' || key === 'key' || key === 'ref')
                    continue;
                if (newProps.hasOwnProperty(key))
                    continue;
                if (key.startsWith('on')) {
                    // Remove old event handler
                    if (eventRegistry && '__nodeId' in instance) {
                        eventRegistry.removeHandler(instance.__nodeId, key);
                    }
                    continue;
                }
                const attrName = PROP_TO_ATTRIBUTE[key] || key;
                instance.removeAttribute(attrName);
            }
            setWorkerProps(instance, newProps, eventRegistry);
        },
        commitTextUpdate(textInstance, _oldText, newText) {
            textInstance.data = newText;
        },
        resetTextContent(instance) {
            instance.textContent = '';
        },
        shouldSetTextContent(_type, props) {
            return (typeof props.children === 'string' ||
                typeof props.children === 'number');
        },
        getRootHostContext(_rootContainer) {
            return { namespace: '' };
        },
        getChildHostContext(parentHostContext, type) {
            if (type === 'svg')
                return { namespace: SVG_NAMESPACE };
            if (type === 'math')
                return { namespace: MATH_NAMESPACE };
            if (parentHostContext.namespace === SVG_NAMESPACE && type === 'foreignObject') {
                return { namespace: '' };
            }
            return parentHostContext;
        },
        prepareForCommit() {
            return null;
        },
        resetAfterCommit() {
            // Worker-dom auto-flushes mutations via microtask
        },
        finalizeInitialChildren() {
            return false;
        },
        prepareUpdate(_instance, _type, oldProps, newProps) {
            for (const key in oldProps) {
                if (key === 'children' || key === 'key' || key === 'ref')
                    continue;
                if (oldProps[key] !== newProps[key])
                    return true;
            }
            for (const key in newProps) {
                if (key === 'children' || key === 'key' || key === 'ref')
                    continue;
                if (!(key in oldProps))
                    return true;
            }
            return null;
        },
        clearContainer(container) {
            container.textContent = '';
        },
        getCurrentTime() {
            return performance.now();
        },
        scheduleMicrotask(fn) {
            queueMicrotask(fn);
        },
    };
}
export default createWorkerDOMHostConfig;
//# sourceMappingURL=WorkerDOMHostConfig.js.map