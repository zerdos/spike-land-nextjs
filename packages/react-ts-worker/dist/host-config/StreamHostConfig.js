// Stream Host Config - lightweight virtual nodes for SSR string generation
// Used by the Fizz server renderer
export const StreamHostConfig = {
    supportsMutation: true,
    isPrimaryRenderer: false,
    createInstance(type, props, _rootContainer, _hostContext) {
        return { type, props, children: [] };
    },
    createTextInstance(text, _rootContainer, _hostContext) {
        return { text };
    },
    appendChild(parent, child) {
        parent.children.push(child);
    },
    appendChildToContainer(container, child) {
        container.children.push(child);
    },
    appendInitialChild(parent, child) {
        parent.children.push(child);
    },
    insertBefore(parent, child, before) {
        const index = parent.children.indexOf(before);
        if (index >= 0) {
            parent.children.splice(index, 0, child);
        }
        else {
            parent.children.push(child);
        }
    },
    insertInContainerBefore(container, child, before) {
        const index = container.children.indexOf(before);
        if (index >= 0) {
            container.children.splice(index, 0, child);
        }
        else {
            container.children.push(child);
        }
    },
    removeChild(parent, child) {
        const index = parent.children.indexOf(child);
        if (index >= 0) {
            parent.children.splice(index, 1);
        }
    },
    removeChildFromContainer(container, child) {
        const index = container.children.indexOf(child);
        if (index >= 0) {
            container.children.splice(index, 1);
        }
    },
    commitUpdate(instance, _type, _oldProps, newProps) {
        instance.props = newProps;
    },
    commitTextUpdate(textInstance, _oldText, newText) {
        textInstance.text = newText;
    },
    resetTextContent(instance) {
        instance.children = [];
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
            return { namespace: 'svg' };
        if (type === 'math')
            return { namespace: 'math' };
        if (parentHostContext.namespace === 'svg' && type === 'foreignObject') {
            return { namespace: '' };
        }
        return parentHostContext;
    },
    prepareForCommit() {
        return null;
    },
    resetAfterCommit() { },
    finalizeInitialChildren() {
        return false;
    },
    prepareUpdate() {
        return true;
    },
    clearContainer(container) {
        container.children = [];
    },
    getCurrentTime() {
        return typeof performance !== 'undefined' ? performance.now() : Date.now();
    },
    scheduleMicrotask(fn) {
        queueMicrotask(fn);
    },
};
export default StreamHostConfig;
//# sourceMappingURL=StreamHostConfig.js.map