import bezier = require("bezier-easing");
import { cancelFrame, queueFrame } from "./raf";
import { pick, getOrAdd } from "./utils";

export type Effect<T> = (progress: { elapsedMs: number }) => { value: T, done: boolean };
export type EffectsArray<Array extends any[]> = { [I in keyof Array]: Effect<Array[I]> };

export type Interpolator<T> = (fraction: number) => T;
export type TimingFunction = Interpolator<number> & { css: string };

export type StyleProperty = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule' | 'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty'>;
export type StyleValues = { [P in StyleProperty]?: CSSStyleDeclaration[P] };

export interface IAnimationConfig {
    durationMs: number;
    delayMs: number;
    timing: TimingFunction;
}

export function effect<Value>(interpolate: Interpolator<Value>, durationMs: number, delayMs: number, timing: TimingFunction): Effect<Value> {
    return function getEffect({ elapsedMs }) {
        if (elapsedMs < delayMs)
            return { value: interpolate(0), done: false };
        if (elapsedMs < delayMs + durationMs)
            return { value: interpolate(timing((elapsedMs - delayMs) / durationMs)), done: false };
        return { value: interpolate(1), done: true };
    }
}

export function constantEffect<T>(value: T): Effect<T> {
    let result = { value, done: true };
    return function constant() { return result };
}

export function combineEffects<Values extends any[]>(effects: EffectsArray<Values>): Effect<Values> {
    return function combinedEffects(elapsedMs) {
        let results = effects.map(e => e(elapsedMs));
        return {
            value: results.map(r => r.value) as Values,
            done: results.every(r => r.done)
        };
    };
}

export function mapEffect<A, B>(effect: Effect<A>, map: (value: A) => B): Effect<B> {
    return function mappedEffect(elapsed) {
        let { value, done } = effect(elapsed);
        return { value: map(value), done };
    };
}

export function interpolate<O extends Record<string, number>>(from: O, to: O): Interpolator<O> {
    let keys = Object.keys(to) as (keyof O)[];

    return function interpolated(fraction) {
        let values = {} as O;
        for (let key of keys)
            values[key] = from[key] + fraction * (to[key] - from[key]) as O[keyof O];
        return values;
    }
}

export interface Animation {
    play(): Promise<void>;
    finish(): void;

    /** For debugging */
    element?: HTMLElement;
    /** For debugging */
    from?: StyleValues;
    /** For debugging */
    to?: StyleValues;
    /** For debugging */
    animations?: Animation[];
    /** For debugging */
    readonly playState: AnimationPlayState;
}

export function animate(element: HTMLElement, effect: Effect<StyleValues>): Animation {
    let startingStyles = effect({ elapsedMs: 0 }).value;
    let originalStyleValues = pick(element.style, Object.keys(startingStyles) as StyleProperty[]);
    Object.assign(element.style, startingStyles);

    let nextAnimationFrame = -1;
    let resolve: () => void;
    let promise = new Promise<void>(r => resolve = r);
    let playState: AnimationPlayState = 'paused';
    let finished = false;

    return registerAnimation(element, {
        element,
        play() {
            playState = 'running';
            let start = performance.now();

            nextFrame(start);

            return promise;

            function nextFrame(now: number) {
                let elapsedMs = now - start;

                let result = effect({ elapsedMs });

                Object.assign(element.style, result.value);

                if (result.done)
                    animationComplete();
                else
                    nextAnimationFrame = queueFrame(nextFrame);
            }
        },
        finish() {
            if (!finished) {
                finished = true;
                deregisterAnimation(element, this);
                Object.assign(element.style, originalStyleValues);
                cancelFrame(nextAnimationFrame);
                animationComplete();
            }
        },
        get playState() { return playState; }
    });

    function animationComplete() {
        playState = 'finished';
        nextAnimationFrame = -1;
        resolve();
    };
}

export function animateCss(element: HTMLElement, from: StyleValues, to: StyleValues, durationMs: number, delayMs: number, timing: TimingFunction): Animation {
    let styleProperties = Object.keys(from) as StyleProperty[];
    let originalStyleValues = pick(element.style, styleProperties.concat('transition'));

    element.style.transition = 'none';
    Object.assign(element.style, from);

    let resolve: () => void;
    let promise = new Promise<void>(r => resolve = r);
    let playState: AnimationPlayState = 'paused';
    let isTransitioning = false;
    let finished = false;

    return registerAnimation(element, {
        element, from, to,
        play() {
            playState = 'running';
            element.addEventListener('transitionstart', animationStarted);
            element.addEventListener('transitionend', animationComplete);

            element.style.transition = styleProperties
                .map(p => `${p} ${durationMs}ms ${timing.css} ${delayMs}ms`)
                .join(',');
            Object.assign(element.style, to);

            if (!isTransitioning) // Some style changes won't trigger transitions
                animationComplete();

            return promise;
        },
        finish() {
            if (!finished) {
                finished = true;
                deregisterAnimation(element, this);
                Object.assign(element.style, originalStyleValues);
                animationComplete();
            }
        },
        get playState() { return playState; }
    });

    function animationStarted() {
        isTransitioning = true;
    }

    function animationComplete() {
        playState = 'finished';
        element.removeEventListener('transitionstart', animationStarted);
        element.removeEventListener('transitionend', animationComplete);
        resolve();
    }
}

export function combineAnimations(animations: Animation[]): Animation {
    return {
        animations,
        play: () => Promise.all(animations.map(a => a.play())) as any,
        finish() { animations.forEach(a => a.finish()) },
        get playState() {
            return animations.every(a => a.playState == 'paused') ? 'paused'
                : animations.every(a => a.playState == 'finished') ? 'finished'
                    : 'running';
        }
    };
}

let animations = new Map<HTMLElement, Animation[]>();

export function getAnimations(element: HTMLElement) {
    return animations.get(element) || [] as readonly Animation[];
}

function registerAnimation(element: HTMLElement, animation: Animation) {
    getOrAdd(animations, element, () => []).push(animation);
    return animation;
}

function deregisterAnimation(element: HTMLElement, animation: Animation) {
    let elementAnimations = animations.get(element);
    if (elementAnimations) {
        elementAnimations = elementAnimations.filter(a => a != animation);
        if (elementAnimations.length)
            animations.set(element, elementAnimations);
        else
            animations.delete(element);
    }
}

export const defaultTiming = {
    update: cubicBezier(.4, 0, .2, 1),
    enter: cubicBezier(0, 0, .2, 1),
    exit: cubicBezier(.4, 0, 1, 1)
};

export const defaultTransitionDurationMs = 300;

export const defaultAnimationConfigs = {
    update: { durationMs: defaultTransitionDurationMs, delayMs: 0, timing: defaultTiming.update } as IAnimationConfig,
    exit: { durationMs: defaultTransitionDurationMs * 0.3, delayMs: 0, timing: defaultTiming.exit } as IAnimationConfig,
    enter: { durationMs: defaultTransitionDurationMs * 0.7, delayMs: defaultTransitionDurationMs * 0.3, timing: defaultTiming.enter } as IAnimationConfig
};

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): TimingFunction {
    return Object.assign(bezier(x1, y1, x2, y2), { css: `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})` });
}