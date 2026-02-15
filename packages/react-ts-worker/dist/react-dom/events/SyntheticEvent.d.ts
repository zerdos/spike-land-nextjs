export interface SyntheticEventInterface {
    type: string;
    target: EventTarget | null;
    currentTarget: EventTarget | null;
    eventPhase: number;
    bubbles: boolean;
    cancelable: boolean;
    timeStamp: number;
    defaultPrevented: boolean;
    isTrusted: boolean;
    nativeEvent: Event;
    isPropagationStopped(): boolean;
    isDefaultPrevented(): boolean;
    stopPropagation(): void;
    preventDefault(): void;
    persist(): void;
}
export declare class SyntheticEvent implements SyntheticEventInterface {
    type: string;
    target: EventTarget | null;
    currentTarget: EventTarget | null;
    eventPhase: number;
    bubbles: boolean;
    cancelable: boolean;
    timeStamp: number;
    defaultPrevented: boolean;
    isTrusted: boolean;
    nativeEvent: Event;
    private _propagationStopped;
    private _defaultPrevented;
    constructor(type: string, nativeEvent: Event, target: EventTarget | null);
    stopPropagation(): void;
    isPropagationStopped(): boolean;
    preventDefault(): void;
    isDefaultPrevented(): boolean;
    persist(): void;
}
export declare class SyntheticMouseEvent extends SyntheticEvent {
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    screenX: number;
    screenY: number;
    button: number;
    buttons: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    relatedTarget: EventTarget | null;
    constructor(type: string, nativeEvent: MouseEvent, target: EventTarget | null);
}
export declare class SyntheticKeyboardEvent extends SyntheticEvent {
    key: string;
    code: string;
    charCode: number;
    keyCode: number;
    which: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    repeat: boolean;
    locale: string;
    constructor(type: string, nativeEvent: KeyboardEvent, target: EventTarget | null);
}
export declare class SyntheticFocusEvent extends SyntheticEvent {
    relatedTarget: EventTarget | null;
    constructor(type: string, nativeEvent: FocusEvent, target: EventTarget | null);
}
export declare class SyntheticInputEvent extends SyntheticEvent {
    data: string | null;
    constructor(type: string, nativeEvent: InputEvent | Event, target: EventTarget | null);
}
export declare function createSyntheticEvent(reactName: string, nativeEvent: Event, target: EventTarget | null): SyntheticEvent;
//# sourceMappingURL=SyntheticEvent.d.ts.map