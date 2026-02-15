// React Worker-DOM - Worker-side React root using WorkerDOMHostConfig
import { createWorkerDOMHostConfig } from '../host-config/WorkerDOMHostConfig.js';
import { createContainer, updateContainer } from '../reconciler/ReactFiberReconciler.js';
export function createRoot(workerDocument, containerElement, eventRegistry) {
    const hostConfig = createWorkerDOMHostConfig(workerDocument, eventRegistry);
    const fiberRoot = createContainer(containerElement, hostConfig);
    return {
        render(children) {
            updateContainer(children, fiberRoot);
        },
        unmount() {
            updateContainer(null, fiberRoot);
        },
    };
}
//# sourceMappingURL=index.js.map