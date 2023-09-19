import { IFlipConfig } from "flippo";
import { cloneElement, ReactElement, useContext, useId, useLayoutEffect, useRef } from "react";
import { FlipContext } from "./FlipScope";

export interface IFlipProps extends Partial<IFlipConfig> {
    id?: any;
    children: ReactElement;
}

export function Flip(props: IFlipProps) {
    let { id, children, ...config } = props;
    let ref = useFlip(config, id);
    return cloneElement(children, { ref });
}

export function useFlip(config: Partial<IFlipConfig>, id?: any) {
    let ref = useRef<HTMLElement>();
    let flipCollection = useContext(FlipContext);

    id ??= useId();

    useLayoutEffect(() => {
        let element = ref.current!;
        flipCollection.mount(id, element, config);
        return () => flipCollection.unmount(id, element);
    }, [id]);

    return (e: HTMLElement) => { ref.current = e; };
}
