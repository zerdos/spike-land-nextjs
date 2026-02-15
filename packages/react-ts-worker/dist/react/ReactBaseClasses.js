import assign from '../shared/assign.js';
const emptyObject = {};
const ReactNoopUpdateQueue = {
    enqueueSetState() { },
    enqueueForceUpdate() { },
};
export function Component(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
}
Component.prototype.isReactComponent = {};
Component.prototype.setState = function (partialState, callback) {
    if (typeof partialState !== 'object' &&
        typeof partialState !== 'function' &&
        partialState != null) {
        throw new Error('takes an object of state variables to update or a ' +
            'function which returns an object of state variables.');
    }
    this.updater.enqueueSetState(this, partialState, callback, 'setState');
};
Component.prototype.forceUpdate = function (callback) {
    this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};
function ComponentDummy() { }
ComponentDummy.prototype = Component.prototype;
export function PureComponent(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
}
const pureComponentPrototype = (PureComponent.prototype =
    new ComponentDummy());
pureComponentPrototype.constructor = PureComponent;
assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = true;
//# sourceMappingURL=ReactBaseClasses.js.map