import { FlipNode, IAnimationConfig } from "flippo";
import { createContext, createElement, DependencyList, ReactNode, useContext, useEffect, useLayoutEffect, useMemo } from "react";

export interface IFlipScopeProps {
    id?: string;
    /** Default enter config applied to Flip elements in scope, but only when FlipScope is first rendered. */
    enter?: Partial<IAnimationConfig> | boolean;
    /** Default update config applied to Flip elements in scope. */
    update?: Partial<IAnimationConfig> | boolean;
    /** Default exit config applied to Flip elements in scope, but only when entire FlipScope is exiting. */
    exit?: Partial<IAnimationConfig> | boolean;
    /** If specified, will flip everything in scope when deps change. */
    deps?: DependencyList;
    children: ReactNode;
}

export function FlipScope({ id, enter, update, exit, deps, children }: IFlipScopeProps) {
    let parent = useFlipScopeContext();

    id = parent.id && id
        ? parent.id + ':' + id
        : id || parent.id;

    let value = useMemo<IFlipScopeContext>(() => ({ id: id!, nodes: new Set(), enter, update }), [id]);

    useMemo(() => {
        for (let child of value.nodes)
            child.flip();
    }, deps ?? []); // If deps aren't specified, don't flip on re-render

    useEffect(() => {
        delete value.enter; // Regular enter config will be used on subsequent renders
    }, [value]);

    useLayoutEffect(() => () => { value.exit = exit }, []); // Only apply the exit config when the scope is unmounted

    return createElement(FlipScopeContext.Provider, { value }, children);
}

export function useFlipScopeContext() {
    return useContext(FlipScopeContext);
}

const FlipScopeContext = createContext<IFlipScopeContext>({ id: '', nodes: new Set() });

export interface IFlipScopeContext {
    id: string;
    nodes: Set<FlipNode>;
    enter?: Partial<IAnimationConfig> | boolean;
    update?: Partial<IAnimationConfig> | boolean;
    exit?: Partial<IAnimationConfig> | boolean;
}