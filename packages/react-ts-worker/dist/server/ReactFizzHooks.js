// Server-side Hook Dispatcher for Fizz
// Provides hook implementations that work during SSR
import { REACT_CONTEXT_TYPE } from '../react/ReactSymbols.js';
let idCounter = 0;
export function resetIdCounter() {
    idCounter = 0;
}
function generateId() {
    return ':r' + (idCounter++).toString(32) + ':';
}
// The server dispatcher provides simplified hook implementations
export const ServerDispatcher = {
    useState(initialState) {
        const state = typeof initialState === 'function'
            ? initialState()
            : initialState;
        return [state, () => { }];
    },
    useReducer(reducer, initialArg, init) {
        const state = init ? init(initialArg) : initialArg;
        return [state, () => { }];
    },
    useEffect(_create, _deps) {
        // No-op on server
    },
    useLayoutEffect(_create, _deps) {
        // No-op on server
    },
    useInsertionEffect(_create, _deps) {
        // No-op on server
    },
    useCallback(callback, _deps) {
        return callback;
    },
    useMemo(create, _deps) {
        return create();
    },
    useRef(initialValue) {
        return { current: initialValue };
    },
    useContext(context) {
        return context._currentValue;
    },
    useImperativeHandle(_ref, _create, _deps) {
        // No-op on server
    },
    useDebugValue(_value, _format) {
        // No-op on server
    },
    useTransition() {
        return [false, (callback) => callback()];
    },
    useDeferredValue(value, _initialValue) {
        return value;
    },
    useId() {
        return generateId();
    },
    useSyncExternalStore(_subscribe, _getSnapshot, getServerSnapshot) {
        if (getServerSnapshot) {
            return getServerSnapshot();
        }
        throw new Error('useSyncExternalStore requires getServerSnapshot for server rendering.');
    },
    use(usable) {
        if (usable !== null && typeof usable === 'object') {
            if ('$$typeof' in usable && usable.$$typeof === REACT_CONTEXT_TYPE) {
                const context = usable;
                return context._currentValue;
            }
        }
        throw new Error('use() with promises is not supported in server rendering without Suspense.');
    },
    useOptimistic(passthrough, _reducer) {
        return [passthrough, () => { }];
    },
    useActionState(_action, initialState, _permalink) {
        return [initialState, () => { }, false];
    },
};
//# sourceMappingURL=ReactFizzHooks.js.map