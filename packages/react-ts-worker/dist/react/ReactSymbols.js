// Symbol tags for React element types
export const REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element');
export const REACT_PORTAL_TYPE = Symbol.for('react.portal');
export const REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
export const REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');
export const REACT_PROFILER_TYPE = Symbol.for('react.profiler');
export const REACT_CONSUMER_TYPE = Symbol.for('react.consumer');
export const REACT_CONTEXT_TYPE = Symbol.for('react.context');
export const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
export const REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
export const REACT_MEMO_TYPE = Symbol.for('react.memo');
export const REACT_LAZY_TYPE = Symbol.for('react.lazy');
export function getIteratorFn(maybeIterable) {
    if (maybeIterable === null || typeof maybeIterable !== 'object') {
        return null;
    }
    const iterableObj = maybeIterable;
    const maybeIterator = (Symbol.iterator && iterableObj[Symbol.iterator]) ||
        iterableObj['@@iterator'];
    if (typeof maybeIterator === 'function') {
        return maybeIterator;
    }
    return null;
}
//# sourceMappingURL=ReactSymbols.js.map