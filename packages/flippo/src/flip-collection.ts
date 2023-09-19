import { IAnimationConfig, StyleProperty, StyleValues } from "./animation";
import { defaults } from "./defaults";
import { flip, FlipAnimation, Snapshot, snapshot } from "./flip";
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

    constructor(private _parent?: FlipCollection) { }

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

        toFlip.forEach(f => f.animation?.finish());

        let entryStyleChanges = applyEntryStyles(toEnter);
        applyExitStyles(toExit);

        toFlip.forEach(f => f.snapshot());

        removeEntryStyles(entryStyleChanges);

        toEnter.forEach(i => i.snapshot());

        toFlip.forEach(f => f.parent ??= this.findParent(f.element) ?? this._parent?.findParent(f.element));
        toFlip.forEach(f => f.animation = flip(f.element, f.previous!, f.current!, f.animationConfig, f.parent));

        toFlip.forEach(f => f.element.offsetHeight); // Force style recalculation so CSS transitions are triggered correctly on play

        toFlip.forEach(f => f.animation!.play());

        toEnter.forEach(f => f.animation!.finished.then(() => f.state = 'updating'));
        toExit.forEach(f => f.animation!.finished.then(() => f.element.remove()));

        this.triggerData = newTriggerData;
        toExit.forEach(f => this.items.delete(f.id));
    }

    private findParent(element: HTMLElement) {
        return Array.from(this.items.values())
            .findLast(other => other.element != element && other.element.contains(element));
    }
}

export class TrackedItem {
    constructor(
        public element: HTMLElement,
        public config: IFlipConfig
    ) {
        this.id = config.id;
        this.offsetParent = element.offsetParent as HTMLElement ?? document.documentElement;
    }

    readonly id: any;
    state: FlipState = 'entering';
    offsetParent: HTMLElement;
    previous?: Snapshot;
    current?: Snapshot;
    animation?: FlipAnimation;
    parent?: TrackedItem;

    mount(element: HTMLElement, config: IFlipConfig) {
        if (this.element != element) {
            this.element = element;
            this.offsetParent = element.offsetParent as HTMLElement ?? document.documentElement;
            if (this.state == 'exiting')
                this.state = 'updating'; // Removed element was replaced with a new one
        }
        this.config = config;
    }

    unmount(element: HTMLElement) {
        if (this.element == element) { // May have been replaced with new element already
            this.element = element.cloneNode(true) as HTMLElement;
            this.state = 'exiting';
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