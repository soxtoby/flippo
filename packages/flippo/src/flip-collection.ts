import { animate, animateCss, applyTiming, combineAnimations, interpolateArray, Interpolator, map, StyleProperty, StyleValues, timing, TimingFunction, Animation } from "./animation";
import { flip, IFlip, ITransition, Scaling, Snapshot, snapshot, Translation, unflip } from "./flip";
import { documentPosition, findLast, getOrAdd } from "./utils";

interface IFlippedElement {
    element: HTMLElement;
    offsetParent: HTMLElement;
    config: IFlipConfig;
}

export interface IFlipConfig {
    id: any;
    animateProps?: StyleProperty[];
    shouldFlip?(newTriggerData: any, oldTriggerData: any, element: HTMLElement, id: any): boolean;
    entryStyles?: StyleValues;
    exitStyles?: StyleValues;
}

export class FlipCollection {
    private elements = new Map<any, IFlippedElement>();
    private removedElements = new Map<any, IFlippedElement>();
    private undoElements = new Set<HTMLElement>();
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

    addUndoElement(element: HTMLElement) {
        this.undoElements.add(element);
    }

    removeUndoElement(element: HTMLElement) {
        this.undoElements.delete(element);
    }

    snapshot() {
        this.snapshots.clear();
        this.removedElements.clear();

        Array.from(this.elements).forEach(([id, flipped]) => this.snapshots.set(id, snapshot(flipped.element, flipped.config.animateProps)));
    }

    flip(newTriggerData: any) {
        let totalDuration = 300;

        let updating = this.getUpdatingElements(newTriggerData);
        this.finishPendingAnimations(updating);
        let updates = getTransitions(updating.map(({ flipped, snapshot }) => ({ flipped, previous: snapshot, current: getSnapshot(flipped) })));
        let updateAnimations = this.animateTransitions(updates, totalDuration, 0, timing.update);

        let undoing = this.getUndoingElements(updates);
        this.finishPendingAnimations(undoing);
        let undos = getUndos(undoing);
        let undoAnimations = this.animateTransitions(undos, totalDuration, 0, timing.update);

        let exiting = this.getExitingElements();
        applyExitStyles(exiting);
        let exits = getTransitions(exiting.map(({ flipped, snapshot }) => ({ flipped, previous: snapshot, current: getSnapshot(flipped) })));
        let exitAnimations = this.animateTransitions(exits, totalDuration * .3, 0, timing.exit);

        let entering = this.getEnteringElements();
        let entryStyleChanges = applyEntryStyles(entering);
        let enters = getTransitions(entering.map(({ flipped, snapshot }) => ({ flipped, previous: getSnapshot(flipped), current: snapshot })));
        removeEntryStyles(entryStyleChanges);
        let enterAnimations = this.animateTransitions(enters, totalDuration * .7, totalDuration * .3, timing.enter);

        let fullAnimation = combineAnimations([updateAnimations, undoAnimations, exitAnimations, enterAnimations]);

        fullAnimation.play()
            .then(() => {
                this.finishPendingAnimations(updating);
                this.finishPendingAnimations(undoing);
                this.finishPendingAnimations(entering);
                exits.forEach(({ element }) => element.remove());
            });

        this._triggerData = newTriggerData;
        this.removedElements.clear();
        this.snapshots.clear();
    }

    private getEnteringElements() {
        return Array.from(this.elements.values())
            .filter(flipped => !this.snapshots.has(flipped.config.id))
            .map(added => ({
                flipped: added,
                element: added.element,
                snapshot: snapshot(added.element, added.config.animateProps)
            }));
    }

    private getUpdatingElements(newTriggerData: any) {
        return this.withSnapshots(this.elements.values())
            .filter(({ flipped }) => flipped.config.shouldFlip == null
                || flipped.config.shouldFlip(newTriggerData, this.triggerData, flipped.element, flipped.config.id));
    }

    private getExitingElements() {
        return this.withSnapshots(this.removedElements.values());
    }

    private withSnapshots(elements: Iterable<IFlippedElement>) {
        return Array.from(elements)
            .sort((a, b) => documentPosition(a.element, b.element))
            .map(flipped => ({ flipped, element: flipped.element, snapshot: this.snapshots.get(flipped.config.id)! }))
            .filter(({ snapshot }) => snapshot);
    }

    private getUndoingElements(updates: { element: HTMLElement, transition: IFlip }[]) {
        return Array.from(this.undoElements.values())
            .flatMap(element => {
                let parent = findLast(updates, ({ element }) => element.contains(element));
                return parent
                    ? [{ element, parentFlip: parent.transition, snapshot: snapshot(element) }]
                    : [];
            })
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

    private finishPendingAnimations(animating: { element: HTMLElement }[]) {
        animating.forEach(({ element }) => {
            let animation = this.animations.get(element)
            if (animation) {
                animation.finish();
                this.animations.delete(element);
            }
        });
    }
}

function getSnapshot(flipped: IFlippedElement) {
    return snapshot(flipped.element, flipped.config.animateProps);
}

function getTransitions(elementsWithSnapshots: { flipped: IFlippedElement, previous: Snapshot, current: Snapshot }[]) {
    return elementsWithSnapshots.map(({ flipped, previous, current }) => ({
        element: flipped.element,
        transition: flip(previous, current)
    }));
}

function getUndos(undoing: { element: HTMLElement, parentFlip: IFlip, snapshot: Snapshot }[]) {
    return undoing.map(({ element, parentFlip, snapshot }) => ({ element, transition: unflip(snapshot, parentFlip) }));
}

function applyEntryStyles(entering: { flipped: IFlippedElement }[]) {
    return entering.map(({ flipped }) => {
        let originalCssText = flipped.element.style.cssText;
        Object.assign(flipped.element.style, flipped.config.entryStyles || { opacity: '0' });
        return { element: flipped.element, originalCssText };
    });
}

function removeEntryStyles(entryStyleChanges: { element: HTMLElement, originalCssText: string }[]) {
    entryStyleChanges.forEach(({ element, originalCssText }) => element.style.cssText = originalCssText);
}

function applyExitStyles(exiting: { flipped: IFlippedElement, snapshot: Snapshot }[]) {
    let parentRects = new Map<HTMLElement, ClientRect>();
    exiting.forEach(({ flipped, snapshot }) => {
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
