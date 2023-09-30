import { defaults } from "./Defaults.js";
import type { IFlipConfig, StyleValues } from "./FlipAnimation.js";
import { FlipNode } from "./FlipNode.js";
import { getOrAdd } from "./Utils.js";

let isFlipPending = false;
let isFlippingGroup = false;

const nodesById = new Map<string, FlipNode>();
const groups = new Map<string, Set<FlipNode>>();

export function register(id: string, config: IFlipConfig = {}, parent?: FlipNode) {
    let node = getOrAdd(nodesById, id, () => new FlipNode(id, config, parent));

    if (config.group != node.config.group)
        groups.get(node.config.group!)?.delete(node);
    if (config.group)
        getOrAdd(groups, config.group, newGroup).add(node);

    node.config = config;
    node.parent = parent;
    return node;
}

function newGroup() { return new Set(); }

export function mount(id: string, element: HTMLElement) {
    nodesById.get(id)?.mount(element);
}

export function unmount(id: string, element: HTMLElement) {
    nodesById.get(id)?.unmount(element);
}

export function deregister(node: FlipNode) {
    nodesById.delete(node.id);
}

export function queueFlip(group?: string) {
    if (!isFlipPending) {
        isFlipPending = true;
        queueMicrotask(flip);
    }

    if (group && !isFlippingGroup) {
        isFlippingGroup = true; // Prevent infinite recursion
        try {
            let nodes = groups.get(group) ?? [];
            for (let node of nodes)
                node.flip();
        } finally {
            isFlippingGroup = false;
        }
    }
}

function flip() {
    isFlipPending = false;

    let toFlip = Array.from(nodesById.values()).filter(n => n.isFlipPending);
    let toEnter = toFlip.filter(n => n.state == 'entering');
    let toExit = toFlip.filter(n => n.state == 'exiting');
    let toUpdate = toFlip.filter(n => n.state == 'updating');

    for (let node of toFlip) {
        node.isFlipPending = false;
        node.animation?.finish();
    }

    let entryStyleChanges = applyTempStyles(toEnter, n => n.enterConfig?.styles ?? defaults.enter.styles);
    let updateStyleChanges = applyTempStyles(toUpdate, n => n.updateConfig?.styles ?? defaults.update.styles);
    applyExitStyles(toExit);

    for (let node of toFlip)
        node.snapshot();

    removeTempStyles(entryStyleChanges);
    removeTempStyles(updateStyleChanges);

    for (let node of toEnter)
        node.snapshot();

    for (let node of toFlip)
        node.animateFlip();

    for (let exiting of toExit)
        deregister(exiting);
}

function applyTempStyles(nodes: FlipNode[], getFlipStyles: (node: FlipNode) => StyleValues) {
    return nodes.map(flip => {
        let element = flip.element!;
        let originalCssText = element.style.cssText;
        let styles = getFlipStyles(flip);
        for (let key in styles) {
            if (styles[key] !== true)
                element.style[key] = styles[key] as string;
        }
        return { element, originalCssText };
    });
}

function removeTempStyles(styleChanges: { element: HTMLElement; originalCssText: string; }[]) {
    for (let { element, originalCssText } of styleChanges)
        element.style.cssText = originalCssText;
}

function applyExitStyles(exiting: FlipNode[]) {
    let parentRects = new Map<HTMLElement, DOMRect>();

    for (let node of exiting) {
        let element = node.element!;
        let offsetParent = node.offsetParent!;
        let offsetParentRect = getOrAdd(parentRects, offsetParent, () => offsetParent.getBoundingClientRect());

        let current = node.current!;
        let parentNodeRect = node.parent?.current?.rect;

        Object.assign(element.style, {
            ...current.styles,
            position: 'absolute',
            top: (current.offset && parentNodeRect
                ? offsetParentRect.top - parentNodeRect.top + current.offset.y
                : current.rect.top - offsetParentRect.top) + 'px',
            left: (current.offset && parentNodeRect
                ? offsetParentRect.left - parentNodeRect.left + current.offset.x
                : current.rect.left - offsetParentRect.left) + 'px',
            width: current.rect.width + 'px',
            height: current.rect.height + 'px',
            margin: 0,
            boxSizing: 'border-box'
        }, node.exitConfig?.styles ?? defaults.exit.styles);
        offsetParent.appendChild(element);
    }
}