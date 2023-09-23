export function getOrAdd<K, V>(map: Map<K, V>, key: K, getValue: () => V) {
    if (!map.has(key))
        map.set(key, getValue());
    return map.get(key)!;
}

export function pick<T extends any, K extends keyof T>(source: T, properties: K[]): Pick<T, K> {
    let picked = {} as Pick<T, K>;
    properties.forEach(prop => picked[prop] = source[prop]);
    return picked;
}
