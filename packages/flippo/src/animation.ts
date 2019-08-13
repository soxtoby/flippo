import bezier = require("bezier-easing");

export type InterpolatorArray<T extends any[]> = { [K in keyof T]: Interpolator<T[K]> };
export type InterpolatorMap<T extends object> = { [K in keyof T]: Interpolator<T[K]> };
export type Interpolator<T> = (progress: number) => T;
export type StyleProperty = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule' | 'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty'>;
export type StyleValues = { [P in StyleProperty]?: CSSStyleDeclaration[P] };
export type TimingFunction = ((progress: number) => number) & { css: string };

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

export function interpolate(from: number, to: number): Interpolator<number> {
    return (progress: number) => from + progress * (to - from);
}

export function applyTiming<T>(interpolator: Interpolator<T>, timing: TimingFunction): Interpolator<T> {
    return progress => interpolator(timing(progress));
}

export function interpolateMap<T extends object>(interpolators: InterpolatorMap<T>): Interpolator<T> {
    let values = {} as T;
    let keys = Object.keys(interpolators) as (keyof T)[];
    return (progress) => {
        for (let key of keys)
            values[key] = interpolators[key](progress);
        return values;
    };
}

export function interpolateArray<T extends any[]>(interpolators: InterpolatorArray<T>): Interpolator<T> {
    let values = [] as unknown as T;
    return (progress) => {
        for (let i = 0; i < interpolators.length; i++)
            values[i] = interpolators[i](progress);
        return values;
    };
}

export function map<A, B>(interpolator: Interpolator<A>, map: (interpolated: A) => B): Interpolator<B> {
    return (progress: number) => {
        const interpolated = interpolator(progress);
        const mapped = map(interpolated);
        return mapped;
    };
}

export function delay<T>(interpolator: Interpolator<T>, fraction: number): Interpolator<T> {
    return fraction
        ? progress => interpolator(progress < fraction ? 0
            : (progress - fraction) / (1 - fraction))
        : interpolator;
}

export function animate(element: HTMLElement, interpolate: Interpolator<StyleValues>, durationMs: number, delayMs: number): Animation {
    let originalStyleCss = element.style.cssText;
    Object.assign(element.style, interpolate(0));

    let nextAnimationFrame: number;
    let animationComplete: () => void;
    let playState: AnimationPlayState = 'paused';

    return {
        element,
        play: () => new Promise<void>(resolve => {
            animationComplete = resolve;
            playState = 'running';
            let start = performance.now();
            let totalDuration = durationMs + delayMs;
            let delayedInterpolate = delay(interpolate, delayMs / totalDuration);

            nextFrame(start);

            function nextFrame(now: number) {
                let progress = Math.min((now - start) / totalDuration, 1);

                Object.assign(element.style, delayedInterpolate(progress));

                if (progress < 1)
                    nextAnimationFrame = requestAnimationFrame(nextFrame);
                else
                    animationComplete();
            }
        }).then(() => { playState = 'finished'; }),
        finish: () => {
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
        play: (...args: Parameters<Animation['play']>) => Promise.all(animations.map(a => a.play(...args))) as any,
        finish: () => animations.forEach(a => a.finish()),
        get playState() {
            return animations.every(a => a.playState == 'paused') ? 'paused'
                : animations.every(a => a.playState == 'finished') ? 'finished'
                    : 'running';
        }
    };
}

export const timing = {
    update: cubicBezier(.4, 0, .2, 1),
    enter: cubicBezier(0, 0, .2, 1),
    exit: cubicBezier(.4, 0, 1, 1)
};

function cubicBezier(x1: number, y1: number, x2: number, y2: number): TimingFunction {
    return Object.assign(bezier(x1, y1, x2, y2), { css: `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})` });
}