import type { ReactNode } from '../react/ReactTypes.js';
import type { WorkerDocument, WorkerElement } from '../host-config/WorkerDOMHostConfig.js';
import type { WorkerRoot } from './index.js';
export interface WorkerBootstrapOptions {
    render: (document: WorkerDocument) => ReactNode;
}
/**
 * Bootstrap with the bridge system (self-contained Worker-DOM mode).
 * Creates WorkerDocumentImpl, event registry, and wires up event receiver.
 * This is the preferred entry point for Worker-DOM rendering.
 */
export declare function bootstrapBridge(options: WorkerBootstrapOptions): WorkerRoot;
export declare function bootstrap(workerDocument: WorkerDocument, rootElement: WorkerElement, options: WorkerBootstrapOptions): WorkerRoot;
export declare function update(workerDocument: WorkerDocument, render: (document: WorkerDocument) => ReactNode): void;
export declare function unmount(): void;
export { createRoot } from './index.js';
//# sourceMappingURL=worker-entry.d.ts.map