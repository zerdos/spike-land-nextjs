import type { ReactElement } from './ReactTypes.js';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from './ReactSymbols.js';

const hasOwnProperty = Object.prototype.hasOwnProperty;

function jsxProd(type: any, config: any, maybeKey?: any): ReactElement {
  let key: string | null = null;

  if (maybeKey !== undefined) {
    key = '' + maybeKey;
  }

  if (config.key !== undefined) {
    key = '' + config.key;
  }

  let props: any;
  if (!('key' in config)) {
    props = config;
  } else {
    props = {} as Record<string, any>;
    for (const propName in config) {
      if (propName !== 'key') {
        props[propName] = config[propName];
      }
    }
  }

  const ref = props.ref !== undefined ? props.ref : null;

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    _owner: null,
  };
}

export const jsx = jsxProd;
export const jsxs = jsxProd;
export const Fragment = REACT_FRAGMENT_TYPE;
