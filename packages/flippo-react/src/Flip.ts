import { FlipNode, IFlipConfig, mount, register, unmount } from "flippo";
import { ContextType, ReactElement, cloneElement, createContext, createElement, useContext, useId, useLayoutEffect, useRef } from "react";
import { FlipScopeContext } from "./FlipScope";
import { areEquivalent } from "./Utils";

export interface IFlipProps extends Partial<IFlipConfig> {
    id?: any;
    triggerData?: any;
    children: ReactElement;
}

export function Flip(props: IFlipProps) {
    let { id, children, ...config } = props;

    id ??= useId();

    let parent = useContext(FlipNodeContext);
    let node = register(id, config, parent);

    let scope = useRef<ContextType<typeof FlipScopeContext>>();
    let newScope = useContext(FlipScopeContext);

    if (newScope != scope.current) {
        scope.current?.delete(node);
        newScope?.add(node);
        scope.current = newScope;
    }

    let triggerData = useRef<unknown>();
    if (props.triggerData === undefined
        || !areEquivalent(triggerData.current, props.triggerData)
    ) {
        if (scope.current) {
            for (let sibling of scope.current)
                sibling.flip();
        } else {
            node.flip();
        }
        triggerData.current = props.triggerData;
    }

    let elementRef = useRef<HTMLElement>();

    useLayoutEffect(() => {
        let element = elementRef.current!; // Need to unmount the same element that was mounted
        mount(id, element);
        return () => {
            unmount(id, element);
            scope.current?.delete(node);
        };
    }, []);

    return createElement(FlipNodeContext.Provider, { value: node }, cloneElement(children, { ref: elementRef }));
}

const FlipNodeContext = createContext(undefined as FlipNode | undefined);