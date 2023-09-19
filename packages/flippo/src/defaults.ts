import bezier = require("bezier-easing");
import { TimingFunction } from "./animation";
import { IFlipAnimationConfigs, IFlipConfig } from "./flip-collection";

export const defaultTiming = {
    get update() { return cubicBezier(.4, 0, .2, 1); },
    get enter() { return cubicBezier(0, 0, .2, 1); },
    get exit() { return cubicBezier(.4, 0, 1, 1); }
};

export const defaults: IFlipConfig = {
    animateProps: ['opacity', 'backgroundColor'],
    shouldFlip: () => true,
    entryStyles: { opacity: '0' },
    exitStyles: { opacity: '0' },
    ...defaultAnimations()
}

export function defaultAnimations(totalTransitionDurationMs = 300): IFlipAnimationConfigs {
    return {
        updateAnimation: { durationMs: totalTransitionDurationMs, delayMs: 0, timing: defaultTiming.update },
        exitAnimation: { durationMs: totalTransitionDurationMs * 0.3, delayMs: 0, timing: defaultTiming.exit },
        enterAnimation: { durationMs: totalTransitionDurationMs * 0.7, delayMs: totalTransitionDurationMs * 0.3, timing: defaultTiming.enter }
    };
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): TimingFunction {
    return Object.assign(bezier(x1, y1, x2, y2), { css: `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})` });
}