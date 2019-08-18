export function getOrAdd<K, V>(map: Map<K, V>, key: K, getValue: () => V) {
    if (!map.has(key))
        map.set(key, getValue());
    return map.get(key)!;
}

export function documentPosition(a: Node, b: Node) {
    let position = a.compareDocumentPosition(b);
    return position & Node.DOCUMENT_POSITION_FOLLOWING || position & Node.DOCUMENT_POSITION_CONTAINED_BY ? -1
        : position & Node.DOCUMENT_POSITION_PRECEDING || position & Node.DOCUMENT_POSITION_CONTAINS ? 1
            : 0;
}

export function findLast<T>(array: T[], predicate: (item: T) => boolean) {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i]))
            return array[i];
    }
}

export function pick<T extends any, K extends keyof T>(source: T, properties: K[]): Pick<T, K> {
    let picked = {} as Pick<T, K>;
    properties.forEach(prop => picked[prop] = source[prop]);
    return picked;
}

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
