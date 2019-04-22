import { cloneElement, createContext, createElement, ReactElement, ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { flip, Snapshot, snapshot, StyleProperty, defaultAnimate, IFlip } from "./flip";
import { getOrAdd, documentPosition, findLast } from "./utils";

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

    async flip(newTriggerData: any, animate = defaultAnimate) {
        let entering = Array.from(this.elements.values())
            .filter(flipped => !this.snapshots.has(flipped.config.id));

        let updating = this.withSnapshots(this.elements.values())
            .filter(([flipped]) => flipped.config.shouldFlip == null
                || flipped.config.shouldFlip(newTriggerData, this.triggerData, flipped.element, flipped.config.id));

        let exiting = this.withSnapshots(this.removedElements.values());

        this._triggerData = newTriggerData;

        entering.forEach(e => e.element.style.opacity = '0');

        let parentRects = new Map<HTMLElement, ClientRect>();

        exiting.forEach(([e, snapshot]) => {
            if (e.offsetParent && e.offsetParent.ownerDocument) {
                let parentRect = getOrAdd(parentRects, e.offsetParent, () => e.offsetParent!.getBoundingClientRect());
                Object.assign(e.element.style, {
                    ...snapshot.styles,
                    position: 'absolute',
                    top: (snapshot.rect.top - parentRect.top) + 'px',
                    left: (snapshot.rect.left - parentRect.left) + 'px',
                    opacity: 0
                })
                e.offsetParent.appendChild(e.element);
            }
        });

        let exits = exiting.map(([removed, snapshot]) => [removed.element, flip(snapshot, removed.element)] as [HTMLElement, IFlip]);

        let updates = [] as [HTMLElement, IFlip][];
        for (let [updated, snapshot] of updating) {
            let parent = findLast(updates, u => u[0].contains(updated.element));
            updates.push([updated.element, flip(snapshot, updated.element, parent && parent[1])]);
        }

        updates.forEach(([element, flip]) => Object.assign(element.style, flip.from));

        await Promise.all(exits.map(([element, flip]) => animate(element, [flip.from, flip.to])));
        exits.forEach(([e]) => e.remove());
        await Promise.all(updates.map(([element, flip]) => animate(element, [flip.from, flip.to])));
        updates.forEach(([element, flip]) => Object.assign(element.style, flip.to));
        await Promise.all(entering.map(enter => animate(enter.element, [{ opacity: 0 }, { opacity: 1 }])));

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

const FlipContext = createContext(null as any as FlipCollection);

export interface IFlipScopeProps {
    triggerData: any;
    children: ReactNode;
}

interface IFlippedElement {
    element: HTMLElement;
    config: IFlipConfig;
}

interface IRemovedElement extends IFlippedElement {
    offsetParent: HTMLElement | null;
}

export function FlipScope(props: IFlipScopeProps) {
    let flipCollection = useRef<FlipCollection>();
    flipCollection.current = flipCollection.current || new FlipCollection();

    let doFlip = flipCollection.current.triggerData != props.triggerData;

    if (doFlip)
        flipCollection.current.snapshot();

    useLayoutEffect(() => {
        if (doFlip)
            flipCollection.current!.flip(props.triggerData);
    });

    return createElement(FlipContext.Provider, {
        value: flipCollection.current!,
        children: props.children
    });
}

export interface IFlippedProps extends IFlipConfig {
    children: ReactElement
}

export function Flipped(props: IFlippedProps) {
    let { children, ...config } = props;
    let ref = useFlip(config);
    return cloneElement(children, { ref });
}

export interface IFlipConfig {
    id: any;
    animateProps?: StyleProperty[];
    shouldFlip?(newTriggerData: any, oldTriggerData: any, element: HTMLElement, id: any): boolean;
}

export function useFlip(config: IFlipConfig) {
    let ref = useRef<HTMLElement>(null);
    let flipCollection = useContext(FlipContext);

    useLayoutEffect(() => {
        flipCollection.addElement(ref.current!, config);
        let registeredId = config.id; // Make sure to remove the original id, not the current id
        return () => flipCollection.removeElement(registeredId);
    });

    return ref;
}