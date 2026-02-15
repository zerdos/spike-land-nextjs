// Workerd Entry - Cloudflare Workers SSR entry point
// Provides a fetch handler that renders React to a streaming Response
import { renderToReadableStream } from './ReactFizzServer.js';
// Helper to create an SSR fetch handler
export function createSSRHandler(renderApp, options) {
    return {
        async fetch(request) {
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
            }
            catch (error) {
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
//# sourceMappingURL=WorkerdEntry.js.map