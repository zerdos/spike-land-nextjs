// Worker-DOM Bridge - public API re-exports
// Worker-side virtual document
export { MutationCollector, WorkerNodeImpl, WorkerElementImpl, WorkerTextImpl, WorkerDocumentImpl, createContainerNode, nodeMap, } from './worker-document.js';
// Main-thread applier
export { MainThreadApplier } from './main-applier.js';
// Event serialization (main thread)
export { serializeEvent } from './event-serializer.js';
// Event dispatch (worker side)
export { WorkerEventRegistry, setupWorkerEventReceiver, } from './worker-events.js';
//# sourceMappingURL=index.js.map