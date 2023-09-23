export function areEquivalent(a: any, b: any) {
    if (isObject(a) && isObject(b)) {
        let keys = Object.keys(a);
        return Object.keys(b).length == keys.length
            && keys.every(key => a[key] === b[key]);
    } else if (Array.isArray(a) && Array.isArray(b)) {
        return a.length == b.length
            && a.every((val, i) => val == b[i]);
    }
    return a === b;
}

function isObject(a: any) {
    return Object.prototype.toString.call(a) == '[object Object]';
}