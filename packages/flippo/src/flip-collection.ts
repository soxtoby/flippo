import { animate, animateCss, Animation, combineAnimations, combineEffects, Effect, IAnimationConfig, mapEffect, StyleProperty, StyleValues } from "./animation";
import { defaults } from "./defaults";
import { flip, IFlip, Scaling, Snapshot, snapshot, Translation } from "./flip";
import { areEquivalent, documentPosition, getOrAdd } from "./utils";

export interface IFlipAnimationConfigs {
    enterAnimation: IAnimationConfig;
    updateAnimation: IAnimationConfig;
    exitAnimation: IAnimationConfig;
}

export interface IFlipConfigBase extends IFlipAnimationConfigs {
    animateProps: StyleProperty[];
    shouldFlip(newTriggerData: any, oldTriggerData: any, element: HTMLElement, id: any): boolean;
    entryStyles: StyleValues;
    exitStyles: StyleValues;
}

export interface IFlipConfig extends Partial<IFlipConfigBase> {
    id: any;
}

export class FlipCollection {
    private items = new Map<any, TrackedItem>();
    private triggerData: any;

    mount(element: HTMLElement, config: IFlipConfig) {
        let tracked = this.items.get(config.id);
        if (tracked)
            tracked.mount(element, config);
        else
            this.items.set(config.id, new TrackedItem(element, config));
    }

    unmount(id: any, element: HTMLElement) {
        this.items.get(id)?.unmount(element);
    }

    shouldFlip(newTriggerData: any) {
        return !areEquivalent(this.triggerData, newTriggerData);
    }

    snapshot() {
        Array.from(this.items.values())
            .forEach(flip => flip.snapshot());
    }

    flip(newTriggerData: any) {
        let toUpdate = Array.from(this.items.values()).filter(e => e.state == 'updating' && e.shouldFlip(newTriggerData, this.triggerData));
        let toExit = Array.from(this.items.values()).filter(e => e.state == 'exiting');
        let toEnter = Array.from(this.items.values()).filter(e => e.state == 'entering');

        let toFlip = toUpdate.concat(toExit).concat(toEnter)
            .sort((a, b) => documentPosition(a.element, b.element));

        finishPendingAnimations(toFlip);
        let entryStyleChanges = applyEntryStyles(toEnter);
        applyExitStyles(toExit);

        toFlip.forEach(f => f.snapshot());

        removeEntryStyles(entryStyleChanges);

        toEnter.forEach(i => i.snapshot());

        this.addFlips(toFlip);

        let animation = animateTransitions(toFlip);

        toFlip.forEach(f => f.element.offsetHeight); // Force style recalculation so CSS transitions are triggered correctly on play

        animation
            .play()
            .then(() => {
                animation.finish();
                toEnter.forEach(item => item.state = 'updating');
                toExit.forEach(({ element }) => element.remove());
            });

        this.triggerData = newTriggerData;
        Array.from(this.items)
            .filter(([_, e]) => e.state == 'exiting')
            .forEach(([id]) => this.items.delete(id));
    }

    private addFlips(items: TrackedItem[]) {
        items.forEach(item => {
            item.parent ??= Array.from(this.items.values()).findLast(other => other != item && other.element.contains(item.element));
            item.transition = flip(item.previous!, item.current!, item.animationConfig, item.parent?.transition);
        });
    }
}

class TrackedItem {
    constructor(
        public element: HTMLElement,
        public config: IFlipConfig
    ) {
        this.id = config.id;
        this.offsetParent = element.offsetParent as HTMLElement ?? document.documentElement;
    }

    readonly id: any;
    state: FlipState = 'entering';
    previousElement?: HTMLElement;
    offsetParent: HTMLElement;
    previous?: Snapshot;
    current?: Snapshot;
    transition?: IFlip;
    animation?: Animation;
    parent?: TrackedItem;

    mount(element: HTMLElement, config: IFlipConfig) {
        if (this.element != element) {
            this.previousElement = this.element;
            this.element = element;
            this.offsetParent = element.offsetParent as HTMLElement ?? document.documentElement;
            this.state == 'updating';
        }
        this.config = config;
    }

    unmount(element: HTMLElement) {
        if (this.element == element) {
            this.element = element.cloneNode(true) as HTMLElement;
            this.state = 'exiting';
        } else {
            this.previousElement = element.cloneNode(true) as HTMLElement;
        }
    }

    snapshot() {
        this.previous = this.current;
        this.current = snapshot(this.element, this.config.animateProps);
    }

    shouldFlip(newTriggerData: any, oldTriggerData: any) {
        return (this.config.shouldFlip || defaults.shouldFlip)(newTriggerData, oldTriggerData, this.element, this.id);
    }

    get animationConfig() {
        return this.state == 'entering' ? this.config.enterAnimation ?? defaults.enterAnimation
            : this.state == 'exiting' ? this.config.exitAnimation ?? defaults.exitAnimation
                : this.config.updateAnimation ?? defaults.updateAnimation;
    }
}

type FlipState = 'entering' | 'exiting' | 'updating';

function applyEntryStyles(entering: TrackedItem[]) {
    return entering.map(flip => {
        let originalCssText = flip.element.style.cssText;
        Object.assign(flip.element.style, flip.config.entryStyles || defaults.entryStyles);
        return { element: flip.element, originalCssText };
    });
}

function removeEntryStyles(entryStyleChanges: { element: HTMLElement, originalCssText: string }[]) {
    entryStyleChanges.forEach(({ element, originalCssText }) => element.style.cssText = originalCssText);
}

function applyExitStyles(exiting: TrackedItem[]) {
    let parentRects = new Map<HTMLElement, DOMRect>();
    exiting.forEach((flip) => {
        let parentRect = getOrAdd(parentRects, flip.offsetParent, () => flip.offsetParent!.getBoundingClientRect());
        Object.assign(flip.element.style, {
            ...flip.previous!.styles,
            position: 'absolute',
            top: (flip.previous!.rect.top - parentRect.top) + 'px',
            left: (flip.previous!.rect.left - parentRect.left) + 'px',
            width: flip.previous!.rect.width + 'px',
            height: flip.previous!.rect.height + 'px',
            margin: 0,
            boxSizing: 'border-box'
        }, flip.config.exitStyles || defaults.exitStyles);
        flip.offsetParent!.appendChild(flip.element);
        delete flip.parent;
    });
}

function animateTransitions(items: TrackedItem[]) {
    return combineAnimations(
        items.map(item => item.animation = combineAnimations([
            animateCss(item.element, item.transition!.from, item.transition!.to, item.animationConfig.durationMs, item.animationConfig.delayMs, item.animationConfig.timing),
            animateTransforms(item.element, item.transition!.transforms)
        ])));
}

function animateTransforms(element: HTMLElement, effects: Effect<Translation | Scaling>[]) {
    let styles = mapEffect(combineEffects(effects), currentTransforms => ({
        transform: currentTransforms
            .flatMap(t => Object.entries(t))
            .map(([transform, value]) => `${transform}(${value}${units[transform] || ''})`)
            .join(' ')
    } as StyleValues));
    return animate(element, styles);
}

function finishPendingAnimations(animating: TrackedItem[]) {
    animating.forEach(a => a.animation?.finish());
}

const units: { [transform: string]: string } = {
    translateX: 'px',
    translateY: 'px'
}