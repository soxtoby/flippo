import { FlipAnimation, IFlipConfig, StyleValues } from "./FlipAnimation";
import { defaults } from "./Defaults";
import { pick } from "./Utils";
import { queueFlip } from "./FlipRegistry";

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
        }
    }

    flip() {
        if (!this.isFlipPending && this.element) {
            this.isFlipPending = true;
            this.snapshot();
            queueFlip();
        }
    }

    snapshot() {
        if (this.element) {
            this.previous = this.current;
            let animateProps = this.config.animateProps ?? ['opacity'];
            this.current = {
                rect: this.element.getBoundingClientRect(),
                styles: animateProps.length ? pick(getComputedStyle(this.element), animateProps) : {}
            }
        }
    }

    prepareAnimation() {
        if (this.element) {
            let element = this.element;
            let scaleX = this.previous!.rect.width / this.current!.rect.width;
            let scaleY = this.previous!.rect.height / this.current!.rect.height;
            let translateX = this.previous!.rect.left - this.current!.rect.left;
            let translateY = this.previous!.rect.top - this.current!.rect.top;

            this.animation = new FlipAnimation(
                element,
                { scaleX, scaleY, translateX, translateY },
                this.previous!.styles as Keyframe,
                this.current!.styles as Keyframe,
                this.state == 'entering' ? this.config.enterAnimation ?? defaults.enterAnimation
                    : this.state == 'exiting' ? this.config.exitAnimation ?? defaults.exitAnimation
                        : this.config.updateAnimation ?? defaults.updateAnimation,
                this.parent?.animation,
                this.parent && {
                    x: this.parent.current!.rect.left - this.current!.rect.left,
                    y: this.parent.current!.rect.top - this.current!.rect.top
                }
            );

            if (this.state == 'entering')
                this.animation.finished.then(() => this.state = 'updating');
            else if (this.state == 'exiting')
                this.animation.finished.then(() => element.remove());
        }
    }
}

type FlipState = 'pending' | 'entering' | 'exiting' | 'updating';

interface Snapshot {
    rect: DOMRect;
    styles: StyleValues;
}