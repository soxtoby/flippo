import type { IAnimationConfig } from "flippo";
import { createContext, createElement, useContext, useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";

export interface IFlipScopeProps {
    id?: string;
    /** Default enter config applied to Flip elements in scope, but only when FlipScope is first rendered. */
    enter?: Partial<IAnimationConfig> | boolean;
    /** Default update config applied to Flip elements in scope. */
    update?: Partial<IAnimationConfig> | boolean;
    /** Default exit config applied to Flip elements in scope, but only when entire FlipScope is exiting. */
    exit?: Partial<IAnimationConfig> | boolean;
    children: ReactNode;
}

export function FlipScope({ id, enter, update, exit, children }: IFlipScopeProps) {
    let parent = useFlipScopeContext();

    id = parent.id && id
        ? parent.id + ':' + id
        : id || parent.id;

    let value = useMemo<IFlipScopeContext>(() => ({ id: id!, enter, update }), [id]);

    useEffect(() => {
        delete value.enter; // Regular enter config will be used on subsequent renders
    }, [value]);

    useLayoutEffect(() => () => { value.exit = exit }, []); // Only apply the exit config when the scope is unmounted

    return createElement(FlipScopeContext.Provider, { value }, children);
}

export function useFlipScopeContext() {
    return useContext(FlipScopeContext);
}

const FlipScopeContext = createContext<IFlipScopeContext>({ id: '' });

export interface IFlipScopeContext {
    id: string;
    enter?: Partial<IAnimationConfig> | boolean;
    update?: Partial<IAnimationConfig> | boolean;
    exit?: Partial<IAnimationConfig> | boolean;
}