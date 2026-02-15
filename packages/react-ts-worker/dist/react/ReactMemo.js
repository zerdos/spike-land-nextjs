import { REACT_MEMO_TYPE } from './ReactSymbols.js';
export function memo(type, compare) {
    return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: compare ?? null,
    };
}
//# sourceMappingURL=ReactMemo.js.map