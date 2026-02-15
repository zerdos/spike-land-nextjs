import { NoLanes, mergeLanes, isSubsetOfLanes } from './ReactFiberLane.js';
function createCursor(defaultValue) {
    return { current: defaultValue };
}
const valueStack = [];
let index = -1;
function push(cursor, value) {
    index++;
    valueStack[index] = cursor.current;
    cursor.current = value;
}
function pop(cursor) {
    if (index < 0) {
        return;
    }
    cursor.current = valueStack[index];
    valueStack[index] = null;
    index--;
}
const valueCursor = createCursor(null);
let currentlyRenderingFiber = null;
let lastContextDependency = null;
export function resetContextDependencies() {
    currentlyRenderingFiber = null;
    lastContextDependency = null;
}
export function pushProvider(providerFiber, context, nextValue) {
    push(valueCursor, context._currentValue);
    context._currentValue = nextValue;
}
export function popProvider(context, _providerFiber) {
    const currentValue = valueCursor.current;
    context._currentValue = currentValue;
    pop(valueCursor);
}
export function readContext(context) {
    return readContextForConsumer(currentlyRenderingFiber, context);
}
export function prepareToReadContext(workInProgress, renderLanes) {
    currentlyRenderingFiber = workInProgress;
    lastContextDependency = null;
    const dependencies = workInProgress.dependencies;
    if (dependencies !== null) {
        // Reset the context dependency list
        const firstContext = dependencies.firstContext;
        if (firstContext !== null) {
            if ((dependencies.lanes & renderLanes) !== NoLanes) {
                // Context has changed, mark that we performed work
            }
            // Reset the list
            dependencies.firstContext = null;
        }
    }
}
function readContextForConsumer(consumer, context) {
    const value = context._currentValue;
    if (consumer === null) {
        return value;
    }
    const contextItem = {
        context,
        memoizedValue: value,
        next: null,
    };
    if (lastContextDependency === null) {
        // This is the first dependency for this fiber
        if (consumer.dependencies === null) {
            consumer.dependencies = {
                lanes: NoLanes,
                firstContext: contextItem,
            };
        }
        else {
            consumer.dependencies.firstContext = contextItem;
        }
        lastContextDependency = contextItem;
    }
    else {
        // Append to the existing list
        lastContextDependency = lastContextDependency.next = contextItem;
    }
    return value;
}
// Check if context has changed since the last render
export function propagateContextChange(workInProgress, context, renderLanes) {
    let fiber = workInProgress.child;
    if (fiber !== null) {
        fiber.return = workInProgress;
    }
    while (fiber !== null) {
        const dependencies = fiber.dependencies;
        if (dependencies !== null) {
            let nextFiber = fiber.child;
            let dependency = dependencies.firstContext;
            while (dependency !== null) {
                if (dependency.context === context) {
                    // Found a match. Schedule an update on this fiber.
                    fiber.lanes = mergeLanes(fiber.lanes, renderLanes);
                    const alternate = fiber.alternate;
                    if (alternate !== null) {
                        alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
                    }
                    // Propagate the changed lanes up the return path
                    scheduleContextWorkOnParentPath(fiber.return, renderLanes);
                    // Mark that this dependency has changed
                    dependencies.lanes = mergeLanes(dependencies.lanes, renderLanes);
                    break;
                }
                dependency = dependency.next;
            }
            // Continue traversal from child or sibling
            if (nextFiber !== null) {
                nextFiber.return = fiber;
            }
            fiber = nextFiber;
            continue;
        }
        // Traverse children
        if (fiber.child !== null) {
            fiber.child.return = fiber;
            fiber = fiber.child;
            continue;
        }
        if (fiber === workInProgress) {
            return;
        }
        while (fiber.sibling === null) {
            if (fiber.return === null || fiber.return === workInProgress) {
                return;
            }
            fiber = fiber.return;
        }
        fiber.sibling.return = fiber.return;
        fiber = fiber.sibling;
    }
}
function scheduleContextWorkOnParentPath(parent, renderLanes) {
    let node = parent;
    while (node !== null) {
        const alternate = node.alternate;
        if (!isSubsetOfLanes(node.childLanes, renderLanes)) {
            node.childLanes = mergeLanes(node.childLanes, renderLanes);
            if (alternate !== null) {
                alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
            }
        }
        else if (alternate !== null &&
            !isSubsetOfLanes(alternate.childLanes, renderLanes)) {
            alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
        }
        else {
            // Already updated
            break;
        }
        node = node.return;
    }
}
//# sourceMappingURL=ReactFiberNewContext.js.map