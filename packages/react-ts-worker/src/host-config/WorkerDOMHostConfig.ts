// Worker-DOM Host Config
// Uses worker-dom's Document/Element/Text classes directly.
// Worker-dom auto-batches mutations via MutationTransfer.transfer() -> postMessage to main thread.

import type { HostConfig } from './HostConfigInterface.js';

// Worker-dom types (these come from the worker-dom library)
export interface WorkerDocument {
  createElement(type: string): WorkerElement;
  createElementNS(namespace: string, type: string): WorkerElement;
  createTextNode(text: string): WorkerText;
}

export interface WorkerNode {
  appendChild(child: WorkerNode): void;
  insertBefore(child: WorkerNode, before: WorkerNode): void;
  removeChild(child: WorkerNode): void;
  textContent: string | null;
  parentNode: WorkerNode | null;
  childNodes: ArrayLike<WorkerNode>;
}

export interface WorkerElement extends WorkerNode {
  tagName: string;
  namespaceURI: string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  style: Record<string, string>;
}

export interface WorkerText extends WorkerNode {
  data: string;
  nodeValue: string | null;
}

interface WorkerHostContext {
  namespace: string;
}

const PROP_TO_ATTRIBUTE: Record<string, string> = {
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv',
  acceptCharset: 'accept-charset',
};

const BOOLEAN_ATTRS = new Set([
  'checked', 'disabled', 'hidden', 'multiple', 'readOnly', 'required',
  'selected', 'autoFocus', 'autoPlay', 'controls',
]);

function setWorkerProps(element: WorkerElement, props: Record<string, any>): void {
  for (const key in props) {
    if (!props.hasOwnProperty(key)) continue;
    const value = props[key];
    if (value == null || key === 'children' || key === 'key' || key === 'ref') continue;

    if (key === 'style') {
      if (typeof value === 'object') {
        for (const styleProp in value) {
          element.style[styleProp] = value[styleProp] == null ? '' : String(value[styleProp]);
        }
      }
    } else if (key.startsWith('on')) {
      // Event handling done through worker-dom's own event system
    } else {
      const attrName = PROP_TO_ATTRIBUTE[key] || key;
      if (BOOLEAN_ATTRS.has(key)) {
        if (value) {
          element.setAttribute(attrName, '');
        } else {
          element.removeAttribute(attrName);
        }
      } else {
        element.setAttribute(attrName, String(value));
      }
    }
  }
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

export function createWorkerDOMHostConfig(
  workerDocument: WorkerDocument,
): HostConfig<
  string,
  Record<string, any>,
  WorkerElement,
  WorkerElement,
  WorkerText,
  WorkerHostContext,
  boolean
> {
  return {
    supportsMutation: true,
    isPrimaryRenderer: true,

    createInstance(
      type: string,
      props: Record<string, any>,
      _rootContainer: WorkerElement,
      hostContext: WorkerHostContext,
    ): WorkerElement {
      let element: WorkerElement;
      if (hostContext.namespace === SVG_NAMESPACE) {
        element = workerDocument.createElementNS(SVG_NAMESPACE, type);
      } else if (hostContext.namespace === MATH_NAMESPACE) {
        element = workerDocument.createElementNS(MATH_NAMESPACE, type);
      } else {
        element = workerDocument.createElement(type);
      }
      setWorkerProps(element, props);
      return element;
    },

    createTextInstance(
      text: string,
      _rootContainer: WorkerElement,
      _hostContext: WorkerHostContext,
    ): WorkerText {
      return workerDocument.createTextNode(text);
    },

    appendChild(parent: WorkerElement, child: WorkerElement | WorkerText): void {
      parent.appendChild(child);
    },

    appendChildToContainer(container: WorkerElement, child: WorkerElement | WorkerText): void {
      container.appendChild(child);
    },

    appendInitialChild(parent: WorkerElement, child: WorkerElement | WorkerText): void {
      parent.appendChild(child);
    },

    insertBefore(
      parent: WorkerElement,
      child: WorkerElement | WorkerText,
      before: WorkerElement | WorkerText,
    ): void {
      parent.insertBefore(child, before);
    },

    insertInContainerBefore(
      container: WorkerElement,
      child: WorkerElement | WorkerText,
      before: WorkerElement | WorkerText,
    ): void {
      container.insertBefore(child, before);
    },

    removeChild(parent: WorkerElement, child: WorkerElement | WorkerText): void {
      parent.removeChild(child);
    },

    removeChildFromContainer(container: WorkerElement, child: WorkerElement | WorkerText): void {
      container.removeChild(child);
    },

    commitUpdate(
      instance: WorkerElement,
      _type: string,
      oldProps: Record<string, any>,
      newProps: Record<string, any>,
    ): void {
      for (const key in oldProps) {
        if (key === 'children' || key === 'key' || key === 'ref' || key.startsWith('on')) continue;
        if (newProps.hasOwnProperty(key)) continue;
        const attrName = PROP_TO_ATTRIBUTE[key] || key;
        instance.removeAttribute(attrName);
      }
      setWorkerProps(instance, newProps);
    },

    commitTextUpdate(textInstance: WorkerText, _oldText: string, newText: string): void {
      textInstance.data = newText;
    },

    resetTextContent(instance: WorkerElement): void {
      instance.textContent = '';
    },

    shouldSetTextContent(_type: string, props: Record<string, any>): boolean {
      return (
        typeof props.children === 'string' ||
        typeof props.children === 'number'
      );
    },

    getRootHostContext(_rootContainer: WorkerElement): WorkerHostContext {
      return { namespace: '' };
    },

    getChildHostContext(
      parentHostContext: WorkerHostContext,
      type: string,
    ): WorkerHostContext {
      if (type === 'svg') return { namespace: SVG_NAMESPACE };
      if (type === 'math') return { namespace: MATH_NAMESPACE };
      if (parentHostContext.namespace === SVG_NAMESPACE && type === 'foreignObject') {
        return { namespace: '' };
      }
      return parentHostContext;
    },

    prepareForCommit(): null {
      return null;
    },

    resetAfterCommit(): void {
      // Worker-dom auto-flushes mutations via microtask
    },

    finalizeInitialChildren(): boolean {
      return false;
    },

    prepareUpdate(
      _instance: WorkerElement,
      _type: string,
      oldProps: Record<string, any>,
      newProps: Record<string, any>,
    ): boolean | null {
      for (const key in oldProps) {
        if (key === 'children' || key === 'key' || key === 'ref') continue;
        if (oldProps[key] !== newProps[key]) return true;
      }
      for (const key in newProps) {
        if (key === 'children' || key === 'key' || key === 'ref') continue;
        if (!(key in oldProps)) return true;
      }
      return null;
    },

    clearContainer(container: WorkerElement): void {
      container.textContent = '';
    },

    getCurrentTime(): number {
      return performance.now();
    },

    scheduleMicrotask(fn: () => void): void {
      queueMicrotask(fn);
    },
  };
}

export default createWorkerDOMHostConfig;
