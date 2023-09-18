import { FlipCollection } from "flippo";
import { createContext, createElement, ReactNode, useContext, useLayoutEffect, useRef } from "react";

export const FlipContext = createContext(null as any as FlipCollection);

export interface IFlipScopeProps {
    triggerData: any;
    children: ReactNode;
}

export function FlipScope(props: IFlipScopeProps) {
    let outerContext = useContext(FlipContext);

    let flipCollection = useRef<FlipCollection>();
    flipCollection.current = flipCollection.current || new FlipCollection(outerContext);

    let doFlip = flipCollection.current.shouldFlip(props.triggerData);

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
