import type { ReactNode, ReactElement } from './ReactTypes.js';
export declare function mapChildren(children: ReactNode, func: (child: ReactNode, index: number) => ReactNode, context?: any): ReactNode[] | null | undefined;
export declare function forEachChildren(children: ReactNode, forEachFunc: (child: ReactNode, index: number) => void, forEachContext?: any): void;
export declare function countChildren(children: ReactNode): number;
export declare function toArray(children: ReactNode): ReactNode[];
export declare function onlyChild(children: ReactNode): ReactElement;
//# sourceMappingURL=ReactChildren.d.ts.map