export type TimingFunction = ((fraction: number) => number) & { css: string };

export type StyleProperty = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule' | 'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty'>;
export type StyleValues = { [P in StyleProperty]?: CSSStyleDeclaration[P] };

export interface IAnimationConfig {
    durationMs: number;
    delayMs: number;
    timing: TimingFunction;
    timeline?: AnimationTimeline;
}