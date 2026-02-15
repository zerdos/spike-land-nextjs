const objectIs = typeof Object.is === 'function' ? Object.is : is;
function is(x, y) {
    return ((x === y && (x !== 0 || 1 / x === 1 / y)) ||
        (x !== x && y !== y));
}
export default objectIs;
//# sourceMappingURL=objectIs.js.map