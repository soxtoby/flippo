import { animate, animateCss, applyTiming, combineAnimations, interpolateArray, Interpolator, map, StyleProperty, StyleValues, timing, TimingFunction } from "./animation";
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
        let updates = getTransitions(updating.map(([updated, previous]) => [updated, previous, getSnapshot(updated)]));
        let updateAnimations = animateTransitions(updates, totalDuration, 0, timing.update);

        let undos = getUndos(this.undoElements, updates);
        let undoAnimations = animateTransitions(undos, totalDuration, 0, timing.update);

        let exiting = this.getExitingElements();
        applyExitStyles(exiting);
        let exits = getTransitions(exiting.map(([removed, previous]) => [removed, previous, getSnapshot(removed)]));
        let exitAnimations = animateTransitions(exits, totalDuration * .3, 0, timing.exit);

        let entering = this.getEnteringElements();
        applyEntryStyles(entering);
        let enters = getTransitions(entering.map(([flipped, current]) => [flipped, getSnapshot(flipped), current]));
        let enterAnimations = animateTransitions(enters, totalDuration * .7, totalDuration * .3, timing.enter);

        let fullAnimation = combineAnimations([updateAnimations, undoAnimations, exitAnimations, enterAnimations]);

        fullAnimation.play()
            .then(() => {
                updates.forEach(([element, flip]) => Object.assign(element.style, flip.to));
                exits.forEach(([e]) => e.remove());
                enters.forEach(([e]) => e.style.opacity = '');
            });

        this._triggerData = newTriggerData;
        this.removedElements.clear();
        this.snapshots.clear();
    }

    private getEnteringElements() {
        return Array.from(this.elements.values())
            .filter(flipped => !this.snapshots.has(flipped.config.id))
            .map(added => [added, snapshot(added.element, added.config.animateProps)] as const);
    }

    private getUpdatingElements(newTriggerData: any) {
        return this.withSnapshots(this.elements.values())
            .filter(([flipped]) => flipped.config.shouldFlip == null
                || flipped.config.shouldFlip(newTriggerData, this.triggerData, flipped.element, flipped.config.id));
    }

    private getExitingElements() {
        return this.withSnapshots(this.removedElements.values())
            .map(([flipped, previous]) => [flipped, previous] as const);
    }

    private withSnapshots<Element extends IFlippedElement>(elements: Iterable<Element>) {
        return Array.from(elements)
            .sort((a, b) => documentPosition(a.element, b.element))
            .map(e => [e, this.snapshots.get(e.config.id)!] as const)
            .filter(([, snapshot]) => snapshot);
    }
}

function getSnapshot(flipped: IFlippedElement) {
    return snapshot(flipped.element, flipped.config.animateProps);
}

function getTransitions(elementsWithSnapshot: (readonly [IFlippedElement, Snapshot, Snapshot])[]) {
    return elementsWithSnapshot.map(([flipped, previous, current]) => [flipped.element, flip(previous, current)] as const);
}

function getUndos(undoing: Set<HTMLElement>, updates: (readonly [HTMLElement, IFlip])[]) {
    return Array.from(undoing)
        .flatMap(element => {
            let parent = findLast(updates, ([el]) => el.contains(element));
            return parent
                ? [[element, unflip(snapshot(element), parent[1])] as const]
                : [];
        });
}

function applyEntryStyles(entering: (readonly [IFlippedElement, ...any[]])[]) {
    entering.forEach(([added]) => Object.assign(added.element.style, added.config.entryStyles || { opacity: '0' }));
}

function applyExitStyles(exiting: (readonly [IFlippedElement, Snapshot, ...any[]])[]) {
    let parentRects = new Map<HTMLElement, ClientRect>();
    exiting.forEach(([removed, previous]) => {
        let parentRect = getOrAdd(parentRects, removed.offsetParent, () => removed.offsetParent!.getBoundingClientRect());
        Object.assign(removed.element.style, {
            ...previous.styles,
            position: 'absolute',
            top: (previous.rect.top - parentRect.top) + 'px',
            left: (previous.rect.left - parentRect.left) + 'px',
            width: previous.rect.width + 'px',
            height: previous.rect.height + 'px',
            boxSizing: 'border-box'
        }, removed.config.exitStyles || { opacity: '0' });
        removed.offsetParent!.appendChild(removed.element);
    });
}

function animateTransitions(transitions: (readonly [HTMLElement, ITransition])[], durationMs: number, delayMs: number, timing: TimingFunction) {
    return combineAnimations(
        transitions
            .map(([element, transition]) =>
                combineAnimations([
                    animateCss(element, [transition.from, transition.to], durationMs, delayMs, timing),
                    animateTransforms(element, transition.transforms, durationMs, delayMs, timing)
                ])));
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
