import { REACT_FORWARD_REF_TYPE } from './ReactSymbols.js';
export function forwardRef(render) {
    return {
        $$typeof: REACT_FORWARD_REF_TYPE,
        render,
    };
}
//# sourceMappingURL=ReactForwardRef.js.map