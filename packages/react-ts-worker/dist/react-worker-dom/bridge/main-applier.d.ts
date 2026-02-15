export declare class MainThreadApplier {
    private container;
    private worker;
    private nodeMap;
    private reverseMap;
    private eventAbortController;
    constructor(container: HTMLElement, workerBlobUrl: string);
    private applyMutation;
    private register;
    private setupEventCapture;
    destroy(): void;
}
//# sourceMappingURL=main-applier.d.ts.map