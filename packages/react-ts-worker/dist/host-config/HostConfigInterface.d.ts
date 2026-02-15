export interface HostConfig<Type = string, Props = Record<string, unknown>, Container = unknown, Instance = unknown, TextInstance = unknown, HostContext = unknown, UpdatePayload = unknown> {
    createInstance(type: Type, props: Props, rootContainer: Container, hostContext: HostContext): Instance;
    createTextInstance(text: string, rootContainer: Container, hostContext: HostContext): TextInstance;
    appendChild(parent: Instance | Container, child: Instance | TextInstance): void;
    appendChildToContainer(container: Container, child: Instance | TextInstance): void;
    appendInitialChild(parent: Instance, child: Instance | TextInstance): void;
    insertBefore(parent: Instance | Container, child: Instance | TextInstance, before: Instance | TextInstance): void;
    insertInContainerBefore(container: Container, child: Instance | TextInstance, before: Instance | TextInstance): void;
    removeChild(parent: Instance | Container, child: Instance | TextInstance): void;
    removeChildFromContainer(container: Container, child: Instance | TextInstance): void;
    commitUpdate(instance: Instance, type: Type, oldProps: Props, newProps: Props): void;
    commitTextUpdate(textInstance: TextInstance, oldText: string, newText: string): void;
    resetTextContent(instance: Instance): void;
    shouldSetTextContent(type: Type, props: Props): boolean;
    getRootHostContext(rootContainer: Container): HostContext;
    getChildHostContext(parentHostContext: HostContext, type: Type): HostContext;
    prepareForCommit(container: Container): Record<string, any> | null;
    resetAfterCommit(container: Container): void;
    finalizeInitialChildren(instance: Instance, type: Type, props: Props, hostContext: HostContext): boolean;
    prepareUpdate(instance: Instance, type: Type, oldProps: Props, newProps: Props, hostContext: HostContext): UpdatePayload | null;
    clearContainer(container: Container): void;
    supportsMutation: boolean;
    isPrimaryRenderer: boolean;
    getCurrentTime(): number;
    scheduleMicrotask(fn: () => void): void;
}
export type DOMHostConfigType = HostConfig<string, Record<string, any>, Element, Element, Text, HostContextValue, boolean>;
export interface HostContextValue {
    namespace: string;
}
//# sourceMappingURL=HostConfigInterface.d.ts.map