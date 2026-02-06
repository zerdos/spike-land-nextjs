import React from "react";

// Patch: Ensure all React dispatchers have getOwner().
// React 19.2+ dev jsx-runtime calls dispatcher.getOwner(), but custom
// reconcilers (e.g., @react-three/fiber's react-reconciler) may set a
// dispatcher that lacks this method, causing "getOwner is not a function".
// This intercepts dispatcher assignments and adds a no-op getOwner fallback.
// Only needed in dev mode — production jsx-runtime does not call getOwner().
if (process.env["NODE_ENV"] !== "production") {
  const _internals = (React as Record<string, unknown>)[
    "__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE"
  ] as
    | Record<string, unknown>
    | undefined;
  if (_internals) {
    // TODO: re-verify "H" property name on React upgrades
    let _H = _internals["H"];
    Object.defineProperty(_internals, "H", {
      get: () => _H,
      set: (dispatcher: Record<string, unknown> | null) => {
        if (dispatcher != null && typeof dispatcher["getOwner"] !== "function") {
          dispatcher["getOwner"] = () => null;
        }
        _H = dispatcher;
      },
      configurable: true,
      enumerable: true,
    });
  }
}

export const {
  Children,
  Component,
  Fragment,
  Profiler,
  PureComponent,
  StrictMode,
  Suspense,
  act,
  cloneElement,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  cache,
  use,
  useActionState,
  useOptimistic,
  version,
} = React;

export default React;
