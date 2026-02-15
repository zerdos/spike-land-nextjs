// BeginWork - Render phase down-traversal
// Processes each fiber and returns the next child to work on
import { FunctionComponent, ClassComponent, HostRoot, HostComponent, HostText, Fragment, ContextProvider, ForwardRef, MemoComponent, SimpleMemoComponent, SuspenseComponent, LazyComponent, } from './ReactWorkTags.js';
import { NoFlags, PerformedWork, ContentReset, Ref, DidCapture, RefStatic, } from './ReactFiberFlags.js';
import { NoLanes, includesSomeLane } from './ReactFiberLane.js';
import { REACT_MEMO_TYPE, REACT_FORWARD_REF_TYPE, } from '../react/ReactSymbols.js';
import { reconcileChildFibers, mountChildFibers } from './ReactChildFiber.js';
import { renderWithHooks, bailoutHooks } from './ReactFiberHooks.js';
import { pushProvider } from './ReactFiberNewContext.js';
import { pushHostContext, pushHostContainer } from './ReactFiberHostContext.js';
import { constructClassInstance, mountClassInstance, updateClassInstance, } from './ReactFiberClassComponent.js';
import { createFiberFromElement, createWorkInProgress } from './ReactFiber.js';
import shallowEqual from '../shared/shallowEqual.js';
function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
    if (current === null) {
        workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderLanes);
    }
    else {
        workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren, renderLanes);
    }
}
function markRef(current, workInProgress) {
    const ref = workInProgress.ref;
    if ((current === null && ref !== null) ||
        (current !== null && current.ref !== ref)) {
        workInProgress.flags |= Ref;
        workInProgress.flags |= RefStatic;
    }
}
function updateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes) {
    const nextChildren = renderWithHooks(current, workInProgress, Component, nextProps, null, renderLanes);
    if (current !== null && !didReceiveUpdate) {
        bailoutHooks(current, workInProgress, renderLanes);
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
    workInProgress.flags |= PerformedWork;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}
function updateClassComponent(current, workInProgress, Component, nextProps, renderLanes) {
    const Ctor = Component;
    let instance = workInProgress.stateNode;
    if (instance === null) {
        instance = constructClassInstance(workInProgress, Ctor, nextProps);
        mountClassInstance(workInProgress, Ctor, nextProps, renderLanes);
    }
    else if (current === null) {
        // Re-mount (component was previously deleted but fiber is being reused)
        mountClassInstance(workInProgress, Ctor, nextProps, renderLanes);
    }
    else {
        const shouldUpdate = updateClassInstance(current, workInProgress, Ctor, nextProps, renderLanes);
        if (!shouldUpdate) {
            return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
        }
    }
    const nextChildren = instance.render();
    workInProgress.flags |= PerformedWork;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}
function updateHostRoot(current, workInProgress, renderLanes) {
    pushHostContainer(workInProgress);
    const nextChildren = workInProgress.memoizedState?.element ?? null;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}
function updateHostComponent(current, workInProgress, renderLanes) {
    pushHostContext(workInProgress);
    const _type = workInProgress.type;
    const nextProps = workInProgress.pendingProps;
    const prevProps = current !== null ? current.memoizedProps : null;
    let nextChildren = nextProps.children;
    // Check if the host config says this component should set text content
    const isDirectTextChild = typeof nextChildren === 'string' || typeof nextChildren === 'number';
    if (isDirectTextChild) {
        nextChildren = null;
    }
    else if (prevProps !== null) {
        const prevIsDirectTextChild = typeof prevProps.children === 'string' || typeof prevProps.children === 'number';
        if (prevIsDirectTextChild) {
            workInProgress.flags |= ContentReset;
        }
    }
    markRef(current, workInProgress);
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}
function updateHostText(_current, _workInProgress) {
    // Nothing to do for text nodes in beginWork
    return null;
}
function updateFragment(current, workInProgress, renderLanes) {
    const nextChildren = workInProgress.pendingProps;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}
function updateContextProvider(current, workInProgress, renderLanes) {
    const context = workInProgress.type;
    const newProps = workInProgress.pendingProps;
    const newValue = newProps.value;
    pushProvider(workInProgress, context, newValue);
    const newChildren = newProps.children;
    reconcileChildren(current, workInProgress, newChildren, renderLanes);
    return workInProgress.child;
}
function updateForwardRef(current, workInProgress, Component, nextProps, renderLanes) {
    const render = Component.render;
    const ref = workInProgress.ref;
    const nextChildren = renderWithHooks(current, workInProgress, render, nextProps, ref, renderLanes);
    if (current !== null && !didReceiveUpdate) {
        bailoutHooks(current, workInProgress, renderLanes);
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
    workInProgress.flags |= PerformedWork;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}
function updateMemoComponent(current, workInProgress, Component, nextProps, renderLanes) {
    const comp = Component;
    if (current === null) {
        const _type = comp.type;
        if (typeof _type === 'function' &&
            comp.compare === null &&
            comp.defaultProps === undefined) {
            // Simple memo shortcut
            workInProgress.tag = SimpleMemoComponent;
            workInProgress.type = _type;
            return updateSimpleMemoComponent(current, workInProgress, _type, nextProps, renderLanes);
        }
        const child = createFiberFromElement({
            $$typeof: Symbol.for('react.transitional.element'),
            type: _type,
            key: null,
            ref: null,
            props: nextProps,
            _owner: null,
        }, renderLanes);
        child.ref = workInProgress.ref;
        child.return = workInProgress;
        workInProgress.child = child;
        return child;
    }
    // Update path
    const currentChild = current.child;
    const prevProps = currentChild.memoizedProps;
    const compare = (comp.compare || shallowEqual);
    if (compare(prevProps, nextProps) && current.ref === workInProgress.ref) {
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
    workInProgress.flags |= PerformedWork;
    const newChild = createFiberFromElement({
        $$typeof: Symbol.for('react.transitional.element'),
        type: comp.type,
        key: null,
        ref: null,
        props: nextProps,
        _owner: null,
    }, renderLanes);
    newChild.ref = workInProgress.ref;
    newChild.return = workInProgress;
    workInProgress.child = newChild;
    return newChild;
}
function updateSimpleMemoComponent(current, workInProgress, Component, nextProps, renderLanes) {
    if (current !== null) {
        const prevProps = current.memoizedProps;
        if (shallowEqual(prevProps, nextProps) &&
            current.ref === workInProgress.ref) {
            didReceiveUpdate = false;
            workInProgress.pendingProps = nextProps = prevProps;
            return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
        }
    }
    return updateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes);
}
function updateSuspenseComponent(current, workInProgress, renderLanes) {
    const nextProps = workInProgress.pendingProps;
    const showFallback = (workInProgress.flags & DidCapture) !== NoFlags;
    if (showFallback) {
        workInProgress.flags &= ~DidCapture;
        const fallback = nextProps.fallback;
        const _primaryChildren = nextProps.children;
        // Render fallback
        reconcileChildren(current, workInProgress, fallback, renderLanes);
        return workInProgress.child;
    }
    // Normal render - show primary content
    const primaryChildren = nextProps.children;
    reconcileChildren(current, workInProgress, primaryChildren, renderLanes);
    return workInProgress.child;
}
function updateLazyComponent(current, workInProgress, lazyComponent, nextProps, renderLanes) {
    const payload = lazyComponent._payload;
    const init = lazyComponent._init;
    const Component = init(payload);
    workInProgress.type = Component;
    if (typeof Component === 'function') {
        if (isClassComponent(Component)) {
            workInProgress.tag = ClassComponent;
            return updateClassComponent(current, workInProgress, Component, nextProps, renderLanes);
        }
        workInProgress.tag = FunctionComponent;
        return updateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes);
    }
    if (typeof Component === 'object' && Component !== null) {
        if (Component.$$typeof === REACT_FORWARD_REF_TYPE) {
            workInProgress.tag = ForwardRef;
            return updateForwardRef(current, workInProgress, Component, nextProps, renderLanes);
        }
        if (Component.$$typeof === REACT_MEMO_TYPE) {
            workInProgress.tag = MemoComponent;
            return updateMemoComponent(current, workInProgress, Component, nextProps, renderLanes);
        }
    }
    throw new Error(`Element type is invalid. Received a promise that resolves to: ${Component}. ` +
        'Lazy element type must resolve to a class or function.');
}
function isClassComponent(Component) {
    const proto = Component.prototype;
    return !!(proto && proto.isReactComponent);
}
// Track whether we received an update during this beginWork
let didReceiveUpdate = false;
export function markWorkInProgressReceivedUpdate() {
    didReceiveUpdate = true;
}
function bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes) {
    if (!includesSomeLane(workInProgress.childLanes, renderLanes)) {
        // No pending work in children
        return null;
    }
    // Clone children - this fiber doesn't need work but children might
    cloneChildFibers(current, workInProgress);
    return workInProgress.child;
}
function cloneChildFibers(current, workInProgress) {
    if (workInProgress.child === null)
        return;
    let currentChild = workInProgress.child;
    let newChild = createWorkInProgress(currentChild, currentChild.pendingProps);
    workInProgress.child = newChild;
    newChild.return = workInProgress;
    while (currentChild.sibling !== null) {
        currentChild = currentChild.sibling;
        newChild = newChild.sibling = createWorkInProgress(currentChild, currentChild.pendingProps);
        newChild.return = workInProgress;
    }
    newChild.sibling = null;
}
export function beginWork(current, workInProgress, renderLanes) {
    didReceiveUpdate = false;
    // Check if we can bail out
    if (current !== null) {
        const oldProps = current.memoizedProps;
        const newProps = workInProgress.pendingProps;
        if (oldProps !== newProps) {
            didReceiveUpdate = true;
        }
        else if (!includesSomeLane(renderLanes, workInProgress.lanes)) {
            didReceiveUpdate = false;
            // Push contexts as needed even during bailout
            switch (workInProgress.tag) {
                case HostRoot:
                    pushHostContainer(workInProgress);
                    break;
                case HostComponent:
                    pushHostContext(workInProgress);
                    break;
                case ContextProvider: {
                    const context = workInProgress.type;
                    pushProvider(workInProgress, context, workInProgress.memoizedProps.value);
                    break;
                }
            }
            return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
        }
    }
    // Clear lanes before processing - they'll be set again if needed
    workInProgress.lanes = NoLanes;
    switch (workInProgress.tag) {
        case FunctionComponent: {
            const Component = workInProgress.type;
            const unresolvedProps = workInProgress.pendingProps;
            return updateFunctionComponent(current, workInProgress, Component, unresolvedProps, renderLanes);
        }
        case ClassComponent: {
            const Component = workInProgress.type;
            const unresolvedProps = workInProgress.pendingProps;
            return updateClassComponent(current, workInProgress, Component, unresolvedProps, renderLanes);
        }
        case HostRoot:
            return updateHostRoot(current, workInProgress, renderLanes);
        case HostComponent:
            return updateHostComponent(current, workInProgress, renderLanes);
        case HostText:
            return updateHostText(current, workInProgress);
        case Fragment:
            return updateFragment(current, workInProgress, renderLanes);
        case ContextProvider:
            return updateContextProvider(current, workInProgress, renderLanes);
        case ForwardRef: {
            const type = workInProgress.type;
            const unresolvedProps = workInProgress.pendingProps;
            return updateForwardRef(current, workInProgress, type, unresolvedProps, renderLanes);
        }
        case MemoComponent: {
            const type = workInProgress.type;
            const unresolvedProps = workInProgress.pendingProps;
            return updateMemoComponent(current, workInProgress, type, unresolvedProps, renderLanes);
        }
        case SimpleMemoComponent:
            return updateSimpleMemoComponent(current, workInProgress, workInProgress.type, workInProgress.pendingProps, renderLanes);
        case SuspenseComponent:
            return updateSuspenseComponent(current, workInProgress, renderLanes);
        case LazyComponent: {
            const elementType = workInProgress.elementType;
            return updateLazyComponent(current, workInProgress, elementType, workInProgress.pendingProps, renderLanes);
        }
        default:
            throw new Error(`Unknown work tag: ${workInProgress.tag}`);
    }
}
//# sourceMappingURL=ReactFiberBeginWork.js.map