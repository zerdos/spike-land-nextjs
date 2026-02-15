// Fizz Server Renderer - Streaming SSR
// Walks element tree and produces HTML strings

import type { ReactElement, ReactNode, ReactContext, FunctionComponent, ComponentClass } from '../react/ReactTypes.js';
import {
  REACT_ELEMENT_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_MEMO_TYPE,
  REACT_LAZY_TYPE,
  REACT_SUSPENSE_TYPE,
} from '../react/ReactSymbols.js';
import ReactSharedInternals from '../react/ReactSharedInternals.js';
import { ServerDispatcher, resetIdCounter } from './ReactFizzHooks.js';
import {
  pushStartInstance,
  pushEndInstance,
  pushTextInstance,
  escapeHtml,
  isVoidElement,
} from './ReactFizzConfig.js';

export interface RenderToReadableStreamOptions {
  onError?: (error: unknown) => string | void;
  bootstrapScripts?: string[];
  bootstrapModules?: string[];
  identifierPrefix?: string;
  signal?: AbortSignal;
}

// Render a React element tree to an HTML string (synchronous)
export function renderToString(element: ReactNode): string {
  resetIdCounter();

  // Install server dispatcher
  const prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = ServerDispatcher;

  try {
    const chunks: string[] = [];
    renderNodeToChunks(element, chunks);
    return chunks.join('');
  } finally {
    ReactSharedInternals.H = prevDispatcher;
  }
}

// Render a React element tree to a WHATWG ReadableStream (for workerd/browsers)
export function renderToReadableStream(
  element: ReactNode,
  options?: RenderToReadableStreamOptions,
): ReadableStream<Uint8Array> {
  resetIdCounter();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = ServerDispatcher;

      try {
        // Add doctype and opening html if element is a full document
        const chunks: string[] = [];
        renderNodeToChunks(element, chunks);

        // Add bootstrap scripts if specified
        if (options?.bootstrapScripts) {
          for (const src of options.bootstrapScripts) {
            chunks.push('<script src="' + escapeHtml(src) + '" async></script>');
          }
        }
        if (options?.bootstrapModules) {
          for (const src of options.bootstrapModules) {
            chunks.push('<script type="module" src="' + escapeHtml(src) + '" async></script>');
          }
        }

        const html = chunks.join('');
        controller.enqueue(encoder.encode(html));
        controller.close();
      } catch (error) {
        if (options?.onError) {
          options.onError(error);
        }
        controller.error(error);
      } finally {
        ReactSharedInternals.H = prevDispatcher;
      }
    },
  });
}

function renderNodeToChunks(node: ReactNode, chunks: string[]): void {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return;
  }

  if (typeof node === 'string') {
    chunks.push(pushTextInstance(node));
    return;
  }

  if (typeof node === 'number' || typeof node === 'bigint') {
    chunks.push(pushTextInstance(String(node)));
    return;
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      renderNodeToChunks(node[i], chunks);
    }
    return;
  }

  // Check if iterable (but not string/array which are handled above)
  if (typeof node === 'object' && node !== null && Symbol.iterator in node) {
    const iterator = (node as Iterable<ReactNode>)[Symbol.iterator]();
    let result = iterator.next();
    while (!result.done) {
      renderNodeToChunks(result.value, chunks);
      result = iterator.next();
    }
    return;
  }

  if (isReactElement(node)) {
    renderElementToChunks(node as ReactElement, chunks);
    return;
  }

  // Promise/thenable - not supported in sync rendering
  if (typeof node === 'object' && node !== null && 'then' in node) {
    throw new Error('Promises are not supported in renderToString. Use renderToReadableStream with Suspense.');
  }
}

function isReactElement(node: any): node is ReactElement {
  return (
    typeof node === 'object' &&
    node !== null &&
    node.$$typeof === REACT_ELEMENT_TYPE
  );
}

