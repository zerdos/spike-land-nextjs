export interface TransferrableEventData {
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    target: number;
    currentTarget: number;
    timeStamp: number;
    clientX?: number;
    clientY?: number;
    pageX?: number;
    pageY?: number;
    button?: number;
    buttons?: number;
    key?: string;
    code?: string;
    keyCode?: number;
    charCode?: number;
    which?: number;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
}
export declare function createEventFromTransfer(data: TransferrableEventData): Event;
export declare function setupEventForwarding(onEvent: (event: Event, targetNodeId: number) => void): (data: TransferrableEventData) => void;
export declare const CAPTURED_EVENTS: readonly ["click", "dblclick", "mousedown", "mouseup", "mousemove", "mouseover", "mouseout", "mouseenter", "mouseleave", "touchstart", "touchend", "touchmove", "touchcancel", "keydown", "keyup", "keypress", "focus", "blur", "focusin", "focusout", "input", "change", "submit", "reset", "scroll", "wheel", "pointerdown", "pointerup", "pointermove", "pointerenter", "pointerleave", "pointerover", "pointerout", "contextmenu", "drag", "dragstart", "dragend", "dragenter", "dragleave", "dragover", "drop"];
//# sourceMappingURL=events.d.ts.map