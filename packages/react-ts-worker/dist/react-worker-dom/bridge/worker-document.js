// Worker-side virtual DOM implementation.
// Creates lightweight WorkerElement / WorkerText nodes that record mutations
// and flush them to the main thread via postMessage in a microtask batch.
// ---- Global state ----
let nextNodeId = 1; // 0 is reserved for the container
export const nodeMap = new Map();
// ---- Mutation collector ----
export class MutationCollector {
    queue = [];
    scheduled = false;
    record(mutation) {
        this.queue.push(mutation);
        if (!this.scheduled) {
            this.scheduled = true;
            queueMicrotask(() => this.flush());
        }
    }
    flush() {
        this.scheduled = false;
        if (this.queue.length === 0)
            return;
        const batch = {
            kind: 'mutations',
            mutations: this.queue,
        };
        this.queue = [];
        self.postMessage(batch);
    }
}
// Shared collector instance
const collector = new MutationCollector();
// ---- WorkerNode base ----
export class WorkerNodeImpl {
    __nodeId;
    parentNode = null;
    _children = [];
    constructor(id) {
        this.__nodeId = id ?? nextNodeId++;
        nodeMap.set(this.__nodeId, this);
    }
    get childNodes() {
        return this._children;
    }
    get textContent() {
        return this._children.map((c) => c.textContent ?? '').join('');
    }
    set textContent(value) {
        // Remove all children
        while (this._children.length > 0) {
            this.removeChild(this._children[this._children.length - 1]);
        }
        collector.record({
            type: 9 /* MutationType.SET_TEXT_CONTENT */,
            targetId: this.__nodeId,
            value: value ?? '',
        });
    }
    appendChild(child) {
        const impl = child;
        // Remove from old parent if needed
        if (impl.parentNode) {
            impl.parentNode.removeChildInternal(impl);
        }
        this._children.push(impl);
        impl.parentNode = this;
        collector.record({
            type: 2 /* MutationType.APPEND_CHILD */,
            targetId: impl.__nodeId,
            parentId: this.__nodeId,
        });
    }
    insertBefore(child, before) {
        const impl = child;
        const beforeImpl = before;
        if (impl.parentNode) {
            impl.parentNode.removeChildInternal(impl);
        }
        const idx = this._children.indexOf(beforeImpl);
        if (idx === -1) {
            this._children.push(impl);
        }
        else {
            this._children.splice(idx, 0, impl);
        }
        impl.parentNode = this;
        collector.record({
            type: 3 /* MutationType.INSERT_BEFORE */,
            targetId: impl.__nodeId,
            parentId: this.__nodeId,
            refId: beforeImpl.__nodeId,
        });
    }
    removeChild(child) {
        const impl = child;
        this.removeChildInternal(impl);
        collector.record({
            type: 4 /* MutationType.REMOVE_CHILD */,
            targetId: impl.__nodeId,
            parentId: this.__nodeId,
        });
    }
    /** Internal removal without recording a mutation (used when moving nodes). */
    removeChildInternal(child) {
        const idx = this._children.indexOf(child);
        if (idx !== -1) {
            this._children.splice(idx, 1);
        }
        child.parentNode = null;
    }
}
// ---- WorkerElement ----
export class WorkerElementImpl extends WorkerNodeImpl {
    tagName;
    namespaceURI;
    style;
    constructor(tagName, namespaceURI = null) {
        super();
        this.tagName = tagName.toUpperCase();
        this.namespaceURI = namespaceURI;
        // Style proxy that records SET_STYLE mutations
        const nodeId = this.__nodeId;
        const backing = {};
        this.style = new Proxy(backing, {
            set(_target, prop, value) {
                _target[prop] = value;
                collector.record({
                    type: 7 /* MutationType.SET_STYLE */,
                    targetId: nodeId,
                    name: prop,
                    value: String(value),
                });
                return true;
            },
            get(target, prop) {
                return target[prop] ?? '';
            },
        });
    }
    setAttribute(name, value) {
        collector.record({
            type: 5 /* MutationType.SET_ATTRIBUTE */,
            targetId: this.__nodeId,
            name,
            value,
        });
    }
    removeAttribute(name) {
        collector.record({
            type: 6 /* MutationType.REMOVE_ATTRIBUTE */,
            targetId: this.__nodeId,
            name,
        });
    }
}
// ---- WorkerText ----
export class WorkerTextImpl extends WorkerNodeImpl {
    _data;
    constructor(text) {
        super();
        this._data = text;
    }
    get data() {
        return this._data;
    }
    set data(value) {
        this._data = value;
        collector.record({
            type: 8 /* MutationType.SET_TEXT */,
            targetId: this.__nodeId,
            value,
        });
    }
    get nodeValue() {
        return this._data;
    }
    set nodeValue(value) {
        this.data = value ?? '';
    }
    get textContent() {
        return this._data;
    }
    set textContent(value) {
        this.data = value ?? '';
    }
}
// ---- WorkerDocument ----
export class WorkerDocumentImpl {
    createElement(type) {
        const el = new WorkerElementImpl(type);
        collector.record({
            type: 0 /* MutationType.CREATE_ELEMENT */,
            targetId: el.__nodeId,
            tagName: type,
        });
        return el;
    }
    createElementNS(namespace, type) {
        const el = new WorkerElementImpl(type, namespace);
        collector.record({
            type: 10 /* MutationType.CREATE_ELEMENT_NS */,
            targetId: el.__nodeId,
            tagName: type,
            namespace,
        });
        return el;
    }
    createTextNode(text) {
        const node = new WorkerTextImpl(text);
        collector.record({
            type: 1 /* MutationType.CREATE_TEXT */,
            targetId: node.__nodeId,
            value: text,
        });
        return node;
    }
}
// Pre-register a container root node with id 0 so the main-thread applier
// and worker agree on the container identity.
export function createContainerNode() {
    const container = new WorkerElementImpl('DIV');
    // Override the auto-generated id — constructor already called super()
    // so we re-register under id 0.
    nodeMap.delete(container.__nodeId);
    Object.defineProperty(container, '__nodeId', { value: 0 });
    nodeMap.set(0, container);
    return container;
}
//# sourceMappingURL=worker-document.js.map