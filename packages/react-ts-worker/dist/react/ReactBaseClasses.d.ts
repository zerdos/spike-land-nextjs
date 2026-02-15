interface Updater {
    enqueueSetState(inst: unknown, payload: unknown, callback: unknown, callerName: string): void;
    enqueueForceUpdate(inst: unknown, callback: unknown, callerName: string): void;
}
export declare function Component(this: Record<string, unknown>, props: unknown, context: unknown, updater?: Updater): void;
export declare function PureComponent(this: Record<string, unknown>, props: unknown, context: unknown, updater?: Updater): void;
export declare namespace PureComponent {
    var prototype: Record<string, unknown>;
}
export {};
//# sourceMappingURL=ReactBaseClasses.d.ts.map