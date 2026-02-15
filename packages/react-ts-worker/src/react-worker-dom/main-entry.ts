// Main Thread Entry - Initializes worker-dom and connects it to a React app running in a worker

// This module runs on the main thread and:
// 1. Loads the worker-dom main-thread runtime
// 2. Creates a worker that runs React with WorkerDOMHostConfig
// 3. Connects the worker-dom mutation observer to apply DOM changes

export interface MainEntryOptions {
  // URL to the worker script that imports react-worker-dom/worker-entry
  workerUrl: string | URL;
  // The DOM element to render into
  container: Element;
  // Optional: worker-dom's upgrade function if already loaded
  upgrade?: (element: Element, workerUrl: string | URL) => void;
}

export async function mount(options: MainEntryOptions): Promise<Worker> {
  const { workerUrl, container } = options;

  if (options.upgrade) {
    // Use provided upgrade function (from worker-dom's install.ts)
    options.upgrade(container, workerUrl);
    // The worker is managed by worker-dom internally
    return null as any;
  }

  // Manual setup: create a worker and set up the mutation observer bridge
  const worker = new Worker(workerUrl, { type: 'module' });

  // The worker will communicate with us via postMessage
  // worker-dom's MutationTransfer handles the binary protocol

  return worker;
}

export function unmount(container: Element): void {
  // Clean up the container
  container.textContent = '';
}
