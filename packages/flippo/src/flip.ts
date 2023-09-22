import { IAnimationConfig, StyleProperty, StyleValues } from "./animation";
import { TrackedItem } from "./flip-collection";
import { cancelFrame, queueFrame } from "./raf";
import { pick } from "./utils";

export interface Snapshot {
    rect: DOMRect;
    styles: StyleValues;
}

export function snapshot(element: HTMLElement, extraProperties: StyleProperty[] = ['opacity']): Snapshot {
    return {
        rect: element.getBoundingClientRect(),
        styles: extraProperties.length ? pick(getComputedStyle(element), extraProperties) : {}
    };
}

export type Translation = { translateX: number, translateY: number };
export type Scaling = { scaleX: number, scaleY: number };

export function flip(element: HTMLElement, previous: Snapshot, current: Snapshot, animationConfig: IAnimationConfig, parent?: TrackedItem): FlipAnimation {
    let scaleX = previous.rect.width / current.rect.width;
    let scaleY = previous.rect.height / current.rect.height;
    let translateX = previous.rect.left - current.rect.left;
    let translateY = previous.rect.top - current.rect.top;

    return new FlipAnimation(
        element,
        { scaleX, scaleY, translateX, translateY },
        previous.styles as Keyframe,
        current.styles as Keyframe,
        animationConfig,
        parent?.animation,
        parent && { x: parent.current!.rect.left - current.rect.left, y: parent.current!.rect.top - current.rect.top }
    );
}

interface TransformProperties {
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
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
            if (elapsedMs > this.animationConfig.delayMs) {
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

const identityTransform = {
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0
} as const;
