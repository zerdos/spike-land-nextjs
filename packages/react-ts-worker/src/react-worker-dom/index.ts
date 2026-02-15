// React Worker-DOM - Worker-side React root using WorkerDOMHostConfig

import type { ReactNode } from '../react/ReactTypes.js';
import type { WorkerDocument, WorkerElement } from '../host-config/WorkerDOMHostConfig.js';
import { createWorkerDOMHostConfig } from '../host-config/WorkerDOMHostConfig.js';
import { createContainer, updateContainer } from '../reconciler/ReactFiberReconciler.js';

export interface WorkerRoot {
  render(children: ReactNode): void;
  unmount(): void;
}

export function createRoot(
  workerDocument: WorkerDocument,
  containerElement: WorkerElement,
): WorkerRoot {
  const hostConfig = createWorkerDOMHostConfig(workerDocument);
  const fiberRoot = createContainer(containerElement, hostConfig);

  return {
    render(children: ReactNode): void {
      updateContainer(children, fiberRoot);
    },

    unmount(): void {
      updateContainer(null, fiberRoot);
    },
  };
}
