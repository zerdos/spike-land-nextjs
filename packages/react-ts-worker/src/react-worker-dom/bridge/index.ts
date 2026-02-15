// Worker-DOM Bridge - public API re-exports

// Protocol types
export { MutationType } from './protocol.js';
export type {
  Mutation,
  MutationBatchMessage,
  EventMessage,
  WorkerToMainMessage,
  MainToWorkerMessage,
} from './protocol.js';

// Worker-side virtual document
export {
  MutationCollector,
  WorkerNodeImpl,
  WorkerElementImpl,
  WorkerTextImpl,
  WorkerDocumentImpl,
  createContainerNode,
  nodeMap,
} from './worker-document.js';

// Main-thread applier
export { MainThreadApplier } from './main-applier.js';

// Event serialization (main thread)
export { serializeEvent } from './event-serializer.js';

// Event dispatch (worker side)
export {
  WorkerEventRegistry,
  setupWorkerEventReceiver,
} from './worker-events.js';
export type { WorkerSyntheticEvent } from './worker-events.js';
