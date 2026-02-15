// Synthetic Event - Pool-free event wrapper for React's event system
export class SyntheticEvent {
    type;
    target;
    currentTarget;
    eventPhase;
    bubbles;
    cancelable;
    timeStamp;
    defaultPrevented;
    isTrusted;
    nativeEvent;
    _propagationStopped = false;
    _defaultPrevented = false;
    constructor(type, nativeEvent, target) {
        this.type = type;
        this.nativeEvent = nativeEvent;
        this.target = target;
        this.currentTarget = null;
        this.eventPhase = 0;
        this.bubbles = nativeEvent.bubbles;
        this.cancelable = nativeEvent.cancelable;
        this.timeStamp = nativeEvent.timeStamp;
        this.defaultPrevented = nativeEvent.defaultPrevented;
        this.isTrusted = nativeEvent.isTrusted;
        this._defaultPrevented = nativeEvent.defaultPrevented;
    }
    stopPropagation() {
        this._propagationStopped = true;
        this.nativeEvent.stopPropagation();
    }
    isPropagationStopped() {
        return this._propagationStopped;
    }
    preventDefault() {
        this._defaultPrevented = true;
        this.defaultPrevented = true;
        this.nativeEvent.preventDefault();
    }
    isDefaultPrevented() {
        return this._defaultPrevented;
    }
    persist() {
        // No-op since we don't pool events
    }
}
// Specialized event types
export class SyntheticMouseEvent extends SyntheticEvent {
    clientX;
    clientY;
    pageX;
    pageY;
    screenX;
    screenY;
    button;
    buttons;
    ctrlKey;
    shiftKey;
    altKey;
    metaKey;
    relatedTarget;
    constructor(type, nativeEvent, target) {
        super(type, nativeEvent, target);
        this.clientX = nativeEvent.clientX;
        this.clientY = nativeEvent.clientY;
        this.pageX = nativeEvent.pageX;
        this.pageY = nativeEvent.pageY;
        this.screenX = nativeEvent.screenX;
        this.screenY = nativeEvent.screenY;
        this.button = nativeEvent.button;
        this.buttons = nativeEvent.buttons;
        this.ctrlKey = nativeEvent.ctrlKey;
        this.shiftKey = nativeEvent.shiftKey;
        this.altKey = nativeEvent.altKey;
        this.metaKey = nativeEvent.metaKey;
        this.relatedTarget = nativeEvent.relatedTarget;
    }
}
export class SyntheticKeyboardEvent extends SyntheticEvent {
    key;
    code;
    charCode;
    keyCode;
    which;
    ctrlKey;
    shiftKey;
    altKey;
    metaKey;
    repeat;
    locale;
    constructor(type, nativeEvent, target) {
        super(type, nativeEvent, target);
        this.key = nativeEvent.key;
        this.code = nativeEvent.code;
        this.charCode = nativeEvent.charCode;
        this.keyCode = nativeEvent.keyCode;
        this.which = nativeEvent.which;
        this.ctrlKey = nativeEvent.ctrlKey;
        this.shiftKey = nativeEvent.shiftKey;
        this.altKey = nativeEvent.altKey;
        this.metaKey = nativeEvent.metaKey;
        this.repeat = nativeEvent.repeat;
        this.locale = nativeEvent.locale || '';
    }
}
export class SyntheticFocusEvent extends SyntheticEvent {
    relatedTarget;
    constructor(type, nativeEvent, target) {
        super(type, nativeEvent, target);
        this.relatedTarget = nativeEvent.relatedTarget;
    }
}
export class SyntheticInputEvent extends SyntheticEvent {
    data;
    constructor(type, nativeEvent, target) {
        super(type, nativeEvent, target);
        this.data = nativeEvent.data ?? null;
    }
}
export function createSyntheticEvent(reactName, nativeEvent, target) {
    if (nativeEvent instanceof MouseEvent) {
        return new SyntheticMouseEvent(reactName, nativeEvent, target);
    }
    if (nativeEvent instanceof KeyboardEvent) {
        return new SyntheticKeyboardEvent(reactName, nativeEvent, target);
    }
    if (nativeEvent instanceof FocusEvent) {
        return new SyntheticFocusEvent(reactName, nativeEvent, target);
    }
    if (typeof InputEvent !== 'undefined' && nativeEvent instanceof InputEvent) {
        return new SyntheticInputEvent(reactName, nativeEvent, target);
    }
    return new SyntheticEvent(reactName, nativeEvent, target);
}
//# sourceMappingURL=SyntheticEvent.js.map