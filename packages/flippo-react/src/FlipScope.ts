import { FlipNode } from "flippo";
import { createContext, createElement, ReactNode, useRef } from "react";
import { areEquivalent } from "./Utils";

export interface IFlipScopeProps {
    triggerData?: any;
    children: ReactNode;
}

export function FlipScope(props: IFlipScopeProps) {
    let flipCollection = useRef<FlipScopeCollection>({ triggerData: undefined, nodes: new Set() });

    let doFlip = props.triggerData === undefined
        || !areEquivalent(flipCollection.current.triggerData, props.triggerData);

    flipCollection.current.triggerData = props.triggerData;

    if (doFlip) {
        for (let node of flipCollection.current.nodes)
            node.flip();
    }

    return createElement(FlipScopeContext.Provider, {
        value: flipCollection.current,
        children: props.children
    });
}

export type FlipScopeCollection = {
    triggerData: any;
    nodes: Set<FlipNode>;
}

export const FlipScopeContext = createContext<FlipScopeCollection>({ triggerData: undefined, nodes: new Set() });