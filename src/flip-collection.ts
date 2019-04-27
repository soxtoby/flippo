import { animate, animateCss, Animation, applyTiming, combineAnimations, interpolateArray, Interpolator, NullAnimation } from "./animate";
import { flip, ITransition, Scaling, Snapshot, snapshot, StyleProperty, StyleValues, Translation, unflip } from "./flip";
import { CssTimingFunction, timing } from "./timing";
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
        let entering = Array.from(this.elements.values())
            .filter(flipped => !this.snapshots.has(flipped.config.id))
            .map(added => [added, snapshot(added.element, added.config.animateProps)] as const);

        let updating = this.withSnapshots(this.elements.values())
            .filter(([flipped]) => flipped.config.shouldFlip == null
                || flipped.config.shouldFlip(newTriggerData, this.triggerData, flipped.element, flipped.config.id));

        let exiting = this.withSnapshots(this.removedElements.values())
            .filter(([removed]) => removed.offsetParent && removed.offsetParent.ownerDocument);

        this._triggerData = newTriggerData;
        this.removedElements.clear();
        this.snapshots.clear();

        let parentRects = new Map<HTMLElement, ClientRect>();

        exiting.forEach(([removed, snapshot]) => {
            let parentRect = getOrAdd(parentRects, removed.offsetParent, () => removed.offsetParent!.getBoundingClientRect());
            Object.assign(removed.element.style, {
                ...snapshot.styles,
                position: 'absolute',
                top: (snapshot.rect.top - parentRect.top) + 'px',
                left: (snapshot.rect.left - parentRect.left) + 'px',
                width: snapshot.rect.width + 'px',
                height: snapshot.rect.height + 'px',
                boxSizing: 'border-box',
                margin: 0
            }, removed.config.exitStyles || { opacity: '0' });
            removed.offsetParent!.appendChild(removed.element);
        });

        let updates = updating.map(([updated, previous]) => [updated.element, flip(previous, snapshot(updated.element, updated.config.animateProps), updated.element)] as const);
        let exits = exiting.map(([removed, previous]) => [removed.element, flip(previous, snapshot(removed.element, removed.config.animateProps), removed.element)] as const);

        let undos = [] as [HTMLElement, ITransition][];
        for (let element of Array.from(this.undoElements)) {
            let parent = findLast(updates, ([el]) => el.contains(element));
            if (parent)
                undos.push([element, unflip(element, parent[1])]);
        }

        let totalDuration = 300;
        let updateAnimations = combineAnimations(
            updates.map(([element, flip]) => combinedAnimation(element, totalDuration, 0, timing.update, [flip.from, flip.to], flip.transforms))
                .concat(undos.map(([element, transition]) => combinedAnimation(element, totalDuration, 0, timing.update, [transition.from, transition.to], transition.transforms))));
        let exitAnimations = combineAnimations(exits.map(([element, flip]) => combinedAnimation(element, totalDuration * .3, 0, timing.exit, [flip.from, flip.to], flip.transforms)));

        entering.forEach(([added]) => Object.assign(added.element.style, added.config.entryStyles || { opacity: '0' }));
        let enters = entering.map(([added, target]) => [added.element, flip(snapshot(added.element, added.config.animateProps), target, added.element)] as const);
        let enterAnimations = combineAnimations(enters.map(([element, flip]) => combinedAnimation(element, totalDuration * .7, totalDuration * .3, timing.enter, [flip.from, flip.to], flip.transforms)));

        let fullAnimation = combineAnimations([updateAnimations, exitAnimations, enterAnimations]);

        fullAnimation.play()
            .then(() => {
                updates.forEach(([element, flip]) => Object.assign(element.style, flip.to));
                exits.forEach(([e]) => e.remove());
                enters.forEach(([e]) => e.style.opacity = '');
            });
    }

    private withSnapshots<Element extends IFlippedElement>(elements: Iterable<Element>) {
        return Array.from(elements)
            .sort((a, b) => documentPosition(a.element, b.element))
            .map(e => [e, this.snapshots.get(e.config.id)] as [Element, Snapshot])
            .filter(([, snapshot]) => snapshot);
    }
}

function combinedAnimation(element: HTMLElement, durationMs: number, delayMs: number, timing: CssTimingFunction, keyframes: Keyframe[], transforms: Interpolator<Translation | Scaling>[] = []) {
    let css = keyframes.length ? animateCss(element, keyframes, durationMs, delayMs, timing) : NullAnimation;
    let js = transforms.length ? animate(applyTiming(interpolateArray(transforms), timing), durationMs, delayMs, currentTransforms =>
        element.style.transform = currentTransforms
            .flatMap(t => Object.entries(t))
            .map(([transform, value]) => `${transform}(${value}${units[transform] || ''})`)
            .join(' '))
        : NullAnimation;
    return combineAnimations([css, js]);
}

const units: { [transform: string]: string } = {
    translateX: 'px',
    translateY: 'px'
}