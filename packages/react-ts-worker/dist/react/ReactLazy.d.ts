import type { LazyComponent } from './ReactTypes.js';
export declare function lazy<T>(ctor: () => PromiseLike<{
    default: T;
}>): LazyComponent<T>;
//# sourceMappingURL=ReactLazy.d.ts.map