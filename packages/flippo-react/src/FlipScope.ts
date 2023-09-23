import { FlipNode } from "flippo";
import { createContext, createElement, ReactNode, useContext, useMemo } from "react";

export interface IFlipScopeProps {
    id?: string;
    children: ReactNode;
    disconnect?: boolean;
}

export function FlipScope(props: IFlipScopeProps) {
    let parent = useFlipScopeContext();

    let id = parent.id && props.id
        ? parent.id + ':' + props.id
        : props.id || parent.id;

    let value = useMemo<IFlipScopeContext>(() => ({ id, nodes: props.disconnect ? undefined : new Set() }), [id, props.disconnect]);

    return createElement(FlipScopeContext.Provider, { value }, props.children);
}

export function useFlipScopeContext() {
    return useContext(FlipScopeContext);
}

const FlipScopeContext = createContext<IFlipScopeContext>({ id: '' });

export interface IFlipScopeContext {
    id: string;
    nodes?: Set<FlipNode>;
}