import { FlipNode } from "flippo";
import { createContext, createElement, ReactNode, useRef } from "react";

export interface IFlipScopeProps {
    children: ReactNode;
    disconnect?: boolean;
}

export function FlipScope(props: IFlipScopeProps) {
    let flipCollection = useRef<Set<FlipNode> | undefined>(props.disconnect ? undefined : new Set());

    return createElement(FlipScopeContext.Provider, {
        value: flipCollection.current
    }, props.children);
}

export const FlipScopeContext = createContext(undefined as Set<FlipNode> | undefined);