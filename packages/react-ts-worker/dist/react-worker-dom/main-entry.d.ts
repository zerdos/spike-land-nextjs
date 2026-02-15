import { MainThreadApplier } from './bridge/main-applier.js';
export interface MainEntryOptions {
    workerUrl: string | URL;
    container: HTMLElement;
    upgrade?: (element: Element, workerUrl: string | URL) => void;
}
export declare function mount(options: MainEntryOptions): Promise<MainThreadApplier>;
export declare function unmount(): void;
export { MainThreadApplier } from './bridge/main-applier.js';
//# sourceMappingURL=main-entry.d.ts.map