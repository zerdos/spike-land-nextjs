import { Placement, ChildDeletion } from './ReactFiberFlags.js';
import { HostText, Fragment } from './ReactWorkTags.js';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, REACT_LAZY_TYPE, getIteratorFn, } from '../react/ReactSymbols.js';
import { createFiberFromElement, createFiberFromText, createFiberFromFragment, createWorkInProgress, } from './ReactFiber.js';
function coerceRef(fiber, element) {
    const ref = element.ref;
    if (ref !== null && ref !== undefined) {
        fiber.ref = ref;
    }
}
// Creates the child fiber reconciler functions as a closure over shouldTrackSideEffects
function createChildReconciler(shouldTrackSideEffects) {
    function deleteChild(returnFiber, childToDelete) {
        if (!shouldTrackSideEffects) {
            return;
        }
        const deletions = returnFiber.deletions;
        if (deletions === null) {
            returnFiber.deletions = [childToDelete];
            returnFiber.flags |= ChildDeletion;
        }
        else {
            deletions.push(childToDelete);
        }
    }
    function deleteRemainingChildren(returnFiber, currentFirstChild) {
        if (!shouldTrackSideEffects) {
            return null;
        }
        let childToDelete = currentFirstChild;
        while (childToDelete !== null) {
            deleteChild(returnFiber, childToDelete);
            childToDelete = childToDelete.sibling;
        }
        return null;
    }
    function mapRemainingChildren(currentFirstChild) {
        const existingChildren = new Map();
        let existingChild = currentFirstChild;
        while (existingChild !== null) {
            if (existingChild.key === null) {
                existingChildren.set(existingChild.index, existingChild);
            }
            else {
                existingChildren.set(existingChild.key, existingChild);
            }
            existingChild = existingChild.sibling;
        }
        return existingChildren;
    }
    function reuseFiber(fiber, pendingProps) {
        const clone = createWorkInProgress(fiber, pendingProps);
        clone.index = 0;
        clone.sibling = null;
        return clone;
    }
    function placeChild(newFiber, lastPlacedIndex, newIndex) {
        newFiber.index = newIndex;
        if (!shouldTrackSideEffects) {
            return lastPlacedIndex;
        }
        const current = newFiber.alternate;
        if (current !== null) {
            const oldIndex = current.index;
            if (oldIndex < lastPlacedIndex) {
                // This is a move.
                newFiber.flags |= Placement;
                return lastPlacedIndex;
            }
            else {
                return oldIndex;
            }
        }
        else {
            // This is an insertion.
            newFiber.flags |= Placement;
            return lastPlacedIndex;
        }
    }
    function placeSingleChild(newFiber) {
        if (shouldTrackSideEffects && newFiber.alternate === null) {
            newFiber.flags |= Placement;
        }
        return newFiber;
    }
    // Create a fiber from a child element (dispatch by type)
    function createChild(returnFiber, newChild, lanes) {
        if ((typeof newChild === 'string' && newChild !== '') ||
            typeof newChild === 'number' ||
            typeof newChild === 'bigint') {
            const created = createFiberFromText('' + newChild, lanes);
            created.return = returnFiber;
            return created;
        }
        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE: {
                    const created = createFiberFromElement(newChild, lanes);
                    coerceRef(created, newChild);
                    created.return = returnFiber;
                    return created;
                }
                case REACT_LAZY_TYPE: {
                    const payload = newChild._payload;
                    const init = newChild._init;
                    return createChild(returnFiber, init(payload), lanes);
                }
            }
            if (Array.isArray(newChild)) {
                const created = createFiberFromFragment(newChild, lanes, null);
                created.return = returnFiber;
                return created;
            }
            const iteratorFn = getIteratorFn(newChild);
            if (iteratorFn) {
                const iterator = iteratorFn.call(newChild);
                const arr = [];
                let step = iterator.next();
                while (!step.done) {
                    arr.push(step.value);
                    step = iterator.next();
                }
                const created = createFiberFromFragment(arr, lanes, null);
                created.return = returnFiber;
                return created;
            }
        }
        return null;
    }
    function updateSlot(returnFiber, oldFiber, newChild, lanes) {
        const key = oldFiber !== null ? oldFiber.key : null;
        if ((typeof newChild === 'string' && newChild !== '') ||
            typeof newChild === 'number' ||
            typeof newChild === 'bigint') {
            if (key !== null) {
                return null;
            }
            return updateTextNode(returnFiber, oldFiber, '' + newChild, lanes);
        }
        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE: {
                    if (newChild.key === key) {
                        return updateElement(returnFiber, oldFiber, newChild, lanes);
                    }
                    else {
                        return null;
                    }
                }
                case REACT_LAZY_TYPE: {
                    const payload = newChild._payload;
                    const init = newChild._init;
                    return updateSlot(returnFiber, oldFiber, init(payload), lanes);
                }
            }
            if (Array.isArray(newChild)) {
                if (key !== null) {
                    return null;
                }
                return updateFragment(returnFiber, oldFiber, newChild, lanes, null);
            }
        }
        return null;
    }
    function updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes) {
        if ((typeof newChild === 'string' && newChild !== '') ||
            typeof newChild === 'number' ||
            typeof newChild === 'bigint') {
            const matchedFiber = existingChildren.get(newIdx) || null;
            return updateTextNode(returnFiber, matchedFiber, '' + newChild, lanes);
        }
        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE: {
                    const el = newChild;
                    const matchedFiber = existingChildren.get(el.key === null ? newIdx : el.key) || null;
                    return updateElement(returnFiber, matchedFiber, el, lanes);
                }
                case REACT_LAZY_TYPE: {
                    const payload = newChild._payload;
                    const init = newChild._init;
                    return updateFromMap(existingChildren, returnFiber, newIdx, init(payload), lanes);
                }
            }
            if (Array.isArray(newChild)) {
                const matchedFiber = existingChildren.get(newIdx) || null;
                return updateFragment(returnFiber, matchedFiber, newChild, lanes, null);
            }
        }
        return null;
    }
    function updateTextNode(returnFiber, current, textContent, lanes) {
        if (current === null || current.tag !== HostText) {
            const created = createFiberFromText(textContent, lanes);
            created.return = returnFiber;
            return created;
        }
        else {
            const existing = reuseFiber(current, textContent);
            existing.return = returnFiber;
            return existing;
        }
    }
    function updateElement(returnFiber, current, element, lanes) {
        const elementType = element.type;
        if (elementType === REACT_FRAGMENT_TYPE) {
            return updateFragment(returnFiber, current, element.props.children, lanes, element.key);
        }
        if (current !== null) {
            if (current.elementType === elementType) {
                const existing = reuseFiber(current, element.props);
                coerceRef(existing, element);
                existing.return = returnFiber;
                return existing;
            }
        }
        const created = createFiberFromElement(element, lanes);
        coerceRef(created, element);
        created.return = returnFiber;
        return created;
    }
    function updateFragment(returnFiber, current, fragment, lanes, key) {
        if (current === null || current.tag !== Fragment) {
            const created = createFiberFromFragment(fragment, lanes, key);
            created.return = returnFiber;
            return created;
        }
        else {
            const existing = reuseFiber(current, fragment);
            existing.return = returnFiber;
            return existing;
        }
    }
    function reconcileSingleElement(returnFiber, currentFirstChild, element, lanes) {
        const key = element.key;
        let child = currentFirstChild;
        while (child !== null) {
            if (child.key === key) {
                const elementType = element.type;
                if (elementType === REACT_FRAGMENT_TYPE) {
                    if (child.tag === Fragment) {
                        deleteRemainingChildren(returnFiber, child.sibling);
                        const existing = reuseFiber(child, element.props.children);
                        existing.return = returnFiber;
                        return existing;
                    }
                }
                else {
                    if (child.elementType === elementType) {
                        deleteRemainingChildren(returnFiber, child.sibling);
                        const existing = reuseFiber(child, element.props);
                        coerceRef(existing, element);
                        existing.return = returnFiber;
                        return existing;
                    }
                }
                deleteRemainingChildren(returnFiber, child);
                break;
            }
            else {
                deleteChild(returnFiber, child);
            }
            child = child.sibling;
        }
        if (element.type === REACT_FRAGMENT_TYPE) {
            const created = createFiberFromFragment(element.props.children, lanes, element.key);
            created.return = returnFiber;
            return created;
        }
        else {
            const created = createFiberFromElement(element, lanes);
            coerceRef(created, element);
            created.return = returnFiber;
            return created;
        }
    }
    function reconcileSingleTextNode(returnFiber, currentFirstChild, textContent, lanes) {
        if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
            deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
            const existing = reuseFiber(currentFirstChild, textContent);
            existing.return = returnFiber;
            return existing;
        }
        deleteRemainingChildren(returnFiber, currentFirstChild);
        const created = createFiberFromText(textContent, lanes);
        created.return = returnFiber;
        return created;
    }
    function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, lanes) {
        let resultingFirstChild = null;
        let previousNewFiber = null;
        let oldFiber = currentFirstChild;
        let lastPlacedIndex = 0;
        let newIdx = 0;
        let nextOldFiber = null;
        // First pass: walk both lists in parallel
        for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
            if (oldFiber.index > newIdx) {
                nextOldFiber = oldFiber;
                oldFiber = null;
            }
            else {
                nextOldFiber = oldFiber.sibling;
            }
            const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], lanes);
            if (newFiber === null) {
                if (oldFiber === null) {
                    oldFiber = nextOldFiber;
                }
                break;
            }
            if (shouldTrackSideEffects) {
                if (oldFiber && newFiber.alternate === null) {
                    deleteChild(returnFiber, oldFiber);
                }
            }
            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
            if (previousNewFiber === null) {
                resultingFirstChild = newFiber;
            }
            else {
                previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
            oldFiber = nextOldFiber;
        }
        if (newIdx === newChildren.length) {
            deleteRemainingChildren(returnFiber, oldFiber);
            return resultingFirstChild;
        }
        if (oldFiber === null) {
            for (; newIdx < newChildren.length; newIdx++) {
                const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
                if (newFiber === null) {
                    continue;
                }
                lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    resultingFirstChild = newFiber;
                }
                else {
                    previousNewFiber.sibling = newFiber;
                }
                previousNewFiber = newFiber;
            }
            return resultingFirstChild;
        }
        // Second pass: use a map for lookups
        const existingChildren = mapRemainingChildren(oldFiber);
        for (; newIdx < newChildren.length; newIdx++) {
            const newFiber = updateFromMap(existingChildren, returnFiber, newIdx, newChildren[newIdx], lanes);
            if (newFiber !== null) {
                if (shouldTrackSideEffects) {
                    const currentFiber = newFiber.alternate;
                    if (currentFiber !== null) {
                        existingChildren.delete(currentFiber.key === null ? newIdx : currentFiber.key);
                    }
                }
                lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
                if (previousNewFiber === null) {
                    resultingFirstChild = newFiber;
                }
                else {
                    previousNewFiber.sibling = newFiber;
                }
                previousNewFiber = newFiber;
            }
        }
        if (shouldTrackSideEffects) {
            existingChildren.forEach(child => deleteChild(returnFiber, child));
        }
        return resultingFirstChild;
    }
    function reconcileChildFibers(returnFiber, currentFirstChild, newChild, lanes) {
        // Handle top-level unkeyed fragments as arrays
        if (typeof newChild === 'object' &&
            newChild !== null &&
            newChild.type === REACT_FRAGMENT_TYPE &&
            newChild.key === null) {
            newChild = newChild.props.children;
        }
        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild, lanes));
                case REACT_LAZY_TYPE: {
                    const payload = newChild._payload;
                    const init = newChild._init;
                    return reconcileChildFibers(returnFiber, currentFirstChild, init(payload), lanes);
                }
            }
            if (Array.isArray(newChild)) {
                return reconcileChildrenArray(returnFiber, currentFirstChild, newChild, lanes);
            }
            const iteratorFn = getIteratorFn(newChild);
            if (iteratorFn) {
                const iterator = iteratorFn.call(newChild);
                const arr = [];
                let step = iterator.next();
                while (!step.done) {
                    arr.push(step.value);
                    step = iterator.next();
                }
                return reconcileChildrenArray(returnFiber, currentFirstChild, arr, lanes);
            }
        }
        if ((typeof newChild === 'string' && newChild !== '') ||
            typeof newChild === 'number' ||
            typeof newChild === 'bigint') {
            return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFirstChild, '' + newChild, lanes));
        }
        return deleteRemainingChildren(returnFiber, currentFirstChild);
    }
    return reconcileChildFibers;
}
export const reconcileChildFibers = createChildReconciler(true);
export const mountChildFibers = createChildReconciler(false);
export function cloneChildFibers(current, workInProgress) {
    if (workInProgress.child === null) {
        return;
    }
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
//# sourceMappingURL=ReactChildFiber.js.map