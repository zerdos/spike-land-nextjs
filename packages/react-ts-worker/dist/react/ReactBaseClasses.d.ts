interface Updater {
    enqueueSetState(inst: any, payload: any, callback: any, callerName: string): void;
    enqueueForceUpdate(inst: any, callback: any, callerName: string): void;
}
export declare function Component(this: any, props: any, context: any, updater?: Updater): void;
export declare function PureComponent(this: any, props: any, context: any, updater?: Updater): void;
export declare namespace PureComponent {
    var prototype: any;
}
export {};
//# sourceMappingURL=ReactBaseClasses.d.ts.map