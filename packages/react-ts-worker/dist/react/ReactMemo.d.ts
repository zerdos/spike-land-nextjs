import type { MemoComponent, FunctionComponent } from './ReactTypes.js';
export declare function memo<P>(type: FunctionComponent<P>, compare?: ((prevProps: P, nextProps: P) => boolean) | null): MemoComponent<P>;
//# sourceMappingURL=ReactMemo.d.ts.map