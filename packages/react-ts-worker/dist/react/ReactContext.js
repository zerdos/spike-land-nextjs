import { REACT_CONSUMER_TYPE, REACT_CONTEXT_TYPE } from './ReactSymbols.js';
export function createContext(defaultValue) {
    const context = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        Provider: null,
        Consumer: null,
    };
    context.Provider = context;
    context.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: context,
    };
    return context;
}
//# sourceMappingURL=ReactContext.js.map