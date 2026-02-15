import objectIs from './objectIs.js';
const hasOwnProperty = Object.prototype.hasOwnProperty;
export default function shallowEqual(objA, objB) {
    if (objectIs(objA, objB)) {
        return true;
    }
    if (typeof objA !== 'object' ||
        objA === null ||
        typeof objB !== 'object' ||
        objB === null) {
        return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (let i = 0; i < keysA.length; i++) {
        const currentKey = keysA[i];
        if (!hasOwnProperty.call(objB, currentKey) ||
            !objectIs(objA[currentKey], objB[currentKey])) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=shallowEqual.js.map