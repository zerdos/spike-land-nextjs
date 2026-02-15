// CommitWork - Commit phase: apply fiber effects to the host tree
// Three sub-phases: before mutation, mutation, layout
import { FunctionComponent, ClassComponent, HostRoot, HostComponent, HostText, ForwardRef, MemoComponent, SimpleMemoComponent, } from './ReactWorkTags.js';
import { NoFlags, Placement, Update, ChildDeletion, ContentReset, Ref, Snapshot, Passive, LayoutMask, MutationMask, PassiveMask, BeforeMutationMask, } from './ReactFiberFlags.js';
// HookEffect flags
const HookHasEffect = 0b0001;
const HookPassive = 0b1000;
const HookLayout = 0b0100;
const HookInsertion = 0b0010;
function getHostConfig(fiber) {
    let node = fiber;
    while (node !== null) {
        if (node.tag === HostRoot) {
            return node.stateNode.hostConfig;
        }
        node = node.return;
    }
    throw new Error('Could not find host config');
}
function getHostParent(fiber) {
    let node = fiber.return;
    while (node !== null) {
        if (node.tag === HostComponent) {
            return { parent: node.stateNode, isContainer: false };
        }
        if (node.tag === HostRoot) {
            return { parent: node.stateNode.containerInfo, isContainer: true };
        }
        node = node.return;
    }
    throw new Error('Could not find host parent');
}
function getHostSibling(fiber) {
    let node = fiber;
    siblings: while (true) {
        while (node.sibling === null) {
            if (node.return === null || isHostParent(node.return)) {
                return null;
            }
            node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
        while (node.tag !== HostComponent && node.tag !== HostText) {
            if (node.flags & Placement) {
                continue siblings;
            }
            if (node.child === null) {
                continue siblings;
            }
            node.child.return = node;
            node = node.child;
        }
        if (!(node.flags & Placement)) {
            return node.stateNode;
        }
    }
}
function isHostParent(fiber) {
    return fiber.tag === HostComponent || fiber.tag === HostRoot;
}
// ─── Before Mutation Phase ───────────────────────────────────────────────
export function commitBeforeMutationEffects(root, finishedWork) {
    commitBeforeMutationEffectsOnFiber(finishedWork);
}
function commitBeforeMutationEffectsOnFiber(fiber) {
    // Process children first
    let child = fiber.child;
    if ((fiber.subtreeFlags & BeforeMutationMask) !== NoFlags && child !== null) {
        while (child !== null) {
            commitBeforeMutationEffectsOnFiber(child);
            child = child.sibling;
        }
    }
    if ((fiber.flags & Snapshot) !== NoFlags) {
        if (fiber.tag === ClassComponent) {
            const instance = fiber.stateNode;
            const current = fiber.alternate;
            if (current !== null && typeof instance.getSnapshotBeforeUpdate === 'function') {
                instance.getSnapshotBeforeUpdate(current.memoizedProps, current.memoizedState);
            }
        }
    }
}
// ─── Mutation Phase ─────────────────────────────────────────────────────
export function commitMutationEffects(root, finishedWork) {
    commitMutationEffectsOnFiber(finishedWork, root);
}
function commitMutationEffectsOnFiber(fiber, root) {
    const hostConfig = root.hostConfig;
    // Process children first
    let child = fiber.child;
    if ((fiber.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
        while (child !== null) {
            commitMutationEffectsOnFiber(child, root);
            child = child.sibling;
        }
    }
    const flags = fiber.flags;
    // Handle deletions
    if (flags & ChildDeletion) {
        const deletions = fiber.deletions;
        if (deletions !== null) {
            for (let i = 0; i < deletions.length; i++) {
                commitDeletion(root, deletions[i], fiber, hostConfig);
            }
        }
    }
    // Handle placement (insertion)
    if (flags & Placement) {
        commitPlacement(fiber, hostConfig);
        fiber.flags &= ~Placement;
    }
    // Handle updates
    if (flags & Update) {
        switch (fiber.tag) {
            case FunctionComponent:
            case ForwardRef:
            case MemoComponent:
            case SimpleMemoComponent: {
                // Commit insertion effects
                commitHookEffectListUnmount(HookInsertion | HookHasEffect, fiber);
                commitHookEffectListMount(HookInsertion | HookHasEffect, fiber);
                break;
            }
            case HostComponent: {
                const instance = fiber.stateNode;
                if (instance !== null) {
                    const newProps = fiber.memoizedProps;
                    const oldProps = fiber.alternate !== null
                        ? fiber.alternate.memoizedProps
                        : newProps;
                    hostConfig.commitUpdate(instance, fiber.type, oldProps, newProps);
                }
                break;
            }
            case HostText: {
                const textInstance = fiber.stateNode;
                const newText = fiber.memoizedProps;
                const oldText = fiber.alternate !== null
                    ? fiber.alternate.memoizedProps
                    : newText;
                if (textInstance !== null) {
                    hostConfig.commitTextUpdate(textInstance, oldText, newText);
                }
                break;
            }
        }
    }
    // Handle content reset
    if (flags & ContentReset) {
        if (fiber.tag === HostComponent) {
            hostConfig.resetTextContent(fiber.stateNode);
        }
    }
    // Handle ref
    if (flags & Ref) {
        const current = fiber.alternate;
        if (current !== null) {
            commitDetachRef(current);
        }
    }
}
function commitPlacement(finishedWork, hostConfig) {
    const { parent, isContainer } = getHostParent(finishedWork);
    const before = getHostSibling(finishedWork);
    if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
        const stateNode = finishedWork.stateNode;
        if (before !== null) {
            if (isContainer) {
                hostConfig.insertInContainerBefore(parent, stateNode, before);
            }
            else {
                hostConfig.insertBefore(parent, stateNode, before);
            }
        }
        else {
            if (isContainer) {
                hostConfig.appendChildToContainer(parent, stateNode);
            }
            else {
                hostConfig.appendChild(parent, stateNode);
            }
        }
    }
    else {
        // Composite component - traverse to find host children
        let child = finishedWork.child;
        while (child !== null) {
            commitPlacement(child, hostConfig);
            child = child.sibling;
        }
    }
}
function commitDeletion(root, childToDelete, hostParentFiber, hostConfig) {
    // Find host parent
    const { parent, isContainer } = getHostParent(hostParentFiber);
    // Unmount the subtree
    commitNestedUnmounts(childToDelete, root);
    // Remove from host tree
    removeHostChildren(childToDelete, parent, isContainer, hostConfig);
}
function removeHostChildren(fiber, parent, isContainer, hostConfig) {
    if (fiber.tag === HostComponent || fiber.tag === HostText) {
        if (isContainer) {
            hostConfig.removeChildFromContainer(parent, fiber.stateNode);
        }
        else {
            hostConfig.removeChild(parent, fiber.stateNode);
        }
    }
    else {
        let child = fiber.child;
        while (child !== null) {
            removeHostChildren(child, parent, isContainer, hostConfig);
            child = child.sibling;
        }
    }
}
function commitNestedUnmounts(fiber, root) {
    let node = fiber;
    while (true) {
        commitUnmount(node, root);
        if (node.child !== null) {
            node.child.return = node;
            node = node.child;
            continue;
        }
        if (node === fiber)
            return;
        while (node.sibling === null) {
            if (node.return === null || node.return === fiber)
                return;
            node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
    }
}
function commitUnmount(fiber, _root) {
    switch (fiber.tag) {
        case FunctionComponent:
        case ForwardRef:
        case MemoComponent:
        case SimpleMemoComponent: {
            // Unmount layout effects synchronously
            commitHookEffectListUnmount(HookLayout | HookHasEffect, fiber);
            // Schedule passive effect cleanup
            break;
        }
        case ClassComponent: {
            const instance = fiber.stateNode;
            if (instance !== null && typeof instance.componentWillUnmount === 'function') {
                instance.componentWillUnmount();
            }
            break;
        }
    }
    // Detach ref
    commitDetachRef(fiber);
}
function commitDetachRef(fiber) {
    const ref = fiber.ref;
    if (ref !== null) {
        if (typeof ref === 'function') {
            ref(null);
        }
        else if (typeof ref === 'object') {
            ref.current = null;
        }
    }
}
// ─── Layout Phase ───────────────────────────────────────────────────────
export function commitLayoutEffects(root, finishedWork) {
    commitLayoutEffectsOnFiber(finishedWork, root);
}
function commitLayoutEffectsOnFiber(fiber, root) {
    // Process children first
    let child = fiber.child;
    if ((fiber.subtreeFlags & LayoutMask) !== NoFlags && child !== null) {
        while (child !== null) {
            commitLayoutEffectsOnFiber(child, root);
            child = child.sibling;
        }
    }
    const flags = fiber.flags;
    if (flags & (Update | Ref)) {
        const current = fiber.alternate;
        switch (fiber.tag) {
            case FunctionComponent:
            case ForwardRef:
            case SimpleMemoComponent: {
                if (flags & Update) {
                    commitHookEffectListMount(HookLayout | HookHasEffect, fiber);
                }
                break;
            }
            case ClassComponent: {
                if (flags & Update) {
                    const instance = fiber.stateNode;
                    if (current === null) {
                        if (typeof instance.componentDidMount === 'function') {
                            instance.componentDidMount();
                        }
                    }
                    else {
                        if (typeof instance.componentDidUpdate === 'function') {
                            instance.componentDidUpdate(current.memoizedProps, current.memoizedState, instance.__snapshot);
                        }
                    }
                }
                break;
            }
            case HostComponent: {
                // Auto-focus if needed
                if (current === null && flags & Update) {
                    const instance = fiber.stateNode;
                    if (fiber.memoizedProps?.autoFocus && typeof instance.focus === 'function') {
                        instance.focus();
                    }
                }
                break;
            }
        }
        // Attach ref
        if (flags & Ref) {
            commitAttachRef(fiber);
        }
    }
}
function commitAttachRef(fiber) {
    const ref = fiber.ref;
    if (ref === null)
        return;
    const instance = fiber.stateNode;
    if (typeof ref === 'function') {
        const cleanup = ref(instance);
        if (typeof cleanup === 'function') {
            fiber.refCleanup = cleanup;
        }
    }
    else if (typeof ref === 'object') {
        ref.current = instance;
    }
}
// ─── Passive Effects ─────────────────────────────────────────────────────
export function commitPassiveUnmountEffects(fiber) {
    commitPassiveUnmountOnFiber(fiber);
}
function commitPassiveUnmountOnFiber(fiber) {
    let child = fiber.child;
    if ((fiber.subtreeFlags & PassiveMask) !== NoFlags && child !== null) {
        while (child !== null) {
            commitPassiveUnmountOnFiber(child);
            child = child.sibling;
        }
    }
    if ((fiber.flags & Passive) !== NoFlags) {
        switch (fiber.tag) {
            case FunctionComponent:
            case ForwardRef:
            case SimpleMemoComponent: {
                commitHookEffectListUnmount(HookPassive | HookHasEffect, fiber);
                break;
            }
        }
    }
}
export function commitPassiveMountEffects(root, fiber) {
    commitPassiveMountOnFiber(root, fiber);
}
function commitPassiveMountOnFiber(root, fiber) {
    let child = fiber.child;
    if ((fiber.subtreeFlags & PassiveMask) !== NoFlags && child !== null) {
        while (child !== null) {
            commitPassiveMountOnFiber(root, child);
            child = child.sibling;
        }
    }
    if ((fiber.flags & Passive) !== NoFlags) {
        switch (fiber.tag) {
            case FunctionComponent:
            case ForwardRef:
            case SimpleMemoComponent: {
                commitHookEffectListMount(HookPassive | HookHasEffect, fiber);
                break;
            }
        }
    }
}
// ─── Hook Effect Helpers ─────────────────────────────────────────────────
function commitHookEffectListMount(flags, fiber) {
    const updateQueue = fiber.updateQueue;
    if (updateQueue === null)
        return;
    const lastEffect = updateQueue.lastEffect;
    if (lastEffect === null)
        return;
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
        if (effect === null)
            break;
        if ((effect.tag & flags) === flags) {
            const create = effect.create;
            const destroy = create();
            effect.destroy = destroy;
        }
        effect = effect.next;
    } while (effect !== firstEffect);
}
function commitHookEffectListUnmount(flags, fiber) {
    const updateQueue = fiber.updateQueue;
    if (updateQueue === null)
        return;
    const lastEffect = updateQueue.lastEffect;
    if (lastEffect === null)
        return;
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
        if (effect === null)
            break;
        if ((effect.tag & flags) === flags) {
            const destroy = effect.destroy;
            effect.destroy = null;
            if (typeof destroy === 'function') {
                destroy();
            }
        }
        effect = effect.next;
    } while (effect !== firstEffect);
}
//# sourceMappingURL=ReactFiberCommitWork.js.map