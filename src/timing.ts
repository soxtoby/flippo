import bezier = require("bezier-easing");

export type TimingFunction = (progress: number) => number;

export type CssTimingFunction = TimingFunction & { css: string };

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): CssTimingFunction {
    return Object.assign(bezier(x1, y1, x2, y2), { css: `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})` });
}

export function delay(fraction: number): TimingFunction {
    return progress => {
        if (progress < fraction)
            return 0;
        return (progress - fraction) / (1 - fraction);
    };
}

export const timing = {
    update: cubicBezier(.4, 0, .2, 1),
    enter: cubicBezier(0, 0, .2, 1),
    exit: cubicBezier(.4, 0, 1, 1)
};