function renderElementToChunks(element: ReactElement, chunks: string[]): void {
  const { type, props } = element;

  // Fragment
  if (type === REACT_FRAGMENT_TYPE) {
    renderNodeToChunks(props.children, chunks);
    return;
  }

  // Suspense boundary
  if (type === REACT_SUSPENSE_TYPE) {
    // On the server, render the children (not fallback)
    // If children throw, we could render the fallback instead
    try {
      renderNodeToChunks(props.children, chunks);
    } catch (_error) {
      // Render fallback on error
      if (props.fallback !== undefined) {
        renderNodeToChunks(props.fallback, chunks);
      }
    }
    return;
  }

  // String type = host component (div, span, etc.)
  if (typeof type === 'string') {
    renderHostElement(type, props, chunks);
    return;
  }

  // Function component
  if (typeof type === 'function') {
    renderComponentElement(type as FunctionComponent | ComponentClass, props, chunks);
    return;
  }

  // Special element types
  if (typeof type === 'object' && type !== null) {
    const typeObj = type as any;

    // Forward ref
    if (typeObj.$$typeof === REACT_FORWARD_REF_TYPE) {
      const rendered = typeObj.render(props, element.ref);
      renderNodeToChunks(rendered, chunks);
      return;
    }

    // Memo
    if (typeObj.$$typeof === REACT_MEMO_TYPE) {
      const innerType = typeObj.type;
      if (typeof innerType === 'function') {
        renderComponentElement(innerType, props, chunks);
      } else {
        // memo wrapping another special type
        const innerElement: ReactElement = {
          $$typeof: REACT_ELEMENT_TYPE,
          type: innerType,
          key: element.key,
          ref: element.ref,
          props,
          _owner: null,
        };
        renderElementToChunks(innerElement, chunks);
      }
      return;
    }

    // Context provider
    if (typeObj.$$typeof === REACT_CONTEXT_TYPE) {
      const context = typeObj as ReactContext<any>;
      const previousValue = context._currentValue;
      context._currentValue = props.value;
      try {
        renderNodeToChunks(props.children, chunks);
      } finally {
        context._currentValue = previousValue;
      }
      return;
    }

    // Lazy component
    if (typeObj.$$typeof === REACT_LAZY_TYPE) {
      const payload = typeObj._payload;
      const init = typeObj._init;
      const resolvedType = init(payload);
      const resolvedElement: ReactElement = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: resolvedType,
        key: element.key,
        ref: element.ref,
        props,
        _owner: null,
      };
      renderElementToChunks(resolvedElement, chunks);
      return;
    }
  }

  throw new Error(
    `Element type is invalid: expected a string or a class/function but got: ${typeof type}`,
  );
}

function renderHostElement(
  type: string,
  props: Record<string, any>,
  chunks: string[],
): void {
  // Push opening tag with attributes
  chunks.push(pushStartInstance(type, props));

  // Render children (unless it's a void element or text content was already added)
  if (!isVoidElement(type)) {
    const children = props.children;
    if (children != null && typeof children !== 'string' && typeof children !== 'number') {
      renderNodeToChunks(children, chunks);
    }

    // Push closing tag
    chunks.push(pushEndInstance(type));
  }
}

function renderComponentElement(
  type: FunctionComponent | ComponentClass,
  props: Record<string, any>,
  chunks: string[],
): void {
  // Check if it's a class component
  if (isClassComponent(type)) {
    const Ctor = type as ComponentClass;
    const instance = new Ctor(props);

    // Call componentWillMount if exists (legacy)
    if (typeof (instance as any).componentWillMount === 'function') {
      (instance as any).componentWillMount();
    }
    if (typeof (instance as any).UNSAFE_componentWillMount === 'function') {
      (instance as any).UNSAFE_componentWillMount();
    }

    const rendered = instance.render();
    renderNodeToChunks(rendered, chunks);
  } else {
    // Function component
    const rendered = (type as FunctionComponent)(props);
    renderNodeToChunks(rendered, chunks);
  }
}

function isClassComponent(type: any): boolean {
  return !!(type.prototype && type.prototype.isReactComponent);
}
