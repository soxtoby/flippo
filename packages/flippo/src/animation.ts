import bezier = require("bezier-easing");

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
    keyframes?: Keyframe[];
    /** For debugging */
    animations?: Animation[];
    /** For debugging */
    readonly playState: AnimationPlayState;
}

export function animate(element: HTMLElement, effect: Effect<StyleValues>): Animation {
    let originalStyleCss = element.style.cssText;
    Object.assign(element.style, effect({ elapsedMs: 0 }).value);

    let nextAnimationFrame: number;
    let animationComplete: () => void;
    let playState: AnimationPlayState = 'paused';

    return {
        element,
        play: () => new Promise<void>(function startPlaying(resolve) {
            animationComplete = () => {
                playState = 'finished';
                resolve();
            };
            playState = 'running';
            let start = performance.now();

            nextFrame(start);

            function nextFrame(now: number) {
                let elapsedMs = now - start;

                let result = effect({ elapsedMs });

                Object.assign(element.style, result.value);

                if (result.done)
                    animationComplete();
                else
                    nextAnimationFrame = requestAnimationFrame(nextFrame);
            }
        }),
        finish() {
            element.style.cssText = originalStyleCss;
            cancelAnimationFrame(nextAnimationFrame);
            animationComplete();
        },
        get playState() { return playState; }
    };
}

export function animateCss(element: HTMLElement, keyframes: Keyframe[], durationMs: number, delayMs: number, timing: TimingFunction): Animation {
    let animation = element.animate(keyframes, { duration: durationMs, delay: delayMs, easing: timing.css, fill: 'both' });
    animation.pause();
    return {
        element, keyframes,
        play: () => new Promise<void>(resolve => {
            animation.addEventListener('finish', () => resolve());
            animation.play();
        }),
        finish: () => {
            animation.finish();
            animation.cancel(); // Removes fill styling
        },
        get playState() { return animation.playState; }
    };
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