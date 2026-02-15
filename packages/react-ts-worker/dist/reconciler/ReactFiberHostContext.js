import { HostRoot } from './ReactWorkTags.js';
function createCursor(defaultValue) {
    return { current: defaultValue };
}
const contextStack = [];
let contextIndex = -1;
function push(cursor, value) {
    contextIndex++;
    contextStack[contextIndex] = cursor.current;
    cursor.current = value;
}
function pop(cursor) {
    if (contextIndex < 0) {
        return;
    }
    cursor.current = contextStack[contextIndex];
    contextStack[contextIndex] = null;
    contextIndex--;
}
const rootInstanceCursor = createCursor(null);
const hostContextCursor = createCursor(null);
const hostConfigCursor = createCursor(null);
function getHostConfigFromFiber(fiber) {
    let node = fiber;
    while (node !== null) {
        if (node.tag === HostRoot && node.stateNode) {
            return node.stateNode.hostConfig;
        }
        node = node.return;
    }
    // Fallback to stored config
    if (hostConfigCursor.current) {
        return hostConfigCursor.current;
    }
    throw new Error('Could not find host config');
}
export function getRootHostContainer() {
    return rootInstanceCursor.current;
}
export function getHostContext() {
    return hostContextCursor.current;
}
export function pushHostContainer(fiber) {
    const fiberRoot = fiber.stateNode;
    const container = fiberRoot.containerInfo;
    const hostConfig = fiberRoot.hostConfig;
    push(rootInstanceCursor, container);
    push(hostConfigCursor, hostConfig);
    push(hostContextCursor, hostConfig.getRootHostContext(container));
}
export function popHostContainer(_fiber) {
    pop(hostContextCursor);
    pop(hostConfigCursor);
    pop(rootInstanceCursor);
}
export function pushHostContext(fiber) {
    const hostConfig = getHostConfigFromFiber(fiber);
    const context = hostContextCursor.current;
    const nextContext = hostConfig.getChildHostContext(context, fiber.type);
    if (context !== nextContext) {
        push(hostContextCursor, nextContext);
    }
}
export function popHostContext(_fiber) {
    pop(hostContextCursor);
}
//# sourceMappingURL=ReactFiberHostContext.js.map