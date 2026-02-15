import type { ReactNode } from '../react/ReactTypes.js';
export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
}
export interface CreateRootOptions {
    onUncaughtError?: (error: unknown, errorInfo: {
        componentStack?: string;
    }) => void;
    onCaughtError?: (error: unknown, errorInfo: {
        componentStack?: string;
    }) => void;
}
export declare function createRoot(container: Element | Document, options?: CreateRootOptions): Root;
export interface HydrateRootOptions extends CreateRootOptions {
    onRecoverableError?: (error: unknown) => void;
}
export declare function hydrateRoot(container: Element | Document, initialChildren: ReactNode, options?: HydrateRootOptions): Root;
//# sourceMappingURL=client.d.ts.map