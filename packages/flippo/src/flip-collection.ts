import { animate, animateCss, Animation, applyTiming, combineAnimations, interpolateArray, Interpolator, map, StyleProperty, StyleValues, timing, TimingFunction } from "./animation";
import { flip, IFlip, ITransition, Scaling, Snapshot, snapshot, Translation } from "./flip";
import { documentPosition, findLast, getOrAdd } from "./utils";

export interface IFlipConfig {
    id: any;
    animateProps?: StyleProperty[];
    shouldFlip?(newTriggerData: any, oldTriggerData: any, element: HTMLElement, id: any): boolean;
    entryStyles?: StyleValues;
    exitStyles?: StyleValues;
}

export class FlipCollection {
    private elements = new Map<any, ITrackedElement>();
    private removedElements = new Map<any, ITrackedElement>();
    private snapshots = new Map<any, Snapshot>();
    private animations = new Map<HTMLElement, Animation>();
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
        let totalDuration = 300;

        let toUpdate = this.getUpdatingElements(newTriggerData);
        this.finishPendingAnimations(toUpdate);
        let updates = addFlips(toUpdate, true);
        let updateAnimations = this.animateTransitions(updates, totalDuration, 0, timing.update);

        let toExit = this.getExitingElements();
        applyExitStyles(toExit);
        let exits = addFlips(toExit, true);
        let exitAnimations = this.animateTransitions(exits, totalDuration * .3, 0, timing.exit);

        let toEnter = this.getEnteringElements();
        let entryStyleChanges = applyEntryStyles(toEnter);
        let enters = addFlips(toEnter, false);
        removeEntryStyles(entryStyleChanges);
        let enterAnimations = this.animateTransitions(enters, totalDuration * .7, totalDuration * .3, timing.enter);

        let fullAnimation = combineAnimations([updateAnimations, exitAnimations, enterAnimations]);

        fullAnimation.play()
            .then(() => {
                this.finishPendingAnimations(updates);
                this.finishPendingAnimations(enters);
                exits.forEach(({ element }) => element.remove());
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
                snapshot: snapshot(added.element, added.config.animateProps)
            }));
    }

    private getUpdatingElements(newTriggerData: any) {
        return this.withSnapshots(this.elements.values())
            .filter(({ tracked: flipped }) => flipped.config.shouldFlip == null
                || flipped.config.shouldFlip(newTriggerData, this.triggerData, flipped.element, flipped.config.id));
    }

    private getExitingElements() {
        return this.withSnapshots(this.removedElements.values());
    }

    private withSnapshots(elements: Iterable<ITrackedElement>): IElementToFlip[] {
        return Array.from(elements)
            .sort((a, b) => documentPosition(a.element, b.element))
            .map(tracked => ({
                tracked,
                element: tracked.element,
                snapshot: this.snapshots.get(tracked.config.id)!
            }))
            .filter(({ snapshot }) => snapshot);
    }

    private animateTransitions(transitions: { element: HTMLElement, transition: ITransition }[], durationMs: number, delayMs: number, timing: TimingFunction) {
        return combineAnimations(
            transitions
                .map(({ element, transition }) => {
                    let animation = combineAnimations([
                        animateCss(element, [transition.from, transition.to], durationMs, delayMs, timing),
                        animateTransforms(element, transition.transforms, durationMs, delayMs, timing)
                    ]);

                    this.animations.set(element, animation);

                    return animation;
                }));
    }

    private finishPendingAnimations(animating: IElementToFlip[]) {
        animating.forEach(({ element }) => {
            let animation = this.animations.get(element)
            if (animation) {
                animation.finish();
                this.animations.delete(element);
            }
        });
    }
}

function addFlips(elementsToFlip: IElementToFlip[], snapshotIsPrevious: boolean): IFlippingElement[] {
    let flippedElements = [] as IFlippingElement[];
    elementsToFlip.forEach(toFlip => {
        let parent = findLast(flippedElements, flipped => flipped.element.contains(toFlip.element));
        flippedElements.push({
            ...toFlip,
            transition: snapshotIsPrevious
                ? flip(toFlip.snapshot, getSnapshot(toFlip.tracked), parent && parent.transition)
                : flip(getSnapshot(toFlip.tracked), toFlip.snapshot, parent && parent.transition)
        });
    });
    return flippedElements;
}

function getSnapshot(flipped: ITrackedElement) {
    return snapshot(flipped.element, flipped.config.animateProps);
}

function applyEntryStyles(entering: IElementToFlip[]) {
    return entering.map(({ tracked: flipped }) => {
        let originalCssText = flipped.element.style.cssText;
        Object.assign(flipped.element.style, flipped.config.entryStyles || { opacity: '0' });
        return { element: flipped.element, originalCssText };
    });
}

function removeEntryStyles(entryStyleChanges: { element: HTMLElement, originalCssText: string }[]) {
    entryStyleChanges.forEach(({ element, originalCssText }) => element.style.cssText = originalCssText);
}

function applyExitStyles(exiting: IElementToFlip[]) {
    let parentRects = new Map<HTMLElement, ClientRect>();
    exiting.forEach(({ tracked: flipped, snapshot }) => {
        let parentRect = getOrAdd(parentRects, flipped.offsetParent, () => flipped.offsetParent!.getBoundingClientRect());
        Object.assign(flipped.element.style, {
            ...snapshot.styles,
            position: 'absolute',
            top: (snapshot.rect.top - parentRect.top) + 'px',
            left: (snapshot.rect.left - parentRect.left) + 'px',
            width: snapshot.rect.width + 'px',
            height: snapshot.rect.height + 'px',
            boxSizing: 'border-box'
        }, flipped.config.exitStyles || { opacity: '0' });
        flipped.offsetParent!.appendChild(flipped.element);
    });
}

function animateTransforms(element: HTMLElement, transforms: Interpolator<Translation | Scaling>[], durationMs: number, delayMs: number, timing: TimingFunction) {
    let styles = map(applyTiming(interpolateArray(transforms), timing), currentTransforms => ({
        transform: currentTransforms
            .flatMap(t => Object.entries(t))
            .map(([transform, value]) => `${transform}(${value}${units[transform] || ''})`)
            .join(' ')
    } as StyleValues));
    return animate(element, styles, durationMs, delayMs);
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
    snapshot: Snapshot;
    tracked: ITrackedElement;
}

interface IFlippingElement extends IElementToFlip {
    transition: IFlip;
}