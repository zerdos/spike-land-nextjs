import type { Fiber } from './ReactFiberTypes.js';
import type { Lanes } from './ReactFiberLane.js';
import type { ReactElement } from '../react/ReactTypes.js';
export declare function isSimpleFunctionComponent(type: any): boolean;
export declare function createFiberFromElement(element: ReactElement, lanes: Lanes): Fiber;
export declare function createFiberFromTypeAndProps(type: any, key: string | null, pendingProps: any, lanes: Lanes): Fiber;
export declare function createFiberFromText(content: string, lanes: Lanes): Fiber;
export declare function createFiberFromFragment(elements: any, lanes: Lanes, key: string | null): Fiber;
export declare function createHostRootFiber(): Fiber;
export declare function createWorkInProgress(current: Fiber, pendingProps: any): Fiber;
//# sourceMappingURL=ReactFiber.d.ts.map