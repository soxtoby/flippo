import { defaults } from "./Defaults.js";
import type { Snapshot } from "./FlipNode.js";
import { cancelFrame, queueFrame } from "./FrameQueue.js";

export type TimingFunction = ((fraction: number) => number) & { css: string };
export type StyleProperty = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule' | 'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty'>;

/** Specify a value to animate to, or <c>true</c> to automatically transition the property. */
export type StyleValues = { [P in StyleProperty]?: CSSStyleDeclaration[P] | true };

export interface IAnimationConfig {
    durationMs: number;
    delayMs: number;
    timing: TimingFunction;
    styles: StyleValues;
}

export interface IFlipAnimationConfigs {
    playbackRate: number;
    enter: IAnimationConfig;
    update: IAnimationConfig;
    exit: IAnimationConfig;
}

export interface IFlipAnimationOverrides {
    playbackRate?: number;
    enter?: Partial<IAnimationConfig> | boolean;
    update?: Partial<IAnimationConfig> | boolean;
    exit?: Partial<IAnimationConfig> | boolean;
}

export interface IFlipConfig extends IFlipAnimationOverrides {
    group?: string;
    position?: TransformConfig;
    scale?: TransformConfig;
}

export type TransformConfig = boolean | 'x' | 'y';

export class FlipAnimation {
    private _playState: AnimationPlayState = 'idle';
    private _cssAnimation?: Animation;
    private _finish!: () => void;

    constructor(
        public readonly element: HTMLElement,
        public readonly from: Snapshot,
        public readonly to: Snapshot,
        scale: TransformConfig,
        position: TransformConfig,
        public readonly playbackRate: number = defaults.playbackRate,
        animationConfig: Partial<IAnimationConfig> | undefined,
        defaultAnimationConfig: IAnimationConfig,
        public readonly parent?: FlipAnimation
    ) {
        this.delayMs = animationConfig?.delayMs ?? defaultAnimationConfig.delayMs;
        this.durationMs = animationConfig?.durationMs ?? defaultAnimationConfig.durationMs;
        this.timing = animationConfig?.timing ?? defaultAnimationConfig.timing;

        let relativeToParent = !!to.offset && !!from.offset;
        this.initialTransform = {
            scaleX: transformEnabled(scale, 'x')
                ? from.rect.width / to.rect.width
                : identityTransform.scaleX,
            scaleY: transformEnabled(scale, 'y')
                ? from.rect.height / to.rect.height
                : identityTransform.scaleY,

            translateX: transformEnabled(position, 'x')
                ? relativeToParent
                    ? from.offset!.x - to.offset!.x
                    : from.rect.left - to.rect.left
                : identityTransform.translateX,
            translateY: transformEnabled(position, 'y')
                ? relativeToParent
                    ? from.offset!.y - to.offset!.y
                    : from.rect.top - to.rect.top
                : identityTransform.translateY,
        };

        this.finished = new Promise(resolve => this._finish = resolve);
    }

    readonly delayMs: number;
    readonly durationMs: number;
    readonly timing: TimingFunction;

    readonly initialTransform: TransformProperties;
    readonly transform: TransformProperties = { ...identityTransform };
    readonly finished: Promise<void>;
    private _nextAnimationFrame = -1;

    get playState() { return this._playState; }

    play() {
        this._playState = 'running';

        this._cssAnimation = this.element.animate([
            { transformOrigin: '0 0', ...(this.from.styles as Keyframe) },
            { transformOrigin: '0 0', ...(this.to.styles as Keyframe) }
        ], {
            fill: 'backwards',
            delay: this.delayMs,
            duration: this.durationMs,
            easing: this.timing.css
        });
        this._cssAnimation.playbackRate = this.playbackRate;

        // Pause temporarily to allow debugging animation starting state across entire flip batch
        this._cssAnimation.pause();
        queueMicrotask(() => this._cssAnimation!.play());

        this.nextFrame();
    }

    private nextFrame = () => {
        let elapsedMs = this._cssAnimation!.currentTime as number;

        if (elapsedMs < this.delayMs + this.durationMs) {
            if (elapsedMs >= this.delayMs) {
                let fraction = this.timing((elapsedMs - this.delayMs) / this.durationMs);
                this.transform.scaleX = this.initialTransform.scaleX + fraction * (identityTransform.scaleX - this.initialTransform.scaleX);
                this.transform.scaleY = this.initialTransform.scaleY + fraction * (identityTransform.scaleY - this.initialTransform.scaleY);
                this.transform.translateX = this.initialTransform.translateX + fraction * (identityTransform.translateX - this.initialTransform.translateX);
                this.transform.translateY = this.initialTransform.translateY + fraction * (identityTransform.translateY - this.initialTransform.translateY);

                let undoParentScale = this.parent
                    ? [
                        translate(-this.to.offset!.x, -this.to.offset!.y),
                        scale(1 / this.parent.transform.scaleX, 1 / this.parent.transform.scaleY),
                        translate(this.to.offset!.x, this.to.offset!.y),
                    ].filter(Boolean).join(' ') + ' '
                    : '';
                let ownTransform = [
                    translate(this.transform.translateX, this.transform.translateY),
                    scale(this.transform.scaleX, this.transform.scaleY),
                ].filter(Boolean).join(' ');

                this.element.style.transform = undoParentScale + ownTransform;
            }

            this._nextAnimationFrame = queueFrame(this.nextFrame);
        } else {
            this.finish();
        }
    }

    finish() {
        cancelFrame(this._nextAnimationFrame);
        this._cssAnimation?.finish();
        this.element.style.transform = '';
        this._playState = 'finished';
        this._nextAnimationFrame = -1;
        this._finish();
    }
}

function transformEnabled(transform: TransformConfig, axis: 'x' | 'y') {
    return transform === true
        || transform == axis;
}

function scale(x: number, y: number) {
    return x != identityTransform.scaleX || y != identityTransform.scaleY
        ? `scale(${x}, ${y})`
        : '';
}

function translate(x: number, y: number) {
    return x != identityTransform.translateX || y != identityTransform.translateY
        ? `translate(${x}px, ${y}px)`
        : '';
}

interface TransformProperties {
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
}

export const identityTransform = {
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0
} as const satisfies TransformProperties;
