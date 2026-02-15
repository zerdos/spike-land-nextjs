import type { ReactNode, ReactElement } from './ReactTypes.js';
import {
  getIteratorFn,
  REACT_ELEMENT_TYPE,
  REACT_LAZY_TYPE,
  REACT_PORTAL_TYPE,
} from './ReactSymbols.js';
import { isValidElement, cloneAndReplaceKey } from './ReactElement.js';

const SEPARATOR = '.';
const SUBSEPARATOR = ':';

function escape(key: string): string {
  const escapeRegex = /[=:]/g;
  const escaperLookup: Record<string, string> = {
    '=': '=0',
    ':': '=2',
  };
  const escapedString = key.replace(escapeRegex, function (match) {
    return escaperLookup[match];
  });
  return '$' + escapedString;
}

const userProvidedKeyEscapeRegex = /\/+/g;
function escapeUserProvidedKey(text: string): string {
  return text.replace(userProvidedKeyEscapeRegex, '$&/');
}

function getElementKey(element: any, index: number): string {
  if (typeof element === 'object' && element !== null && element.key != null) {
    return escape('' + element.key);
  }
  return index.toString(36);
}

function resolveThenable<T>(thenable: PromiseLike<T> & { status?: string; value?: T; reason?: any }): T {
  switch (thenable.status) {
    case 'fulfilled': {
      return (thenable as any).value;
    }
    case 'rejected': {
      throw (thenable as any).reason;
    }
    default: {
      if (typeof thenable.status === 'string') {
        thenable.then(() => {}, () => {});
      } else {
        const pendingThenable = thenable as any;
        pendingThenable.status = 'pending';
        pendingThenable.then(
          (fulfilledValue: any) => {
            if (pendingThenable.status === 'pending') {
              pendingThenable.status = 'fulfilled';
              pendingThenable.value = fulfilledValue;
            }
          },
          (error: any) => {
            if (pendingThenable.status === 'pending') {
              pendingThenable.status = 'rejected';
              pendingThenable.reason = error;
            }
          },
        );
      }

      switch ((thenable as any).status) {
        case 'fulfilled': {
          return (thenable as any).value;
        }
        case 'rejected': {
          throw (thenable as any).reason;
        }
      }
    }
  }
  throw thenable;
}

function mapIntoArray(
  children: any,
  array: any[],
  escapedPrefix: string,
  nameSoFar: string,
  callback: (child: any) => any,
): number {
  const type = typeof children;

  if (type === 'undefined' || type === 'boolean') {
    children = null;
  }

  let invokeCallback = false;

  if (children === null) {
    invokeCallback = true;
  } else {
    switch (type) {
      case 'bigint':
      case 'string':
      case 'number':
        invokeCallback = true;
        break;
      case 'object':
        switch ((children as any).$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            invokeCallback = true;
            break;
          case REACT_LAZY_TYPE: {
            const payload = (children as any)._payload;
            const init = (children as any)._init;
            return mapIntoArray(
              init(payload),
              array,
              escapedPrefix,
              nameSoFar,
              callback,
            );
          }
        }
    }
  }

  if (invokeCallback) {
    const child = children;
    let mappedChild = callback(child);
    const childKey =
      nameSoFar === '' ? SEPARATOR + getElementKey(child, 0) : nameSoFar;
    if (Array.isArray(mappedChild)) {
      let escapedChildKey = '';
      if (childKey != null) {
        escapedChildKey = escapeUserProvidedKey(childKey) + '/';
      }
      mapIntoArray(mappedChild, array, escapedChildKey, '', (c) => c);
    } else if (mappedChild != null) {
      if (isValidElement(mappedChild)) {
        const newChild = cloneAndReplaceKey(
          mappedChild,
          escapedPrefix +
            (mappedChild.key != null &&
            (!child || child.key !== mappedChild.key)
              ? escapeUserProvidedKey('' + mappedChild.key) + '/'
              : '') +
            childKey,
        );
        mappedChild = newChild;
      }
      array.push(mappedChild);
    }
    return 1;
  }

  let child;
  let nextName;
  let subtreeCount = 0;
  const nextNamePrefix =
    nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;

  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      child = children[i];
      nextName = nextNamePrefix + getElementKey(child, i);
      subtreeCount += mapIntoArray(
        child,
        array,
        escapedPrefix,
        nextName,
        callback,
      );
    }
  } else {
    const iteratorFn = getIteratorFn(children);
    if (typeof iteratorFn === 'function') {
      const iterator = iteratorFn.call(children);
      let step;
      let ii = 0;
      while (!(step = iterator.next()).done) {
        child = step.value;
        nextName = nextNamePrefix + getElementKey(child, ii++);
        subtreeCount += mapIntoArray(
          child,
          array,
          escapedPrefix,
          nextName,
          callback,
        );
      }
    } else if (type === 'object') {
      if (typeof (children as any).then === 'function') {
        return mapIntoArray(
          resolveThenable(children as any),
          array,
          escapedPrefix,
          nameSoFar,
          callback,
        );
      }

      const childrenString = String(children);
      throw new Error(
        `Objects are not valid as a React child (found: ${
          childrenString === '[object Object]'
            ? 'object with keys {' +
              Object.keys(children as any).join(', ') +
              '}'
            : childrenString
        }). ` +
          'If you meant to render a collection of children, use an array ' +
          'instead.',
      );
    }
  }

  return subtreeCount;
}

export function mapChildren(
  children: ReactNode,
  func: (child: ReactNode, index: number) => ReactNode,
  context?: any,
): ReactNode[] | null | undefined {
  if (children == null) {
    return children as null | undefined;
  }
  const result: ReactNode[] = [];
  let count = 0;
  mapIntoArray(children, result, '', '', function (child) {
    return func.call(context, child, count++);
  });
  return result;
}

export function forEachChildren(
  children: ReactNode,
  forEachFunc: (child: ReactNode, index: number) => void,
  forEachContext?: any,
): void {
  mapChildren(
    children,
    function (this: any) {
      forEachFunc.apply(this, arguments as any);
    } as any,
    forEachContext,
  );
}

export function countChildren(children: ReactNode): number {
  let n = 0;
  mapChildren(children, () => {
    n++;
    return null;
  });
  return n;
}

export function toArray(children: ReactNode): ReactNode[] {
  return mapChildren(children, (child) => child) || [];
}

export function onlyChild(children: ReactNode): ReactElement {
  if (!isValidElement(children)) {
    throw new Error(
      'React.Children.only expected to receive a single React element child.',
    );
  }
  return children as ReactElement;
}
