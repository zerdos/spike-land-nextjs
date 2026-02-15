// Main-thread DOM applier.
// Receives MutationBatch messages from the worker, creates real DOM nodes,
// and forwards captured user events back to the worker.
import { CAPTURED_EVENTS } from '../events.js';
import { serializeEvent } from './event-serializer.js';
export class MainThreadApplier {
    container;
    worker;
    nodeMap = new Map();
    reverseMap = new WeakMap();
    eventAbortController = new AbortController();
    constructor(container, workerBlobUrl) {
        this.container = container;
        // Pre-register the container as node 0
        this.nodeMap.set(0, container);
        this.reverseMap.set(container, 0);
        this.worker = new Worker(workerBlobUrl, { type: 'module' });
        this.worker.onmessage = (ev) => {
            if (ev.data.kind === 'mutations') {
                for (const mut of ev.data.mutations) {
                    this.applyMutation(mut);
                }
            }
        };
        this.setupEventCapture();
    }
    applyMutation(mut) {
        switch (mut.type) {
            case 0 /* MutationType.CREATE_ELEMENT */: {
                const el = document.createElement(mut.tagName);
                this.register(mut.targetId, el);
                break;
            }
            case 10 /* MutationType.CREATE_ELEMENT_NS */: {
                const el = document.createElementNS(mut.namespace, mut.tagName);
                this.register(mut.targetId, el);
                break;
            }
            case 1 /* MutationType.CREATE_TEXT */: {
                const text = document.createTextNode(mut.value ?? '');
                this.register(mut.targetId, text);
                break;
            }
            case 2 /* MutationType.APPEND_CHILD */: {
                const parent = this.nodeMap.get(mut.parentId);
                const child = this.nodeMap.get(mut.targetId);
                if (parent && child)
                    parent.appendChild(child);
                break;
            }
            case 3 /* MutationType.INSERT_BEFORE */: {
                const parent = this.nodeMap.get(mut.parentId);
                const child = this.nodeMap.get(mut.targetId);
                const ref = this.nodeMap.get(mut.refId);
                if (parent && child)
                    parent.insertBefore(child, ref ?? null);
                break;
            }
            case 4 /* MutationType.REMOVE_CHILD */: {
                const parent = this.nodeMap.get(mut.parentId);
                const child = this.nodeMap.get(mut.targetId);
                if (parent && child && child.parentNode === parent) {
                    parent.removeChild(child);
                }
                break;
            }
            case 5 /* MutationType.SET_ATTRIBUTE */: {
                const el = this.nodeMap.get(mut.targetId);
                if (el && el instanceof Element) {
                    el.setAttribute(mut.name, mut.value);
                }
                break;
            }
            case 6 /* MutationType.REMOVE_ATTRIBUTE */: {
                const el = this.nodeMap.get(mut.targetId);
                if (el && el instanceof Element) {
                    el.removeAttribute(mut.name);
                }
                break;
            }
            case 7 /* MutationType.SET_STYLE */: {
                const el = this.nodeMap.get(mut.targetId);
                if (el && el instanceof HTMLElement) {
                    el.style.setProperty(mut.name, mut.value);
                }
                break;
            }
            case 8 /* MutationType.SET_TEXT */: {
                const node = this.nodeMap.get(mut.targetId);
                if (node && node instanceof Text) {
                    node.data = mut.value ?? '';
                }
                break;
            }
            case 9 /* MutationType.SET_TEXT_CONTENT */: {
                const node = this.nodeMap.get(mut.targetId);
                if (node) {
                    node.textContent = mut.value ?? '';
                }
                break;
            }
        }
    }
    register(id, node) {
        this.nodeMap.set(id, node);
        this.reverseMap.set(node, id);
    }
    setupEventCapture() {
        const signal = this.eventAbortController.signal;
        for (const eventName of CAPTURED_EVENTS) {
            this.container.addEventListener(eventName, (nativeEvent) => {
                const target = nativeEvent.target;
                const targetId = target ? (this.reverseMap.get(target) ?? 0) : 0;
                const data = serializeEvent(nativeEvent, targetId);
                const msg = { kind: 'event', event: data };
                this.worker.postMessage(msg);
            }, { capture: true, signal });
        }
    }
    destroy() {
        this.worker.terminate();
        this.eventAbortController.abort();
        this.nodeMap.clear();
    }
}
//# sourceMappingURL=main-applier.js.map