import { REACT_LAZY_TYPE } from './ReactSymbols.js';
const Uninitialized = -1;
const Pending = 0;
const Resolved = 1;
const Rejected = 2;
function lazyInitializer(payload) {
    if (payload._status === Uninitialized) {
        const ctor = payload._result;
        const thenable = ctor();
        thenable.then((moduleObject) => {
            if (payload._status === Pending || payload._status === Uninitialized) {
                payload._status = Resolved;
                payload._result = moduleObject;
            }
        }, (error) => {
            if (payload._status === Pending || payload._status === Uninitialized) {
                payload._status = Rejected;
                payload._result = error;
            }
        });
        if (payload._status === Uninitialized) {
            payload._status = Pending;
            payload._result = thenable;
        }
    }
    if (payload._status === Resolved) {
        const moduleObject = payload._result;
        return moduleObject.default;
    }
    else {
        throw payload._result;
    }
}
export function lazy(ctor) {
    const payload = {
        _status: Uninitialized,
        _result: ctor,
    };
    const lazyType = {
        $$typeof: REACT_LAZY_TYPE,
        _payload: payload,
        _init: lazyInitializer,
    };
    return lazyType;
}
//# sourceMappingURL=ReactLazy.js.map