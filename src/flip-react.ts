import { cloneElement, createContext, createElement, ReactElement, ReactNode, useContext, useLayoutEffect, useRef } from "react";
import { FlipCollection, IFlipConfig } from "./flip-collection";

const FlipContext = createContext(null as any as FlipCollection);

export interface IFlipScopeProps {
    triggerData: any;
    children: ReactNode;
}

export function FlipScope(props: IFlipScopeProps) {
    let flipCollection = useRef<FlipCollection>();
    flipCollection.current = flipCollection.current || new FlipCollection();

    let doFlip = flipCollection.current.triggerData != props.triggerData;

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

export interface IFlippedProps extends IFlipConfig {
    children: ReactElement
}

export function Flipped(props: IFlippedProps) {
    let { children, ...config } = props;
    let ref = useFlip(config);
    return cloneElement(children, { ref });
}

export function useFlip(config: IFlipConfig) {
    let ref = useRef<HTMLElement>(null);
    let flipCollection = useContext(FlipContext);

    useLayoutEffect(() => {
        flipCollection.addElement(ref.current!, config);
        let registeredId = config.id; // Make sure to remove the original id, not the current id
        return () => flipCollection.removeElement(registeredId);
    });

    return ref;
}