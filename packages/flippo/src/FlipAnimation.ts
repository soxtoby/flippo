import { cancelFrame, queueFrame } from "./FrameQueue";

export type TimingFunction = ((fraction: number) => number) & { css: string };
export type StyleProperty = Exclude<keyof CSSStyleDeclaration, 'length' | 'parentRule' | 'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty'>;
export type StyleValues = { [P in StyleProperty]?: CSSStyleDeclaration[P] };

export interface IAnimationConfig {
    durationMs: number;
    delayMs: number;
    timing: TimingFunction;
}

export interface IFlipAnimationConfigs {
    enterAnimation: IAnimationConfig;
    updateAnimation: IAnimationConfig;
    exitAnimation: IAnimationConfig;
}

export interface IFlipConfig extends IFlipAnimationConfigs {
    animateProps: StyleProperty[];
    shouldFlip(newTriggerData: any, oldTriggerData: any, element: HTMLElement, id: any): boolean;
    entryStyles: StyleValues;
    exitStyles: StyleValues;
}

export class FlipAnimation {
    private _playState: AnimationPlayState = 'idle';
    private _cssAnimation?: Animation;
    private _finish!: () => void;

    constructor(
        public readonly element: HTMLElement,
        public readonly fromTransform: TransformProperties,
        public readonly fromStyles: Keyframe,
        public readonly toStyles: Keyframe,
        public readonly animationConfig: IAnimationConfig,
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
        this._cssAnimation = this.element.animate([
            { transformOrigin: '0 0', ...this.fromStyles },
            { transformOrigin: '0 0', ...this.toStyles }
        ], {
            fill: 'both',
            delay: this.animationConfig.delayMs,
            duration: this.animationConfig.durationMs,
            easing: this.animationConfig.timing.css
        });

        this.nextFrame();
    }

    private nextFrame() {
        let elapsedMs = this._cssAnimation!.currentTime as number;

        if (elapsedMs < this.animationConfig.delayMs + this.animationConfig.durationMs) {
            if (elapsedMs >= this.animationConfig.delayMs) {
                if (this.transform == this.fromTransform)
                    this.transform = {} as TransformProperties; // Make sure not to change the fromTransform object

                let fraction = this.animationConfig.timing((elapsedMs - this.animationConfig.delayMs) / this.animationConfig.durationMs);
                this.transform.scaleX = this.fromTransform.scaleX + fraction * (identityTransform.scaleX - this.fromTransform.scaleX);
                this.transform.scaleY = this.fromTransform.scaleY + fraction * (identityTransform.scaleY - this.fromTransform.scaleY);
                this.transform.translateX = this.fromTransform.translateX + fraction * (identityTransform.translateX - this.fromTransform.translateX);
                this.transform.translateY = this.fromTransform.translateY + fraction * (identityTransform.translateY - this.fromTransform.translateY);

                let undoParentTransform = this.parent
                    ? [
                        `translate(${this.offsetFromParent!.x}px, ${this.offsetFromParent!.y}px)`,
                        `scale(${1 / this.parent.transform.scaleX}, ${1 / this.parent.transform.scaleY})`,
                        `translate(${-this.parent.transform.translateX}px, ${-this.parent.transform.translateY}px)`,
                        `translate(${-this.offsetFromParent!.x}px, ${-this.offsetFromParent!.y}px)`,
                    ].join(' ') + ' '
                    : '';
                let ownTransform = [
                    `translate(${this.transform.translateX}px, ${this.transform.translateY}px)`,
                    `scale(${this.transform.scaleX}, ${this.transform.scaleY})`
                ].join(' ');

                this.element.style.transform = undoParentTransform + ownTransform;
            }

            this._nextAnimationFrame = queueFrame(() => this.nextFrame());
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

interface TransformProperties {
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
}

const identityTransform = {
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0
} as const satisfies TransformProperties;
