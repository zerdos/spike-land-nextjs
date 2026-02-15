import type { ReactNode } from '../react/ReactTypes.js';
export interface RenderToReadableStreamOptions {
    onError?: (error: unknown) => string | void;
    bootstrapScripts?: string[];
    bootstrapModules?: string[];
    identifierPrefix?: string;
    signal?: AbortSignal;
}
export declare function renderToString(element: ReactNode): string;
export declare function renderToReadableStream(element: ReactNode, options?: RenderToReadableStreamOptions): ReadableStream<Uint8Array>;
//# sourceMappingURL=ReactFizzServer.d.ts.map