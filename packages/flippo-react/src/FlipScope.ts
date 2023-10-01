import type { IAnimationConfig, IFlipAnimationOverrides } from "flippo";
import { createContext, createElement, useContext, useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";

export interface IFlipScopeProps {
    id?: string;
    /** Enter config applied to Flip elements in scope when FlipScope is entering. */
    enter?: Partial<IAnimationConfig> | boolean;
    /** Exit config applied to Flip elements in scope when FlipScope is exiting. */
    exit?: Partial<IAnimationConfig> | boolean;
    /**
     * Config applied to Flip elements in scope. 
     * Will be shallow-merged in nested scopes.
    */
    config?: IFlipAnimationOverrides;
    children: ReactNode;
}

export function FlipScope({ id, enter, exit, config, children }: IFlipScopeProps) {
    let parent = useFlipScopeContext();

    id = parent.id && id
        ? parent.id + ':' + id
        : id || parent.id;

    let value = useMemo<IFlipScopeContext>(() => ({ id: id!, enter, config: { ...parent.config, ...config } } satisfies IFlipScopeContext), [id]);

    useEffect(() => {
        delete value.enter; // Regular enter config will be used on subsequent renders
    }, [value]);

    useLayoutEffect(() => () => { value.exit = exit }, []); // Only apply the exit config when the scope is unmounted

    return createElement(FlipScopeContext.Provider, { value }, children);
}

export function useFlipScopeContext() {
    return useContext(FlipScopeContext);
}

const FlipScopeContext = createContext<IFlipScopeContext>({ id: '', config: {} });

export interface IFlipScopeContext {
    id: string;
    enter?: Partial<IAnimationConfig> | boolean;
    exit?: Partial<IAnimationConfig> | boolean;
    config: IFlipAnimationOverrides;
}