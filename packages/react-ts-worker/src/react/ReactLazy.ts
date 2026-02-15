import type { LazyComponent, LazyPayload } from './ReactTypes.js';
import { REACT_LAZY_TYPE } from './ReactSymbols.js';

const Uninitialized = -1;
const Pending = 0;
const Resolved = 1;
const Rejected = 2;

function lazyInitializer<T>(payload: LazyPayload<T>): T {
  if (payload._status === Uninitialized) {
    const ctor = payload._result as () => PromiseLike<{ default: T }>;
    const thenable = ctor();
    thenable.then(
      (moduleObject: { default: T }) => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          (payload as any)._status = Resolved;
          (payload as any)._result = moduleObject;
        }
      },
      (error: any) => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          (payload as any)._status = Rejected;
          (payload as any)._result = error;
        }
      },
    );
    if (payload._status === Uninitialized) {
      (payload as any)._status = Pending;
      (payload as any)._result = thenable;
    }
  }
  if (payload._status === Resolved) {
    const moduleObject = payload._result as { default: T };
    return moduleObject.default;
  } else {
    throw payload._result;
  }
}

export function lazy<T>(
  ctor: () => PromiseLike<{ default: T }>,
): LazyComponent<T> {
  const payload: LazyPayload<T> = {
    _status: Uninitialized,
    _result: ctor as any,
  };

  const lazyType: LazyComponent<T> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: payload,
    _init: lazyInitializer,
  };

  return lazyType;
}
