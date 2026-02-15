// React DOM Client - createRoot and hydrateRoot entry points
import { DOMHostConfig } from '../host-config/DOMHostConfig.js';
import { createContainer, updateContainer } from '../reconciler/ReactFiberReconciler.js';
import { listenToAllSupportedEvents } from './events/EventDelegation.js';
export function createRoot(container, options) {
    if (!container) {
        throw new Error('createRoot(...): Target container is not a DOM element.');
    }
    // Set up event delegation at the root container
    const rootElement = container instanceof Document
        ? container.documentElement
        : container;
    listenToAllSupportedEvents(rootElement);
    // Create the fiber root
    const fiberRoot = createContainer(rootElement, DOMHostConfig);
    return {
        render(children) {
            updateContainer(children, fiberRoot);
        },
        unmount() {
            updateContainer(null, fiberRoot);
        },
    };
}
export function hydrateRoot(container, initialChildren, options) {
    // For now, hydration just does a client render
    // Full hydration support would match existing DOM nodes to fibers
    const root = createRoot(container, options);
    root.render(initialChildren);
    return root;
}
//# sourceMappingURL=client.js.map