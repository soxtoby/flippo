import { animate, animateCss, combineAnimations, interpolateArray, Interpolator } from "./animate";
import { flip, IFlip, Scaling, Snapshot, snapshot, StyleProperty, Translation } from "./flip";
import { documentPosition, findLast, getOrAdd } from "./utils";

interface IFlippedElement {
    element: HTMLElement;
    config: IFlipConfig;
}

export interface IFlipConfig {
    id: any;
    animateProps?: StyleProperty[];
    shouldFlip?(newTriggerData: any, oldTriggerData: any, element: HTMLElement, id: any): boolean;
}

interface IRemovedElement extends IFlippedElement {
    offsetParent: HTMLElement | null;
}

export class FlipCollection {
    private elements = new Map<any, IFlippedElement>();
    private removedElements = new Map<any, IRemovedElement>();
    private snapshots = new Map<any, Snapshot>();
    private _triggerData: any;

    get triggerData() { return this._triggerData; }

    addElement(element: HTMLElement, config: IFlipConfig) {
        this.elements.set(config.id, { element, config });
        this.removedElements.delete(config.id);
    }

    removeElement(id: any) {
        let flipped = this.elements.get(id);
        if (flipped) {
            this.removedElements.set(id, {
                element: flipped.element.cloneNode(true) as HTMLElement,
                offsetParent: flipped.element.offsetParent as HTMLElement | null,
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

    async flip(newTriggerData: any) {
        let entering = Array.from(this.elements.values())
            .filter(flipped => !this.snapshots.has(flipped.config.id));

        let updating = this.withSnapshots(this.elements.values())
            .filter(([flipped]) => flipped.config.shouldFlip == null
                || flipped.config.shouldFlip(newTriggerData, this.triggerData, flipped.element, flipped.config.id));

        let exiting = this.withSnapshots(this.removedElements.values());

        this._triggerData = newTriggerData;

        // entering.forEach(e => e.element.style.opacity = '0');

        let parentRects = new Map<HTMLElement, ClientRect>();

        exiting.forEach(([e, snapshot]) => {
            if (e.offsetParent && e.offsetParent.ownerDocument) {
                let parentRect = getOrAdd(parentRects, e.offsetParent, () => e.offsetParent!.getBoundingClientRect());
                Object.assign(e.element.style, {
                    ...snapshot.styles,
                    position: 'absolute',
                    top: (snapshot.rect.top - parentRect.top) + 'px',
                    left: (snapshot.rect.left - parentRect.left) + 'px',
                    width: snapshot.rect.width + 'px',
                    height: snapshot.rect.height + 'px',
                    boxSizing: 'border-box',
                    //opacity: 0,
                    margin: 0
                });
                snapshot.styles.opacity = snapshot.styles.opacity || '1';
                e.offsetParent.appendChild(e.element);
            }
        });

        let updates = [] as [HTMLElement, IFlip][];
        for (let [updated, snapshot] of updating) {
            let parent = findLast(updates, ([el]) => el.contains(updated.element));
            updates.push([updated.element, flip(snapshot, updated.element, parent && parent[1])]);
        }

        let exits = [] as [HTMLElement, IFlip][];
        for (let [removed, snapshot] of exiting) {
            let parent = findLast(exits, ([el]) => el.contains(removed.element))
                || findLast(updates, ([el]) => el.contains(removed.element));
            exits.push([removed.element, flip(snapshot, removed.element, parent && parent[1])]);
        }

        let updateAnimations = combineAnimations(updates.map(([element, flip]) => combinedAnimation(element, [flip.from, flip.to], flip.transforms)));
        let exitAnimations = combineAnimations(exits.map(([element, flip]) => combinedAnimation(element, [flip.from, flip.to], flip.transforms)));
        let enterAnimations = combineAnimations(entering.map(enter => combinedAnimation(enter.element, [{ opacity: 0 }, { opacity: 1 }])));

        await exitAnimations.play();
        exits.forEach(([e]) => e.remove());

        await updateAnimations.play();
        updates.forEach(([element, flip]) => Object.assign(element.style, flip.to));

        await enterAnimations.play();
        entering.forEach(e => e.element.style.opacity = '');

        this.removedElements.clear();
        this.snapshots.clear();
    }

    private withSnapshots<Element extends IFlippedElement>(elements: Iterable<Element>) {
        return Array.from(elements)
            .sort((a, b) => documentPosition(a.element, b.element))
            .map(e => [e, this.snapshots.get(e.config.id)] as [Element, Snapshot])
            .filter(([, snapshot]) => snapshot);
    }
}

function combinedAnimation(element: HTMLElement, keyframes: Keyframe[], transforms: Interpolator<Translation | Scaling>[] = []) {
    let css = animateCss(element, keyframes, 250);
    let js = animate(interpolateArray(transforms), 250, currentTransforms =>
        element.style.transform = currentTransforms
            .flatMap(t => Object.entries(t))
            .map(([transform, value]) => `${transform}(${value}${units[transform] || ''})`)
            .join(' '));
    return combineAnimations([css, js]);
}

const units: { [transform: string]: string } = {
    translateX: 'px',
    translateY: 'px'
}