import type { ReactNode } from '../react/ReactTypes.js';
import type { WorkerDocument, WorkerElement } from '../host-config/WorkerDOMHostConfig.js';
import type { WorkerEventRegistry } from './bridge/worker-events.js';
export interface WorkerRoot {
    render(children: ReactNode): void;
    unmount(): void;
}
export declare function createRoot(workerDocument: WorkerDocument, containerElement: WorkerElement, eventRegistry?: WorkerEventRegistry): WorkerRoot;
//# sourceMappingURL=index.d.ts.map