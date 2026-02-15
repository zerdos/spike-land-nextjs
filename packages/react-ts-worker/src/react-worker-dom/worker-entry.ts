// Worker Entry - Bootstrap for running React inside a Web Worker with worker-dom
// Receives worker-dom's Document and initializes a React root

import type { ReactNode } from '../react/ReactTypes.js';
import type { WorkerDocument, WorkerElement } from '../host-config/WorkerDOMHostConfig.js';
import { createRoot } from './index.js';
import type { WorkerRoot } from './index.js';

let root: WorkerRoot | null = null;

export interface WorkerBootstrapOptions {
  render: (document: WorkerDocument) => ReactNode;
}

// Called by worker-dom when the worker is initialized
// worker-dom provides a Document-like object that mirrors the main thread DOM
export function bootstrap(
  workerDocument: WorkerDocument,
  rootElement: WorkerElement,
  options: WorkerBootstrapOptions,
): WorkerRoot {
  root = createRoot(workerDocument, rootElement);

  const element = options.render(workerDocument);
  root.render(element);

  return root;
}

// Re-render with new content
export function update(
  workerDocument: WorkerDocument,
  render: (document: WorkerDocument) => ReactNode,
): void {
  if (root) {
    root.render(render(workerDocument));
  }
}

// Clean up
export function unmount(): void {
  if (root) {
    root.unmount();
    root = null;
  }
}

export { createRoot } from './index.js';
