// Workerd Entry - Cloudflare Workers SSR entry point
// Provides a fetch handler that renders React to a streaming Response

import type { ReactNode } from '../react/ReactTypes.js';
import { renderToReadableStream } from './ReactFizzServer.js';
import type { RenderToReadableStreamOptions } from './ReactFizzServer.js';

export interface WorkerdSSROptions extends RenderToReadableStreamOptions {
  headers?: Record<string, string>;
  status?: number;
}

// Helper to create an SSR fetch handler
export function createSSRHandler(
  renderApp: (request: Request) => ReactNode,
  options?: WorkerdSSROptions,
) {
  return {
    async fetch(request: Request): Promise<Response> {
      try {
        const element = renderApp(request);
        const stream = renderToReadableStream(element, options);

        return new Response(stream, {
          status: options?.status ?? 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...options?.headers,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return new Response(message, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    },
  };
}

// Direct export for simple use cases
// Usage:
//   export default createSSRHandler((req) => <App url={req.url} />);
export default createSSRHandler;
