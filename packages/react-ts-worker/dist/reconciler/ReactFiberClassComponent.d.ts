import type { Fiber, ClassUpdate } from './ReactFiberTypes.js';
import type { Lanes, Lane } from './ReactFiberLane.js';
import type { ComponentInstance, ComponentClass } from '../react/ReactTypes.js';
export declare function initializeClassUpdateQueue<S>(fiber: Fiber): void;
export declare function createClassUpdate(lane: Lane): ClassUpdate;
export declare function enqueueClassUpdate(fiber: Fiber, update: ClassUpdate): void;
export declare function processClassUpdateQueue<S>(fiber: Fiber, props: unknown, instance: unknown, _renderLanes: Lanes): void;
export declare function constructClassInstance(fiber: Fiber, Component: ComponentClass, props: unknown): ComponentInstance;
export declare function mountClassInstance(fiber: Fiber, Component: ComponentClass, nextProps: unknown, renderLanes: Lanes): void;
export declare function updateClassInstance(current: Fiber, fiber: Fiber, Component: ComponentClass, nextProps: unknown, renderLanes: Lanes): boolean;
//# sourceMappingURL=ReactFiberClassComponent.d.ts.map