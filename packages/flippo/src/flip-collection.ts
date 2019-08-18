import { animate, animateCss, combineAnimations, combineEffects, defaultAnimationConfigs, Effect, getAnimations, IAnimationConfig, mapEffect, StyleProperty, StyleValues } from "./animation";
import { flip, IFlip, Scaling, Snapshot, snapshot, Translation } from "./flip";
import { documentPosition, findLast, getOrAdd } from "./utils";

export interface IFlipConfig {
    id: any;
    animateProps?: StyleProperty[];
    shouldFlip?(newTriggerData: any, oldTriggerData: any, element: HTMLElement, id: any): boolean;
    entryStyles?: StyleValues;
    exitStyles?: StyleValues;

    enterAnimation?: IAnimationConfig;
    updateAnimation?: IAnimationConfig;
    exitAnimation?: IAnimationConfig;
}

export class FlipCollection {
    private elements = new Map<any, ITrackedElement>();
    private removedElements = new Map<any, ITrackedElement>();
    private snapshots = new Map<any, Snapshot>();
    private _triggerData: any;

    get triggerData() { return this._triggerData; }

    addElement(element: HTMLElement, config: IFlipConfig) {
        this.elements.set(config.id, { element, config, offsetParent: element.offsetParent as HTMLElement });
        this.removedElements.delete(config.id);
    }

    removeElement(id: any) {
        let flipped = this.elements.get(id);
        if (flipped) {
            this.removedElements.set(id, {
                element: flipped.element.cloneNode(true) as HTMLElement,
                offsetParent: flipped.offsetParent,
                config: flipped.config
            });
            this.elements.delete(id);
        }
    }

    snapshot() {
        this.snapshots.clear();
        this.removedElements.clear();

        Array.from(this.elements).forEach(([id, flipped]) => this.snapshots.set(id, snapshot(flipped.element, flipped.config.animateProps)));
    }

    flip(newTriggerData: any) {
        let toUpdate = this.getUpdatingElements(newTriggerData);
        let toExit = this.getExitingElements();
        let toEnter = this.getEnteringElements();

        let toFlip = toUpdate.concat(toExit).concat(toEnter)
            .sort((a, b) => documentPosition(a.element, b.element));

        finishPendingAnimations(toFlip);
        let entryStyleChanges = applyEntryStyles(toEnter);
        applyExitStyles(toExit);

        addSnapshots(toFlip);

        removeEntryStyles(entryStyleChanges);

        let flipped = addFlips(toFlip);

        let animation = animateTransitions(flipped);

        flipped.forEach(f => f.element.offsetHeight); // Force style recalculation so CSS transitions are triggered correctly on play

        animation
            .play()
            .then(() => {
                animation.finish();
                toExit.forEach(({ element }) => element.remove());
            });

        this._triggerData = newTriggerData;
        this.removedElements.clear();
        this.snapshots.clear();
    }

    private getEnteringElements(): IElementToFlip[] {
        return Array.from(this.elements.values())
            .filter(flipped => !this.snapshots.has(flipped.config.id))
            .map(added => ({
                tracked: added,
                element: added.element,
                current: snapshot(added.element, added.config.animateProps),
                animationConfig: added.config.enterAnimation || defaultAnimationConfigs.enter
            } as IElementToFlip));
    }

    private getUpdatingElements(newTriggerData: any): IElementToFlip[] {
        return this.withSnapshots(this.elements.values(), c => c.updateAnimation || defaultAnimationConfigs.update)
            .filter(({ tracked }) => tracked.config.shouldFlip == null
                || tracked.config.shouldFlip(newTriggerData, this.triggerData, tracked.element, tracked.config.id));
    }

    private getExitingElements() {
        return this.withSnapshots(this.removedElements.values(), c => c.exitAnimation || defaultAnimationConfigs.exit);
    }

    private withSnapshots(elements: Iterable<ITrackedElement>, getAnimationConfig: (config: IFlipConfig) => IAnimationConfig): IElementToFlip[] {
        return Array.from(elements)
            .map(tracked => ({
                tracked,
                element: tracked.element,
                previous: this.snapshots.get(tracked.config.id)!,
                animationConfig: getAnimationConfig(tracked.config)
            }))
            .filter(({ previous }) => previous);
    }
}

function addFlips(elementsToFlip: IElementToFlip[]): IFlippingElement[] {
    let flippedElements = [] as IFlippingElement[];
    elementsToFlip.forEach(toFlip => {
        let parent = findLast(flippedElements, contains(toFlip));
        flippedElements.push({
            ...toFlip,
            transition: flip(toFlip.previous!, toFlip.current!, toFlip.animationConfig, parent && parent.transition)
        });
    });
    return flippedElements;

    function contains(toFlip: IElementToFlip): (item: IFlippingElement) => boolean {
        return flipped => flipped.element.contains(toFlip.element);
    }
}

function applyEntryStyles(entering: IElementToFlip[]) {
    return entering.map(({ tracked, element }) => {
        let originalCssText = element.style.cssText;
        Object.assign(element.style, tracked.config.entryStyles || { opacity: '0' });
        return { element: element, originalCssText };
    });
}

function removeEntryStyles(entryStyleChanges: { element: HTMLElement, originalCssText: string }[]) {
    entryStyleChanges.forEach(({ element, originalCssText }) => element.style.cssText = originalCssText);
}

function applyExitStyles(exiting: IElementToFlip[]) {
    let parentRects = new Map<HTMLElement, ClientRect>();
    exiting.forEach(({ tracked, element, previous }) => {
        let parentRect = getOrAdd(parentRects, tracked.offsetParent, () => tracked.offsetParent!.getBoundingClientRect());
        Object.assign(element.style, {
            ...previous!.styles,
            position: 'absolute',
            top: (previous!.rect.top - parentRect.top) + 'px',
            left: (previous!.rect.left - parentRect.left) + 'px',
            width: previous!.rect.width + 'px',
            height: previous!.rect.height + 'px',
            margin: 0,
            boxSizing: 'border-box'
        }, tracked.config.exitStyles || { opacity: '0' });
        tracked.offsetParent!.appendChild(element);
    });
}

function addSnapshots(elementsToFlip: IElementToFlip[]) {
    elementsToFlip.forEach(e => {
        e.current = e.current || getSnapshot(e.tracked);
        e.previous = e.previous || getSnapshot(e.tracked);
    });
}

function getSnapshot(tracked: ITrackedElement) {
    return snapshot(tracked.element, tracked.config.animateProps);
}

function animateTransitions(transitions: IFlippingElement[]) {
    return combineAnimations(
        transitions
            .map(({ element, transition, animationConfig }) => combineAnimations([
                animateCss(element, transition.from, transition.to, animationConfig.durationMs, animationConfig.delayMs, animationConfig.timing),
                animateTransforms(element, transition.transforms)
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

function finishPendingAnimations(animating: IElementToFlip[]) {
    animating
        .flatMap(({ element }) => getAnimations(element))
        .forEach(a => a.finish());
}

const units: { [transform: string]: string } = {
    translateX: 'px',
    translateY: 'px'
}

interface ITrackedElement {
    element: HTMLElement;
    offsetParent: HTMLElement;
    config: IFlipConfig;
}

interface IElementToFlip {
    element: HTMLElement;
    previous?: Snapshot;
    current?: Snapshot;
    tracked: ITrackedElement;
    animationConfig: IAnimationConfig;
}

interface IFlippingElement extends IElementToFlip {
    transition: IFlip;
}