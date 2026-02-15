import type { ReactNode } from './ReactTypes.js';
import assign from '../shared/assign.js';

const emptyObject = {};

interface Updater {
  enqueueSetState(inst: any, payload: any, callback: any, callerName: string): void;
  enqueueForceUpdate(inst: any, callback: any, callerName: string): void;
}

const ReactNoopUpdateQueue: Updater = {
  enqueueSetState() {},
  enqueueForceUpdate() {},
};

export function Component(
  this: any,
  props: any,
  context: any,
  updater?: Updater,
) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}

Component.prototype.isReactComponent = {};

Component.prototype.setState = function (
  partialState: any,
  callback?: () => void,
) {
  if (
    typeof partialState !== 'object' &&
    typeof partialState !== 'function' &&
    partialState != null
  ) {
    throw new Error(
      'takes an object of state variables to update or a ' +
        'function which returns an object of state variables.',
    );
  }
  this.updater.enqueueSetState(this, partialState, callback, 'setState');
};

Component.prototype.forceUpdate = function (callback?: () => void) {
  this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};

function ComponentDummy(this: any) {}
ComponentDummy.prototype = Component.prototype;

export function PureComponent(
  this: any,
  props: any,
  context: any,
  updater?: Updater,
) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}

const pureComponentPrototype = (PureComponent.prototype =
  new (ComponentDummy as any)());
pureComponentPrototype.constructor = PureComponent;
assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = true;
