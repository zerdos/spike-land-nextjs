import type { WorkerDocument, WorkerElement, WorkerNode, WorkerText } from '../../host-config/WorkerDOMHostConfig.js';
import type { Mutation } from './protocol.js';
export declare const nodeMap: Map<number, WorkerNodeImpl>;
export declare class MutationCollector {
    private queue;
    private scheduled;
    record(mutation: Mutation): void;
    private flush;
}
export declare class WorkerNodeImpl implements WorkerNode {
    readonly __nodeId: number;
    parentNode: WorkerNode | null;
    private _children;
    constructor(id?: number);
    get childNodes(): ArrayLike<WorkerNode>;
    get textContent(): string | null;
    set textContent(value: string | null);
    appendChild(child: WorkerNode): void;
    insertBefore(child: WorkerNode, before: WorkerNode): void;
    removeChild(child: WorkerNode): void;
    /** Internal removal without recording a mutation (used when moving nodes). */
    private removeChildInternal;
}
export declare class WorkerElementImpl extends WorkerNodeImpl implements WorkerElement {
    readonly tagName: string;
    readonly namespaceURI: string | null;
    readonly style: Record<string, string>;
    constructor(tagName: string, namespaceURI?: string | null);
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
}
export declare class WorkerTextImpl extends WorkerNodeImpl implements WorkerText {
    private _data;
    constructor(text: string);
    get data(): string;
    set data(value: string);
    get nodeValue(): string | null;
    set nodeValue(value: string | null);
    get textContent(): string | null;
    set textContent(value: string | null);
}
export declare class WorkerDocumentImpl implements WorkerDocument {
    createElement(type: string): WorkerElement;
    createElementNS(namespace: string, type: string): WorkerElement;
    createTextNode(text: string): WorkerText;
}
export declare function createContainerNode(): WorkerElementImpl;
//# sourceMappingURL=worker-document.d.ts.map