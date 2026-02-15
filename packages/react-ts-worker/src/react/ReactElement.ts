import type { ReactElement as ReactElementType } from './ReactTypes.js';
import { REACT_ELEMENT_TYPE } from './ReactSymbols.js';
import assign from '../shared/assign.js';

const hasOwnProperty = Object.prototype.hasOwnProperty;

function ReactElement(
  type: any,
  key: string | null,
  ref: any,
  props: any,
): ReactElementType {
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    _owner: null,
  };
}

export function createElement(type: any, config: any, ...args: any[]): ReactElementType {
  const props: Record<string, any> = {};

  let key: string | null = null;
  let ref: any = null;

  if (config != null) {
    if (config.ref !== undefined) {
      ref = config.ref;
    }
    if (config.key !== undefined) {
      key = '' + config.key;
    }

    for (const propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        propName !== 'key' &&
        propName !== 'ref' &&
        propName !== '__self' &&
        propName !== '__source'
      ) {
        props[propName] = config[propName];
      }
    }
  }

  // Children can be more than one argument
  const childrenLength = args.length;
  if (childrenLength === 1) {
    props.children = args[0];
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = args[i];
    }
    props.children = childArray;
  }

  // Resolve default props
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (const propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }

  return ReactElement(type, key, ref, props);
}

export function cloneElement(element: ReactElementType, config: any, ...args: any[]): ReactElementType {
  if (element === null || element === undefined) {
    throw new Error(
      `The argument must be a React element, but you passed ${element}.`,
    );
  }

  const props = assign({}, element.props);
  let key = element.key;
  let ref = element.ref;

  if (config != null) {
    if (config.ref !== undefined) {
      ref = config.ref;
    }
    if (config.key !== undefined) {
      key = '' + config.key;
    }

    for (const propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        propName !== 'key' &&
        propName !== 'ref' &&
        propName !== '__self' &&
        propName !== '__source' &&
        !(propName === 'ref' && config.ref === undefined)
      ) {
        props[propName] = config[propName];
      }
    }
  }

  const childrenLength = args.length;
  if (childrenLength === 1) {
    props.children = args[0];
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = args[i];
    }
    props.children = childArray;
  }

  return ReactElement(element.type, key, ref, props);
}

export function isValidElement(object: any): object is ReactElementType {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}

export function cloneAndReplaceKey(
  oldElement: ReactElementType,
  newKey: string | null,
): ReactElementType {
  return ReactElement(
    oldElement.type,
    newKey,
    oldElement.ref,
    oldElement.props,
  );
}
