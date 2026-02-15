// Worker Entry - Bootstrap for running React inside a Web Worker with worker-dom
// Receives worker-dom's Document and initializes a React root
import { createRoot } from './index.js';
import { WorkerDocumentImpl, createContainerNode, nodeMap, } from './bridge/worker-document.js';
import { WorkerEventRegistry, setupWorkerEventReceiver, } from './bridge/worker-events.js';
let root = null;
/**
 * Bootstrap with the bridge system (self-contained Worker-DOM mode).
 * Creates WorkerDocumentImpl, event registry, and wires up event receiver.
 * This is the preferred entry point for Worker-DOM rendering.
 */
export function bootstrapBridge(options) {
    const workerDocument = new WorkerDocumentImpl();
    const containerEl = createContainerNode();
    const eventRegistry = new WorkerEventRegistry();
    root = createRoot(workerDocument, containerEl, eventRegistry);
    const element = options.render(workerDocument);
    root.render(element);
    // Listen for events forwarded from the main thread
    setupWorkerEventReceiver(eventRegistry, nodeMap);
    return root;
}
// Called by worker-dom when the worker is initialized
// worker-dom provides a Document-like object that mirrors the main thread DOM
export function bootstrap(workerDocument, rootElement, options) {
    root = createRoot(workerDocument, rootElement);
    const element = options.render(workerDocument);
    root.render(element);
    return root;
}
// Re-render with new content
export function update(workerDocument, render) {
    if (root) {
        root.render(render(workerDocument));
    }
}
// Clean up
export function unmount() {
    if (root) {
        root.unmount();
        root = null;
    }
}
export { createRoot } from './index.js';
//# sourceMappingURL=worker-entry.js.map