export interface EventRegistration {
    reactName: string;
    nativeEvents: string[];
    isCapture: boolean;
}
export declare function getReactNamesForNativeEvent(nativeEventName: string): string[];
export declare function getNativeEventsForReactEvent(reactName: string): string[];
export declare function isDiscreteEvent(nativeEventName: string): boolean;
export declare function isNonBubblingEvent(nativeEventName: string): boolean;
export declare function getAllNativeEvents(): Set<string>;
export declare function getReactNameFromPropKey(propKey: string): string | null;
//# sourceMappingURL=EventRegistry.d.ts.map