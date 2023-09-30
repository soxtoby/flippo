import { defaults } from "./Defaults";
import { FlipAnimation, IAnimationConfig, IFlipConfig, StyleProperty, StyleValues, TransformConfig, identityTransform } from "./FlipAnimation";
import { queueFlip } from "./FlipRegistry";
import { pick } from "./Utils";

export class FlipNode {
    constructor(
        public readonly id: string,
        public config: Partial<IFlipConfig> = {},
        public parent?: FlipNode
    ) { }

    state: FlipState = 'pending';
    element?: HTMLElement;
    isFlipPending = false;
    offsetParent?: HTMLElement;
    previous?: Snapshot;
    current?: Snapshot;
    animation?: FlipAnimation;

    mount(element: HTMLElement) {
        if (element != this.element) {
            this.state = this.element ? 'updating' : 'entering';
            this.element = element;
            this.offsetParent = element.offsetParent as HTMLElement;
            this.flip();
        }
    }

    unmount(element: HTMLElement) {
        if (this.element == element) { // Don't unmount if this has been mounted to a different element
            this.element = element.cloneNode(true) as HTMLElement;
            this.state = 'exiting';
            // Queue flip without snapshotting
            this.isFlipPending = true;
            queueFlip(this.config.group);
        }
    }

    flip() {
        if (!this.isFlipPending && this.element) {
            this.isFlipPending = true;
            this.snapshot();
            queueFlip(this.config.group);
        }
    }

    snapshot() {
        if (this.element) {
            this.previous = this.current;
            let styles = this.state == 'entering' ? this.enterConfig?.styles ?? defaults.enter.styles
                : this.state == 'exiting' ? this.exitConfig?.styles ?? defaults.exit.styles
                    : this.updateConfig?.styles ?? defaults.update.styles;
            let snapshotProps = Object.keys(styles) as StyleProperty[];
            let rect = this.element.getBoundingClientRect();
            this.current = {
                rect,
                offset: this.parent?.current
                    ? { x: rect.x - this.parent.current.rect.x, y: rect.y - this.parent.current.rect.y }
                    : undefined,
                styles: snapshotProps.length ? pick(getComputedStyle(this.element), snapshotProps) : {}
            }
        }
    }

    prepareAnimation() {
        if (this.element) {
            let element = this.element;
            let previous = this.previous!;
            let current = this.current!;

            let scaleX = transformEnabled(this.config.scale, 'x')
                ? previous.rect.width / current.rect.width
                : identityTransform.scaleX;
            let scaleY = transformEnabled(this.config.scale, 'y')
                ? previous.rect.height / current.rect.height
                : identityTransform.scaleY;

            let relativeToParent = !!current.offset && !!previous.offset;
            let translateX = transformEnabled(this.config.position, 'x')
                ? relativeToParent
                    ? previous.offset!.x - current.offset!.x
                    : previous.rect.left - current.rect.left
                : identityTransform.translateX;
            let translateY = transformEnabled(this.config.position, 'y')
                ? relativeToParent
                    ? previous.offset!.y - current.offset!.y
                    : previous.rect.top - current.rect.top
                : identityTransform.translateY;

            this.animation = new FlipAnimation(
                element,
                { scaleX, scaleY, translateX, translateY },
                previous.styles as Keyframe,
                current.styles as Keyframe,
                this.state == 'entering' ? this.enterConfig
                    : this.state == 'exiting' ? this.exitConfig
                        : this.updateConfig,
                this.state == 'entering' ? defaults.enter
                    : this.state == 'exiting' ? defaults.exit
                        : defaults.update,
                this.parent?.animation,
                this.parent && {
                    x: this.parent.current!.rect.left - this.current!.rect.left,
                    y: this.parent.current!.rect.top - this.current!.rect.top
                },
                relativeToParent
            );

            if (this.state == 'entering')
                this.animation.finished.then(() => this.state = 'updating');
            else if (this.state == 'exiting')
                this.animation.finished.then(() => element.remove());
        }
    }

    get enterConfig() { return animationConfig(this.config.enter); }
    get updateConfig() { return animationConfig(this.config.update); }
    get exitConfig() { return animationConfig(this.config.exit); }
}

function animationConfig(config: Partial<IAnimationConfig> | boolean | undefined) {
    return config == true ? undefined
        : config == false ? noAnimation
            : config;
}

const noAnimation: Partial<IAnimationConfig> = { durationMs: 0, delayMs: 0 };

function transformEnabled(transform: TransformConfig | undefined, axis: 'x' | 'y') {
    return transform === true
        || transform == axis;
}

type FlipState = 'pending' | 'entering' | 'exiting' | 'updating';

interface Snapshot {
    rect: DOMRect;
    /** Offset from parent FlipNode */
    offset?: { x: number; y: number; };
    styles: StyleValues;
}