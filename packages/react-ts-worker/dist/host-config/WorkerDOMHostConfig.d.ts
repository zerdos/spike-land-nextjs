import type { HostConfig } from './HostConfigInterface.js';
import type { WorkerEventRegistry } from '../react-worker-dom/bridge/worker-events.js';
export interface WorkerDocument {
    createElement(type: string): WorkerElement;
    createElementNS(namespace: string, type: string): WorkerElement;
    createTextNode(text: string): WorkerText;
}
export interface WorkerNode {
    appendChild(child: WorkerNode): void;
    insertBefore(child: WorkerNode, before: WorkerNode): void;
    removeChild(child: WorkerNode): void;
    textContent: string | null;
    parentNode: WorkerNode | null;
    childNodes: ArrayLike<WorkerNode>;
}
export interface WorkerElement extends WorkerNode {
    tagName: string;
    namespaceURI: string | null;
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
    style: Record<string, string>;
}
export interface WorkerText extends WorkerNode {
    data: string;
    nodeValue: string | null;
}
interface WorkerHostContext {
    namespace: string;
}
export declare function createWorkerDOMHostConfig(workerDocument: WorkerDocument, eventRegistry?: WorkerEventRegistry): HostConfig<string, Record<string, any>, WorkerElement, WorkerElement, WorkerText, WorkerHostContext, boolean>;
export default createWorkerDOMHostConfig;
//# sourceMappingURL=WorkerDOMHostConfig.d.ts.map