import { FlipNode, IFlipConfig, mount, register, unmount } from "flippo";
import { ReactElement, cloneElement, createContext, createElement, useContext, useId, useLayoutEffect, useRef } from "react";
import { FlipScopeCollection, FlipScopeContext } from "./FlipScope";

export interface IFlipProps extends Partial<IFlipConfig> {
    id?: any;
    children: ReactElement;
}

export function Flip(props: IFlipProps) {
    let { id, children, ...config } = props;

    id ??= useId();

    let parent = useContext(FlipNodeContext);
    let node = register(id, config, parent);

    let scope = useRef<FlipScopeCollection>();
    let newScope = useContext(FlipScopeContext);

    if (newScope != scope.current) {
        scope.current?.nodes.delete(node);
        newScope.nodes.add(node);
        scope.current = newScope;
    }

    let elementRef = useRef<HTMLElement>();

    useLayoutEffect(() => {
        let element = elementRef.current!; // Need to unmount the same element that was mounted
        mount(id, element);
        return () => {
            unmount(id, element);
            scope.current?.nodes.delete(node);
        };
    }, []);

    return createElement(FlipNodeContext.Provider, { value: node }, cloneElement(children, { ref: elementRef }));
}

const FlipNodeContext = createContext(undefined as FlipNode | undefined);