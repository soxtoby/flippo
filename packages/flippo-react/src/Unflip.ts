import { cloneElement, ReactElement, useRef, useContext, useLayoutEffect } from "react";
import { FlipContext } from "./FlipScope";

export function Unflip(props: { children: ReactElement; }) {
    let ref = useUnflip();
    return cloneElement(props.children, { ref });
}

export function useUnflip() {
    let ref = useRef<HTMLElement>();
    let flipCollection = useContext(FlipContext);

    useLayoutEffect(() => {
        let element = ref.current!;
        flipCollection.addUndoElement(element);
        return () => flipCollection.removeUndoElement(element);
    });

    return (e: HTMLElement) => { ref.current = e; };
}