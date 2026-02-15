// CompleteWork - Render phase up-traversal
// Creates host instances, appends children, bubbles subtreeFlags

import type { Fiber, FiberRoot } from './ReactFiberTypes.js';
import type { Lanes } from './ReactFiberLane.js';
import type { HostConfig } from '../host-config/HostConfigInterface.js';
import {
  FunctionComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  Fragment,
  ContextProvider,
  ForwardRef,
  MemoComponent,
  SimpleMemoComponent,
  SuspenseComponent,
  LazyComponent,
} from './ReactWorkTags.js';
import {
  NoFlags,
  Update,
  Ref,
  RefStatic,
} from './ReactFiberFlags.js';
import { popProvider } from './ReactFiberNewContext.js';
import { popHostContext, popHostContainer, getHostContext } from './ReactFiberHostContext.js';

function bubbleProperties(completedWork: Fiber): void {
  let subtreeFlags = NoFlags;
  let child = completedWork.child;

  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child.return = completedWork;
    child = child.sibling;
  }

  completedWork.subtreeFlags |= subtreeFlags;
}

function appendAllChildren(
  parent: unknown,
  workInProgress: Fiber,
  hostConfig: HostConfig,
): void {
  let node = workInProgress.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      hostConfig.appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      // Traverse down into composite components
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === workInProgress) return;

    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) return;
      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
  }
}

function markUpdate(workInProgress: Fiber): void {
  workInProgress.flags |= Update;
}

function markRef(workInProgress: Fiber): void {
  workInProgress.flags |= Ref | RefStatic;
}

export function completeWork(
  current: Fiber | null,
  workInProgress: Fiber,
  _renderLanes: Lanes,
): Fiber | null {
  const newProps = workInProgress.pendingProps;

  switch (workInProgress.tag) {
    case FunctionComponent:
    case ClassComponent:
    case Fragment:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent:
    case LazyComponent:
      bubbleProperties(workInProgress);
      return null;

    case HostRoot: {
      popHostContainer(workInProgress);
      const _fiberRoot: FiberRoot = workInProgress.stateNode;
      if (current === null || current.child === null) {
        // First mount
      }
      bubbleProperties(workInProgress);
      return null;
    }

    case HostComponent: {
      popHostContext(workInProgress);
      const hostContext = getHostContext();
      const type = workInProgress.type;

      // Get host config from root
      let root: Fiber | null = workInProgress;
      while (root !== null && root.tag !== HostRoot) {
        root = root.return;
      }
      const fiberRoot: FiberRoot = root!.stateNode;
      const hostConfig = fiberRoot.hostConfig;

      if (current !== null && workInProgress.stateNode != null) {
        // Update
        const oldProps = current.memoizedProps;
        if (oldProps !== newProps) {
          markUpdate(workInProgress);
        }
        if (current.ref !== workInProgress.ref) {
          markRef(workInProgress);
        }
      } else {
        // Mount - create the DOM instance
        const instance = hostConfig.createInstance(
          type,
          newProps,
          fiberRoot.containerInfo,
          hostContext,
        );

        appendAllChildren(instance, workInProgress, hostConfig);
        workInProgress.stateNode = instance;

        if (hostConfig.finalizeInitialChildren(instance, type, newProps, hostContext)) {
          markUpdate(workInProgress);
        }

        if (workInProgress.ref !== null) {
          markRef(workInProgress);
        }
      }

      bubbleProperties(workInProgress);
      return null;
    }

    case HostText: {
      const newText = newProps;

      let root: Fiber | null = workInProgress;
      while (root !== null && root.tag !== HostRoot) {
        root = root.return;
      }
      const fiberRoot: FiberRoot = root!.stateNode;
      const hostConfig = fiberRoot.hostConfig;

      if (current !== null && workInProgress.stateNode != null) {
        // Update
        const oldText = current.memoizedProps;
        if (oldText !== newText) {
          markUpdate(workInProgress);
        }
      } else {
        // Mount
        const textInstance = hostConfig.createTextInstance(
          newText as string,
          fiberRoot.containerInfo,
          getHostContext(),
        );
        workInProgress.stateNode = textInstance;
      }

      bubbleProperties(workInProgress);
      return null;
    }

    case ContextProvider: {
      const context = workInProgress.type;
      popProvider(context);
      bubbleProperties(workInProgress);
      return null;
    }

    case SuspenseComponent: {
      bubbleProperties(workInProgress);
      return null;
    }

    default:
      bubbleProperties(workInProgress);
      return null;
  }
}
