// DOM Host Config - implements HostConfig interface for browser DOM rendering
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
// Properties that should be set as DOM properties rather than attributes
const PROP_TO_ATTRIBUTE = {
    className: 'class',
    htmlFor: 'for',
    httpEquiv: 'http-equiv',
    acceptCharset: 'accept-charset',
};
// Boolean attributes
const BOOLEAN_ATTRS = new Set([
    'checked', 'disabled', 'hidden', 'multiple', 'readOnly', 'required',
    'selected', 'autoFocus', 'autoPlay', 'controls', 'default', 'defer',
    'formNoValidate', 'loop', 'muted', 'noModule', 'noValidate', 'open',
    'playsInline', 'reversed', 'scoped', 'seamless', 'allowFullScreen',
    'async', 'autofocus',
]);
function setInitialProperties(domElement, type, props) {
    for (const propKey in props) {
        if (!props.hasOwnProperty(propKey))
            continue;
        const propValue = props[propKey];
        if (propValue == null)
            continue;
        if (propKey === 'children') {
            if (typeof propValue === 'string' || typeof propValue === 'number') {
                domElement.textContent = String(propValue);
            }
        }
        else if (propKey === 'style') {
            setStyles(domElement, propValue);
        }
        else if (propKey === 'innerHTML') {
            // React's dangerouslySetInnerHTML.__html maps to this
            domElement.innerHTML = propValue;
        }
        else if (propKey === 'ref' || propKey === 'key') {
            // Skip
        }
        else if (propKey.startsWith('on')) {
            // Event listeners handled by event delegation
        }
        else {
            setAttribute(domElement, propKey, propValue);
        }
    }
}
function updateProperties(domElement, type, oldProps, newProps) {
    // Remove old props
    for (const propKey in oldProps) {
        if (propKey === 'children' || propKey === 'key' || propKey === 'ref')
            continue;
        if (newProps.hasOwnProperty(propKey))
            continue;
        if (propKey === 'style') {
            const style = domElement.style;
            const oldStyle = oldProps[propKey];
            if (oldStyle) {
                for (const styleName in oldStyle) {
                    style.setProperty(styleName, '');
                }
            }
        }
        else if (propKey.startsWith('on')) {
            // Event cleanup handled by event delegation
        }
        else {
            domElement.removeAttribute(PROP_TO_ATTRIBUTE[propKey] || propKey);
        }
    }
    // Set new props
    for (const propKey in newProps) {
        if (propKey === 'key' || propKey === 'ref')
            continue;
        const newValue = newProps[propKey];
        const oldValue = oldProps[propKey];
        if (newValue === oldValue)
            continue;
        if (propKey === 'children') {
            if (typeof newValue === 'string' || typeof newValue === 'number') {
                domElement.textContent = String(newValue);
            }
        }
        else if (propKey === 'style') {
            setStyles(domElement, newValue, oldProps.style);
        }
        else if (propKey.startsWith('on')) {
            // Event listeners handled by event delegation
        }
        else {
            if (newValue == null) {
                domElement.removeAttribute(PROP_TO_ATTRIBUTE[propKey] || propKey);
            }
            else {
                setAttribute(domElement, propKey, newValue);
            }
        }
    }
}
function setAttribute(domElement, key, value) {
    const attrName = PROP_TO_ATTRIBUTE[key] || key;
    if (BOOLEAN_ATTRS.has(key)) {
        if (value) {
            domElement.setAttribute(attrName, '');
        }
        else {
            domElement.removeAttribute(attrName);
        }
    }
    else if (key === 'value') {
        // Special handling for value property on input/select/textarea
        domElement.value = value == null ? '' : String(value);
    }
    else {
        domElement.setAttribute(attrName, String(value));
    }
}
function setStyles(element, newStyles, oldStyles) {
    const style = element.style;
    // Remove old styles
    if (oldStyles) {
        for (const key in oldStyles) {
            if (!newStyles || !newStyles.hasOwnProperty(key)) {
                if (key.indexOf('-') > -1) {
                    style.removeProperty(key);
                }
                else {
                    style[key] = '';
                }
            }
        }
    }
    // Set new styles
    if (newStyles) {
        for (const key in newStyles) {
            const value = newStyles[key];
            if (key.indexOf('-') > -1) {
                style.setProperty(key, value == null ? '' : String(value));
            }
            else {
                style[key] = value == null ? '' : String(value);
            }
        }
    }
}
export const DOMHostConfig = {
    supportsMutation: true,
    isPrimaryRenderer: true,
    createInstance(type, props, rootContainer, hostContext) {
        let domElement;
        if (hostContext.namespace === SVG_NAMESPACE) {
            domElement = document.createElementNS(SVG_NAMESPACE, type);
        }
        else if (hostContext.namespace === MATH_NAMESPACE) {
            domElement = document.createElementNS(MATH_NAMESPACE, type);
        }
        else if (props.is) {
            domElement = document.createElement(type, { is: props.is });
        }
        else {
            domElement = document.createElement(type);
        }
        setInitialProperties(domElement, type, props);
        return domElement;
    },
    createTextInstance(text, _rootContainer, _hostContext) {
        return document.createTextNode(text);
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
    commitUpdate(instance, type, oldProps, newProps) {
        updateProperties(instance, type, oldProps, newProps);
    },
    commitTextUpdate(textInstance, _oldText, newText) {
        textInstance.nodeValue = newText;
    },
    resetTextContent(instance) {
        instance.textContent = '';
    },
    shouldSetTextContent(type, props) {
        return (type === 'textarea' ||
            type === 'noscript' ||
            typeof props.children === 'string' ||
            typeof props.children === 'number' ||
            typeof props.children === 'bigint');
    },
    getRootHostContext(_rootContainer) {
        return { namespace: '' };
    },
    getChildHostContext(parentHostContext, type) {
        if (type === 'svg') {
            return { namespace: SVG_NAMESPACE };
        }
        if (type === 'math') {
            return { namespace: MATH_NAMESPACE };
        }
        if (parentHostContext.namespace === SVG_NAMESPACE && type === 'foreignObject') {
            return { namespace: '' };
        }
        return parentHostContext;
    },
    prepareForCommit(_container) {
        return null;
    },
    resetAfterCommit(_container) { },
    finalizeInitialChildren(_instance, _type, props, _hostContext) {
        return !!props.autoFocus;
    },
    prepareUpdate(_instance, _type, oldProps, newProps, _hostContext) {
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
export default DOMHostConfig;
//# sourceMappingURL=DOMHostConfig.js.map