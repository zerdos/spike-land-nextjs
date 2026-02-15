// Serializes a native DOM Event into a TransferrableEventData object
// suitable for postMessage transfer to the worker.
export function serializeEvent(nativeEvent, targetId) {
    const data = {
        type: nativeEvent.type,
        bubbles: nativeEvent.bubbles,
        cancelable: nativeEvent.cancelable,
        target: targetId,
        currentTarget: targetId,
        timeStamp: nativeEvent.timeStamp,
    };
    // Mouse / Pointer events
    if ('clientX' in nativeEvent) {
        const me = nativeEvent;
        data.clientX = me.clientX;
        data.clientY = me.clientY;
        data.pageX = me.pageX;
        data.pageY = me.pageY;
        data.button = me.button;
        data.buttons = me.buttons;
    }
    // Keyboard events
    if ('key' in nativeEvent) {
        const ke = nativeEvent;
        data.key = ke.key;
        data.code = ke.code;
        data.keyCode = ke.keyCode;
        data.charCode = ke.charCode;
        data.which = ke.which;
    }
    // Modifier keys (present on both mouse and keyboard events)
    if ('ctrlKey' in nativeEvent) {
        const mod = nativeEvent;
        data.ctrlKey = mod.ctrlKey;
        data.shiftKey = mod.shiftKey;
        data.altKey = mod.altKey;
        data.metaKey = mod.metaKey;
    }
    // Capture value for input / change events
    if (nativeEvent.type === 'input' || nativeEvent.type === 'change') {
        const target = nativeEvent.target;
        if (target && typeof target.value === 'string') {
            // Extend data with targetValue (consumer must know to look for this)
            data.targetValue = target.value;
        }
    }
    return data;
}
//# sourceMappingURL=event-serializer.js.map