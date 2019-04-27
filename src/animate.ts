import { TimingFunction, delay, CssTimingFunction } from "./timing";

export type InterpolatorArray<T extends any[]> = { [K in keyof T]: Interpolator<T[K]> };
export type InterpolatorMap<T extends object> = { [K in keyof T]: Interpolator<T[K]> };
export type Interpolator<T> = (progress: number) => T;

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

export function reduceMap<In extends object, Out>(interpolators: InterpolatorMap<In>, reduce: (values: In) => Out): Interpolator<Out> {
    return map(interpolateMap(interpolators), reduce);
}

export function reduceArray<In extends any[], Out>(interpolators: InterpolatorArray<In>, reduce: (values: In) => Out): Interpolator<Out> {
    return map(interpolateArray(interpolators), reduce);
}

export interface Animation {
    play(): Promise<void>;
}

export const NullAnimation: Animation = { play: () => Promise.resolve() };

export function animate<T>(interpolate: Interpolator<T>, durationMs: number, delayMs: number, apply: (current: T) => void): Animation {
    apply(interpolate(0));

    return {
        play: () => new Promise(resolve => {
            let start = performance.now();
            let totalDuration = durationMs + delayMs;
            let delayedInterpolate = delayMs ? applyTiming(interpolate, delay(delayMs / totalDuration)) : interpolate;

            nextFrame(start);

            function nextFrame(now: number) {
                let progress = Math.min((now - start) / totalDuration, 1);

                apply(delayedInterpolate(progress));

                if (progress < 1)
                    requestAnimationFrame(nextFrame);
                else
                    resolve();
            }
        })
    };
}

export function animateCss(element: HTMLElement, keyframes: Keyframe[], durationMs: number, delayMs: number, timing: CssTimingFunction): Animation {
    let animation = element.animate(keyframes, { duration: durationMs, delay: delayMs, easing: timing.css, fill: 'both' });
    animation.pause();
    return {
        play: () => new Promise<void>(resolve => {
            animation.addEventListener('finish', () => resolve());
            animation.play();
        })
    };
}

export function combineAnimations(animations: Animation[]): Animation {
    return {
        play: (...args: Parameters<Animation['play']>) => Promise.all(animations.map(a => a.play(...args))) as any
    };
}