// Stream Host Config - lightweight virtual nodes for SSR string generation
// Used by the Fizz server renderer

import type { HostConfig } from './HostConfigInterface.js';

export interface VNode {
  type: string;
  props: Record<string, unknown>;
  children: (VNode | VTextNode)[];
}

export interface VTextNode {
  text: string;
}

interface StreamHostContext {
  namespace: string;
}

export const StreamHostConfig: HostConfig<
  string,
  Record<string, unknown>,
  VNode,
  VNode,
  VTextNode,
  StreamHostContext,
  boolean
> = {
  supportsMutation: true,
  isPrimaryRenderer: false,

  createInstance(
    type: string,
    props: Record<string, unknown>,
    _rootContainer: VNode,
    _hostContext: StreamHostContext,
  ): VNode {
    return { type, props, children: [] };
  },

  createTextInstance(
    text: string,
    _rootContainer: VNode,
    _hostContext: StreamHostContext,
  ): VTextNode {
    return { text };
  },

  appendChild(parent: VNode, child: VNode | VTextNode): void {
    parent.children.push(child);
  },

  appendChildToContainer(container: VNode, child: VNode | VTextNode): void {
    container.children.push(child);
  },

  appendInitialChild(parent: VNode, child: VNode | VTextNode): void {
    parent.children.push(child);
  },

  insertBefore(
    parent: VNode,
    child: VNode | VTextNode,
    before: VNode | VTextNode,
  ): void {
    const index = parent.children.indexOf(before);
    if (index >= 0) {
      parent.children.splice(index, 0, child);
    } else {
      parent.children.push(child);
    }
  },

  insertInContainerBefore(
    container: VNode,
    child: VNode | VTextNode,
    before: VNode | VTextNode,
  ): void {
    const index = container.children.indexOf(before);
    if (index >= 0) {
      container.children.splice(index, 0, child);
    } else {
      container.children.push(child);
    }
  },

  removeChild(parent: VNode, child: VNode | VTextNode): void {
    const index = parent.children.indexOf(child);
    if (index >= 0) {
      parent.children.splice(index, 1);
    }
  },

  removeChildFromContainer(container: VNode, child: VNode | VTextNode): void {
    const index = container.children.indexOf(child);
    if (index >= 0) {
      container.children.splice(index, 1);
    }
  },

  commitUpdate(
    instance: VNode,
    _type: string,
    _oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
  ): void {
    instance.props = newProps;
  },

  commitTextUpdate(textInstance: VTextNode, _oldText: string, newText: string): void {
    textInstance.text = newText;
  },

  resetTextContent(instance: VNode): void {
    instance.children = [];
  },

  shouldSetTextContent(_type: string, props: Record<string, unknown>): boolean {
    return (
      typeof props.children === 'string' ||
      typeof props.children === 'number'
    );
  },

  getRootHostContext(_rootContainer: VNode): StreamHostContext {
    return { namespace: '' };
  },

  getChildHostContext(
    parentHostContext: StreamHostContext,
    type: string,
  ): StreamHostContext {
    if (type === 'svg') return { namespace: 'svg' };
    if (type === 'math') return { namespace: 'math' };
    if (parentHostContext.namespace === 'svg' && type === 'foreignObject') {
      return { namespace: '' };
    }
    return parentHostContext;
  },

  prepareForCommit(): null {
    return null;
  },

  resetAfterCommit(): void {},

  finalizeInitialChildren(): boolean {
    return false;
  },

  prepareUpdate(): boolean | null {
    return true;
  },

  clearContainer(container: VNode): void {
    container.children = [];
  },

  getCurrentTime(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  },

  scheduleMicrotask(fn: () => void): void {
    queueMicrotask(fn);
  },
};

export default StreamHostConfig;
