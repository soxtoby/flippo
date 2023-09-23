import { FlipNode, IFlipConfig, mount, register, unmount } from "flippo";
import { ReactElement, cloneElement, createContext, createElement, useContext, useId, useLayoutEffect, useRef } from "react";
import { IFlipScopeContext, useFlipScopeContext } from "./FlipScope";
import { areEquivalent } from "./Utils";

export interface IFlipProps extends Partial<IFlipConfig> {
    id?: string;
    triggerData?: any;
    children: ReactElement;
}

export function Flip(props: IFlipProps) {
    let { id, children, ...config } = props;

    let scope = useFlipScopeContext();

    id ??= useId();
    if (scope.id)
        id = scope.id + ':' + id;

    let parent = useContext(FlipNodeContext);
    let node = register(id, config, parent);

    let oldScope = useRef<IFlipScopeContext>();
    if (scope != oldScope.current) {
        oldScope.current?.nodes?.delete(node);
        scope.nodes?.add(node);
        oldScope.current = scope;
    }

    let triggerData = useRef<unknown>();
    if (props.triggerData === undefined
        || !areEquivalent(triggerData.current, props.triggerData)
    ) {
        if (scope.nodes) {
            for (let sibling of scope.nodes)
                sibling.flip();
        } else {
            node.flip();
        }
        triggerData.current = props.triggerData;
    }

    let elementRef = useRef<HTMLElement>();

    useLayoutEffect(() => {
        let element = elementRef.current!; // Need to unmount the same element that was mounted
        mount(id!, element);
        return () => {
            unmount(id!, element);
            scope.nodes?.delete(node);
        };
    }, [id]);

    return createElement(FlipNodeContext.Provider, { value: node }, cloneElement(children, { ref: elementRef }));
}

const FlipNodeContext = createContext(undefined as FlipNode | undefined);