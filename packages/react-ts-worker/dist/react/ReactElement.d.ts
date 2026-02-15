import type { ReactElement as ReactElementType } from './ReactTypes.js';
export declare function createElement(type: unknown, config: Record<string, unknown> | null | undefined, ...args: unknown[]): ReactElementType;
export declare function cloneElement(element: ReactElementType, config: Record<string, unknown> | null | undefined, ...args: unknown[]): ReactElementType;
export declare function isValidElement(object: unknown): object is ReactElementType;
export declare function cloneAndReplaceKey(oldElement: ReactElementType, newKey: string | null): ReactElementType;
//# sourceMappingURL=ReactElement.d.ts.map