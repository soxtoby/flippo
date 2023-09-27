import { cancelFrame, queueFrame } from "./FrameQueue";

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
    enter: IAnimationConfig;
    update: IAnimationConfig;
    exit: IAnimationConfig;
}

export interface IFlipConfig {
    group?: string;

    enter?: Partial<IAnimationConfig> | boolean;
    update?: Partial<IAnimationConfig> | boolean;
    exit?: Partial<IAnimationConfig> | boolean;

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
        public readonly fromTransform: TransformProperties,
        public readonly fromStyles: Keyframe,
        public readonly toStyles: Keyframe,
        public readonly animationConfig: Partial<IAnimationConfig> | undefined,
        public readonly defaultAnimationConfig: IAnimationConfig,
        public readonly parent?: FlipAnimation,
        public readonly offsetFromParent?: { x: number; y: number; }
    ) {
        this.transform = fromTransform;
        this.finished = new Promise(resolve => this._finish = resolve);
    }

    transform: TransformProperties;
    readonly finished: Promise<void>;
    private _nextAnimationFrame = -1;

    get playState() { return this._playState; }

    play() {
        this._playState = 'running';
        let delayMs = this.animationConfig?.delayMs ?? this.defaultAnimationConfig.delayMs;
        let durationMs = this.animationConfig?.durationMs ?? this.defaultAnimationConfig.durationMs;
        let timing = this.animationConfig?.timing ?? this.defaultAnimationConfig.timing;
        this._cssAnimation = this.element.animate([
            { transformOrigin: '0 0', ...this.fromStyles },
            { transformOrigin: '0 0', ...this.toStyles }
        ], {
            fill: 'backwards',
            delay: delayMs,
            duration: durationMs,
            easing: timing.css,
        });

        this.nextFrame(delayMs, durationMs, timing);
    }

    private nextFrame(delayMs: number, durationMs: number, timing: TimingFunction) {
        let elapsedMs = this._cssAnimation!.currentTime as number;

        if (elapsedMs < delayMs + durationMs) {
            if (elapsedMs >= delayMs) {
                if (this.transform == this.fromTransform)
                    this.transform = {} as TransformProperties; // Make sure not to change the fromTransform object

                let fraction = timing((elapsedMs - delayMs) / durationMs);
                this.transform.scaleX = this.fromTransform.scaleX + fraction * (identityTransform.scaleX - this.fromTransform.scaleX);
                this.transform.scaleY = this.fromTransform.scaleY + fraction * (identityTransform.scaleY - this.fromTransform.scaleY);
                this.transform.translateX = this.fromTransform.translateX + fraction * (identityTransform.translateX - this.fromTransform.translateX);
                this.transform.translateY = this.fromTransform.translateY + fraction * (identityTransform.translateY - this.fromTransform.translateY);

                let undoParentTransform = this.parent
                    ? [
                        translate(this.offsetFromParent!.x, this.offsetFromParent!.y),
                        scale(1 / this.parent.transform.scaleX, 1 / this.parent.transform.scaleY),
                        // Only undo parent translation if node is being translated itself
                        this.fromTransform.translateX != identityTransform.translateX || this.fromTransform.translateY != identityTransform.translateY
                            ? translate(-this.parent.transform.translateX, -this.parent.transform.translateY)
                            : '',
                        translate(-this.offsetFromParent!.x, -this.offsetFromParent!.y),
                    ].filter(Boolean).join(' ') + ' '
                    : '';
                let ownTransform = [
                    translate(this.transform.translateX, this.transform.translateY),
                    scale(this.transform.scaleX, this.transform.scaleY),
                ].filter(Boolean).join(' ');

                this.element.style.transform = undoParentTransform + ownTransform;
            }

            this._nextAnimationFrame = queueFrame(() => this.nextFrame(delayMs, durationMs, timing));
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
