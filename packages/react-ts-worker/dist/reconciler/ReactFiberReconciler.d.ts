import type { FiberRoot } from './ReactFiberTypes.js';
import type { HostConfig } from '../host-config/HostConfigInterface.js';
import type { ReactNode } from '../react/ReactTypes.js';
export declare function createContainer(containerInfo: any, hostConfig: HostConfig): FiberRoot;
export declare function updateContainer(element: ReactNode | null, container: FiberRoot): void;
export declare function getPublicRootInstance(container: FiberRoot): any;
//# sourceMappingURL=ReactFiberReconciler.d.ts.map