import bezier from "bezier-easing";
import type { IFlipAnimationConfigs, TimingFunction } from "./FlipAnimation.js";

export const defaultTiming = {
    get update() { return cubicBezier(.4, 0, .2, 1); },
    get enter() { return cubicBezier(0, 0, .2, 1); },
    get exit() { return cubicBezier(.4, 0, 1, 1); }
};

export const defaultDuration = {
    update(totalDurationMs: number) { return totalDurationMs; },
    enter(totalDurationMs: number) { return totalDurationMs * 0.7; },
    exit(totalDurationMs: number) { return totalDurationMs * 0.3; }
}

export const defaultDelay = {
    update(totalDurationMs: number) { return 0; },
    enter(totalDurationMs: number) { return totalDurationMs * 0.3; },
    exit(totalDurationMs: number) { return 0; }
}

export const defaultDurationMs = 300;

export const defaults: IFlipAnimationConfigs = {
    enter: {
        durationMs: defaultDuration.enter(defaultDurationMs),
        delayMs: defaultDelay.enter(defaultDurationMs),
        timing: defaultTiming.enter,
        styles: {
            opacity: '0'
        }
    },
    update: {
        durationMs: defaultDuration.update(defaultDurationMs),
        delayMs: defaultDelay.update(defaultDurationMs),
        timing: defaultTiming.update,
        styles: {
            opacity: true,
            backgroundColor: true,
        }
    },
    exit: {
        durationMs: defaultDuration.exit(defaultDurationMs),
        delayMs: defaultDelay.exit(defaultDurationMs),
        timing: defaultTiming.exit,
        styles: {
            opacity: '0'
        }
    }
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): TimingFunction {
    return Object.assign(bezier(x1, y1, x2, y2), { css: `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})` });
}