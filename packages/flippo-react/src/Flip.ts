import { IFlipConfig } from "flippo";
import { cloneElement, ReactElement, useContext, useLayoutEffect, useRef } from "react";
import { FlipContext } from "./FlipScope";

export interface IFlipProps extends IFlipConfig {
    children: ReactElement;
}

export function Flip(props: IFlipProps) {
    let { children, ...config } = props;
    let ref = useFlip(config);
    return cloneElement(children, { ref });
}

export function useFlip(config: IFlipConfig) {
    let ref = useRef<HTMLElement>();
    let flipCollection = useContext(FlipContext);

    useLayoutEffect(() => {
        flipCollection.mount(ref.current!, config);
        let registeredId = config.id; // Make sure to remove the original id, not the current id
        return () => flipCollection.unmount(registeredId, ref.current!);
    }, [config.id]);

    return (e: HTMLElement) => { ref.current = e; };
}
