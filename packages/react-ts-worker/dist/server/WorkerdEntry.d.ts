import type { ReactNode } from '../react/ReactTypes.js';
import type { RenderToReadableStreamOptions } from './ReactFizzServer.js';
export interface WorkerdSSROptions extends RenderToReadableStreamOptions {
    headers?: Record<string, string>;
    status?: number;
}
export declare function createSSRHandler(renderApp: (request: Request) => ReactNode, options?: WorkerdSSROptions): {
    fetch(request: Request): Promise<Response>;
};
export default createSSRHandler;
//# sourceMappingURL=WorkerdEntry.d.ts.map