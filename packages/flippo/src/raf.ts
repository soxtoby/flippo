// Basic queue for requestAnimationFrame to batch frame callbacks

let rafQueue: (FrameRequestCallback | undefined)[] | undefined;

export function queueFrame(callback: FrameRequestCallback) {
    if (!rafQueue) {
        rafQueue = [];
        requestAnimationFrame(runQueue);
    }

    rafQueue.push(callback);

    return rafQueue.length - 1;

    function runQueue(now: number) {
        let queue = rafQueue!;
        rafQueue = undefined;

        for (let callback of queue)
            if (callback)
                callback(now);
    }
}

export function cancelFrame(id: number) {
    if (rafQueue)
        rafQueue[id] = undefined;
}