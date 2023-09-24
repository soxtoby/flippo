import { FlipNode } from "flippo";
import { createContext, createElement, DependencyList, ReactNode, useContext, useMemo } from "react";

export interface IFlipScopeProps {
    id?: string;
    /** If specified, will flip everything in scope when deps change. */
    deps?: DependencyList;
    children: ReactNode;
}

export function FlipScope({ id, deps, children }: IFlipScopeProps) {
    let parent = useFlipScopeContext();

    id = parent.id && id
        ? parent.id + ':' + id
        : id || parent.id;

    let value = useMemo<IFlipScopeContext>(() => ({ id: id!, nodes: new Set() }), [id]);

    useMemo(() => {
        for (let child of value.nodes)
            child.flip();
    }, deps ?? []); // If deps aren't specified, don't flip on re-render

    return createElement(FlipScopeContext.Provider, { value }, children);
}

export function useFlipScopeContext() {
    return useContext(FlipScopeContext);
}

const FlipScopeContext = createContext<IFlipScopeContext>({ id: '', nodes: new Set() });

export interface IFlipScopeContext {
    id: string;
    nodes: Set<FlipNode>;
}