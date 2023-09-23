import { defaults } from "./Defaults";
import { IFlipConfig } from "./FlipAnimation";
import { FlipNode } from "./FlipNode";
import { getOrAdd } from "./Utils";

let isFlipPending = false;

const nodesById = new Map<any, FlipNode>();

export function register(id: any, config: Partial<IFlipConfig> = {}, parent?: FlipNode) {
    let node = getOrAdd(nodesById, id, () => new FlipNode(id, config, parent));
    node.config = config;
    node.parent = parent;
    return node;
}

export function mount(id: any, element: HTMLElement) {
    nodesById.get(id)?.mount(element);
}

export function unmount(id: any, element: HTMLElement) {
    nodesById.get(id)?.unmount(element);
}

export function deregister(node: FlipNode) {
    nodesById.delete(node.id);
}

export function queueFlip() {
    if (!isFlipPending) {
        isFlipPending = true;
        queueMicrotask(flip);
    }
}

function flip() {
    isFlipPending = false;

    let toFlip = Array.from(nodesById.values()).filter(n => n.isFlipPending);
    let toEnter = toFlip.filter(n => n.state == 'entering');
    let toExit = toFlip.filter(n => n.state == 'exiting');

    for (let node of toFlip) {
        node.isFlipPending = false;
        node.animation?.finish();
    }

    let entryStyleChanges = applyEntryStyles(toEnter);
    applyExitStyles(toExit);

    for (let node of toFlip)
        node.snapshot();

    removeEntryStyles(entryStyleChanges);

    for (let node of toEnter)
        node.snapshot();

    for (let node of toFlip)
        node.prepareAnimation();

    for (let exiting of toExit)
        deregister(exiting);

    for (let node of toFlip)
        node.animation!.play();
}

function applyEntryStyles(entering: FlipNode[]) {
    return entering.map(flip => {
        let element = flip.element!;
        let originalCssText = element.style.cssText;
        Object.assign(element.style, flip.config.entryStyles || defaults.entryStyles);
        return { element, originalCssText };
    });
}

function removeEntryStyles(entryStyleChanges: { element: HTMLElement; originalCssText: string; }[]) {
    for (let { element, originalCssText } of entryStyleChanges)
        element.style.cssText = originalCssText;
}

function applyExitStyles(exiting: FlipNode[]) {
    let parentRects = new Map<HTMLElement, DOMRect>();

    for (let node of exiting) {
        let element = node.element!;
        let offsetParent = node.offsetParent!;
        let parentRect = getOrAdd(parentRects, offsetParent, () => offsetParent.getBoundingClientRect());
        Object.assign(element.style, {
            ...node.previous!.styles,
            position: 'absolute',
            top: (node.previous!.rect.top - parentRect.top) + 'px',
            left: (node.previous!.rect.left - parentRect.left) + 'px',
            width: node.previous!.rect.width + 'px',
            height: node.previous!.rect.height + 'px',
            margin: 0,
            boxSizing: 'border-box'
        }, node.config.exitStyles || defaults.exitStyles);
        offsetParent.appendChild(element);
    }
}