import ReactSharedInternals from './ReactSharedInternals.js';
function resolveDispatcher() {
    const dispatcher = ReactSharedInternals.H;
    return dispatcher;
}
export function useState(initialState) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useState(initialState);
}
export function useReducer(reducer, initialArg, init) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useReducer(reducer, initialArg, init);
}
export function useEffect(create, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useEffect(create, deps);
}
export function useLayoutEffect(create, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useLayoutEffect(create, deps);
}
export function useInsertionEffect(create, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useInsertionEffect(create, deps);
}
export function useCallback(callback, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useCallback(callback, deps);
}
export function useMemo(create, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useMemo(create, deps);
}
export function useRef(initialValue) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useRef(initialValue);
}
export function useContext(context) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useContext(context);
}
export function useImperativeHandle(ref, create, deps) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useImperativeHandle(ref, create, deps);
}
export function useDebugValue(_value, _format) {
    // useDebugValue is a no-op in production
}
export function useTransition() {
    const dispatcher = resolveDispatcher();
    return dispatcher.useTransition();
}
export function useDeferredValue(value, initialValue) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useDeferredValue(value, initialValue);
}
export function useId() {
    const dispatcher = resolveDispatcher();
    return dispatcher.useId();
}
export function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
export function use(usable) {
    const dispatcher = resolveDispatcher();
    return dispatcher.use(usable);
}
export function useOptimistic(passthrough, reducer) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useOptimistic(passthrough, reducer);
}
export function useActionState(action, initialState, permalink) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useActionState(action, initialState, permalink);
}
//# sourceMappingURL=ReactHooks.js.map